import { LockMode } from '@mikro-orm/core';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    JAR_CAPABILITIES,
    JarKey,
    Locale,
    OPTIONAL_JAR_KEYS,
    OPTIONAL_JAR_SHARE,
    type OptionalJarKey,
} from '@rumtelo/contracts';

import { householdStorage } from '../../../../../../common/household/household.context';
import { SortRule } from '../../ledger/sort-rule/sort-rule.entity';
import { Transaction } from '../../ledger/transaction/transaction.entity';
import { Goal } from '../../targets/goal/goal.entity';
import { WeekCheckAllocation } from '../../week-check/week-check-allocation.entity';
import { FixedCost } from '../fixed-cost/fixed-cost.entity';
import type { Jar } from './jar.entity';
import { JAR_SHARE_BASELINE_PERIOD, JarShare } from './jar-share.entity';
import { JarService } from './jar.service';

/** "This month" for every write in this spec. */
const NOW = '2026-11';

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-23T10:00:00Z'));
});
afterEach(() => vi.useRealTimers());

const HOUSEHOLD = 'household-1';
const OTHER_HOUSEHOLD = 'household-2';
const SEAT = 'seat-main';

type JarRow = {
    id: string;
    household: string;
    key: JarKey;
    name: string;
    subtitle: string | null;
    icon: string | null;
    percentage: string;
    capabilities: unknown;
    sortOrder: number;
    defaultAccount: string | null;
};

/** The three-pot default board: 55 / 20 / 25, all on one bank seat. */
const DEFAULT_BOARD: Array<[JarKey, string]> = [
    [JarKey.NECESSITIES, '55.00'],
    [JarKey.LONG_TERM_SAVINGS, '20.00'],
    [JarKey.PLAY, '25.00'],
];

function buildRows(household: string, board: Array<[JarKey, string]>): JarRow[] {
    return board.map(([key, percentage], index) => ({
        id: `${household}-${key}`,
        household,
        key,
        name: key,
        subtitle: null,
        icon: null,
        percentage,
        capabilities: JAR_CAPABILITIES[key],
        sortOrder: index,
        defaultAccount: SEAT,
    }));
}

/** Catalog rows as the seed makes them: each optional pot's share is `OPTIONAL_JAR_SHARE`. */
function templateFor(key: OptionalJarKey, overrides: { percentage?: string } = {}) {
    return {
        key,
        name: `${key} pot`,
        subtitle: `${key} subtitle`,
        icon: '*',
        percentage: overrides.percentage ?? OPTIONAL_JAR_SHARE[key].toFixed(2),
        sortOrder: 10 + OPTIONAL_JAR_KEYS.indexOf(key),
        capabilities: JAR_CAPABILITIES[key],
    };
}

type ShareRow = { household: string; jar: { id: string }; period: string; percentage: string };

/** The baseline row the migration wrote for every pot that existed when the table was made. */
function baselineRows(jars: JarRow[]): ShareRow[] {
    return jars.map(jar => ({
        household: jar.household,
        jar: { id: jar.id },
        period: JAR_SHARE_BASELINE_PERIOD,
        percentage: jar.percentage,
    }));
}

type Referenced = 'Transaction' | 'FixedCost' | 'Goal' | 'SortRule' | 'WeekCheckAllocation';

/**
 * Fake EntityManager. `find`/`findOne`/`count` honour the `household` the scoped repository
 * injects, exactly like Postgres would, so a foreign household's rows are invisible.
 * `transactional` rolls back percentages and created/removed rows when the callback throws.
 */
function buildService(
    options: {
        board?: Array<[JarKey, string]>;
        templates?: ReturnType<typeof templateFor>[];
        /** Households' rows that reference a jar id, by relation. */
        referencing?: Partial<Record<Referenced, string[]>>;
        /**
         * Rows in ANOTHER pot that use a category of the pot with this id (by relation);
         * only transactions, fixed costs and sort rules carry a category.
         */
        categoryReferencing?: Partial<Record<'Transaction' | 'FixedCost' | 'SortRule', string[]>>;
        commitError?: Error;
        /** Share history of the household; defaults to one baseline row per pot. */
        shares?: ShareRow[];
    } = {}
) {
    const householdRowsSeed = buildRows(HOUSEHOLD, options.board ?? DEFAULT_BOARD);
    const rows = [...householdRowsSeed, ...buildRows(OTHER_HOUSEHOLD, DEFAULT_BOARD)];
    const shares: ShareRow[] = [
        ...(options.shares ?? baselineRows(householdRowsSeed)),
        ...baselineRows(buildRows(OTHER_HOUSEHOLD, DEFAULT_BOARD)),
    ];
    const templates = options.templates ?? OPTIONAL_JAR_KEYS.map(key => templateFor(key));
    const lockedWith: Array<unknown> = [];
    /** Every jar `find`, with the options it asked for (lock mode, order). */
    const jarFinds: Array<{
        where: unknown;
        options?: { lockMode?: LockMode; orderBy?: unknown };
    }> = [];
    const referenceCounted: string[] = [];

    const matches = (
        row: JarRow,
        where: { household: string; key?: unknown; id?: string }
    ): boolean => {
        if (row.household !== where.household) return false;
        if (where.id !== undefined && row.id !== where.id) return false;
        if (where.key !== undefined) {
            const wanted = where.key as JarKey | { $in: JarKey[] };
            const keys = typeof wanted === 'string' ? [wanted] : wanted.$in;
            if (!keys.includes(row.key)) return false;
        }
        return true;
    };

    const referenceName = (entity: unknown): Referenced | null => {
        if (entity === Transaction) return 'Transaction';
        if (entity === FixedCost) return 'FixedCost';
        if (entity === Goal) return 'Goal';
        if (entity === SortRule) return 'SortRule';
        if (entity === WeekCheckAllocation) return 'WeekCheckAllocation';
        return null;
    };

    const em = {
        find: vi.fn<
            (
                entity: unknown,
                where: { household: string; key?: unknown; id?: string },
                findOptions?: { lockMode?: LockMode; orderBy?: unknown }
            ) => Promise<JarRow[]>
        >(async (entity, where, findOptions) => {
            // Share rows are a second table: not a jar read, never locked.
            if (entity === JarShare) {
                return shares.filter(row => row.household === where.household) as never;
            }
            jarFinds.push({ where, options: findOptions });
            if (findOptions?.lockMode) lockedWith.push(findOptions.lockMode);
            return rows.filter(row => matches(row, where));
        }),
        findOne: vi.fn<
            (entity: unknown, where: { household: string; id?: string }) => Promise<JarRow | null>
        >(async (_entity, where) => rows.find(row => matches(row, where)) ?? null),
        count: vi.fn<
            (
                entity: unknown,
                where: {
                    household: string;
                    jar?: string;
                    $or?: Array<{ jar?: string; category?: { jar: string } }>;
                }
            ) => Promise<number>
        >(async (entity, where) => {
            const name = referenceName(entity);
            if (!name) return 0;
            referenceCounted.push(name);
            if (where.household !== HOUSEHOLD) return 0;
            // A plain `{ jar }` filter, or `$or` of the pot itself and its categories.
            const clauses = where.$or ?? [{ jar: where.jar }];
            let count = 0;
            for (const clause of clauses) {
                if (clause.jar !== undefined) {
                    count += (options.referencing?.[name] ?? []).filter(
                        id => id === clause.jar
                    ).length;
                }
                if (clause.category) {
                    const byCategory = options.categoryReferencing as
                        | Partial<Record<string, string[]>>
                        | undefined;
                    count += (byCategory?.[name] ?? []).filter(
                        id => id === clause.category!.jar
                    ).length;
                }
            }
            return count;
        }),
        create: vi.fn<(entity: unknown, data: JarRow) => JarRow>((entity, data) =>
            entity === JarShare ? { ...data } : { ...data, id: `${data.household}-new-${data.key}` }
        ),
        persist: vi.fn<(row: JarRow | ShareRow) => void>(row => {
            if ('period' in row) shares.push(row);
            else rows.push(row);
        }),
        remove: vi.fn<(row: JarRow | ShareRow) => void>(row => {
            const list = 'period' in row ? shares : rows;
            (list as unknown[]).splice(list.indexOf(row as never), 1);
        }),
        transactional: undefined as unknown as <T>(cb: (tx: unknown) => Promise<T>) => Promise<T>,
    };
    em.transactional = async cb => {
        const snapshot = rows.map(row => ({ row, percentage: row.percentage }));
        const shareSnapshot = shares.map(row => ({ row, percentage: row.percentage }));
        const before = [...rows];
        const sharesBefore = [...shares];
        try {
            const result = await cb(em);
            if (options.commitError) throw options.commitError;
            return result;
        } catch (error) {
            rows.splice(0, rows.length, ...before);
            for (const entry of snapshot) entry.row.percentage = entry.percentage;
            shares.splice(0, shares.length, ...sharesBefore);
            for (const entry of shareSnapshot) entry.row.percentage = entry.percentage;
            throw error;
        }
    };

    const service = new JarService(
        em as never,
        {} as never,
        { get: async () => ({ locale: Locale.EN }) } as never,
        {
            findActive: async (key: JarKey) =>
                templates.find(template => template.key === key) ?? null,
        } as never
    );
    return { service, rows, shares, em, lockedWith, jarFinds, referenceCounted };
}

function inHousehold<T>(run: () => Promise<T>): Promise<T> {
    return householdStorage.run(
        {
            userId: 'user-1',
            householdId: HOUSEHOLD,
            role: 'OWNER',
            source: 'SEAT' as never,
            relation: null,
        },
        run
    );
}

const householdRows = (rows: JarRow[], household = HOUSEHOLD) =>
    rows.filter(row => row.household === household);

const percentageOf = (rows: JarRow[], key: JarKey, household = HOUSEHOLD) =>
    householdRows(rows, household).find(row => row.key === key)?.percentage;

/** Household total in basis points — must stay exactly 10 000. */
const totalBasisPoints = (rows: JarRow[], household = HOUSEHOLD) =>
    householdRows(rows, household).reduce(
        (total, row) => total + Math.round(Number(row.percentage) * 100),
        0
    );

const asJar = (row: JarRow) => row as unknown as Jar;

describe('JarService.activate', () => {
    it.each([
        [JarKey.DAILY, JarKey.NECESSITIES, '35.00', '20.00'],
        [JarKey.GOALS, JarKey.LONG_TERM_SAVINGS, '14.00', '6.00'],
        [JarKey.FINANCIAL_FREEDOM, JarKey.LONG_TERM_SAVINGS, '15.00', '5.00'],
        [JarKey.EDUCATION, JarKey.LONG_TERM_SAVINGS, '15.00', '5.00'],
        [JarKey.GIVE, JarKey.PLAY, '20.00', '5.00'],
    ] as const)(
        'turns on %s out of its group main pot (%s) and keeps the total at 100',
        async (key, mainKey, mainAfter, shareAfter) => {
            const { service, rows } = buildService();

            const jar = await inHousehold(() => service.activate(key));

            expect(percentageOf(rows, mainKey)).toBe(mainAfter);
            expect(percentageOf(rows, key)).toBe(shareAfter);
            expect(totalBasisPoints(rows)).toBe(10_000);
            expect(jar).toMatchObject({
                key,
                householdId: HOUSEHOLD,
                percentage: Number(shareAfter),
            });
        }
    );

    it('copies name, subtitle, icon, capabilities and sort order from the template and the seat from the main pot', async () => {
        const { service, rows } = buildService();
        rows.find(row => row.id === `${HOUSEHOLD}-${JarKey.NECESSITIES}`)!.defaultAccount =
            'seat-other';

        const dto = await inHousehold(() => service.activate(JarKey.DAILY));

        const created = householdRows(rows).find(row => row.key === JarKey.DAILY)!;
        expect(created).toMatchObject({
            name: `${JarKey.DAILY} pot`,
            subtitle: `${JarKey.DAILY} subtitle`,
            icon: '*',
            capabilities: JAR_CAPABILITIES[JarKey.DAILY],
            sortOrder: 10,
            defaultAccount: 'seat-other',
        });
        expect(dto).toMatchObject({
            id: created.id,
            name: `${JarKey.DAILY} pot`,
            sortOrder: 10,
            defaultAccountId: 'seat-other',
        });
    });

    it('lets a second optional pot in the same group come out of what is left of the main pot', async () => {
        const { service, rows } = buildService();

        await inHousehold(() => service.activate(JarKey.GOALS));
        await inHousehold(() => service.activate(JarKey.FINANCIAL_FREEDOM));

        expect(percentageOf(rows, JarKey.LONG_TERM_SAVINGS)).toBe('9.00');
        expect(totalBasisPoints(rows)).toBe(10_000);
    });

    it('takes a row lock on the main pot so two activations in a group cannot undo each other', async () => {
        const { service, lockedWith } = buildService();

        await inHousehold(() => service.activate(JarKey.GIVE));

        expect(lockedWith).toEqual([LockMode.PESSIMISTIC_WRITE]);
    });

    it('does not touch another household', async () => {
        const { service, rows } = buildService();

        await inHousehold(() => service.activate(JarKey.DAILY));

        expect(totalBasisPoints(rows, OTHER_HOUSEHOLD)).toBe(10_000);
        expect(percentageOf(rows, JarKey.NECESSITIES, OTHER_HOUSEHOLD)).toBe('55.00');
        expect(householdRows(rows, OTHER_HOUSEHOLD)).toHaveLength(3);
    });

    it('refuses a pot that is already on with jar_already_active and changes nothing', async () => {
        const { service, rows } = buildService();
        await inHousehold(() => service.activate(JarKey.GOALS));

        await expect(inHousehold(() => service.activate(JarKey.GOALS))).rejects.toMatchObject({
            response: expect.objectContaining({ message: 'jar_already_active' }),
        });
        expect(percentageOf(rows, JarKey.LONG_TERM_SAVINGS)).toBe('14.00');
        expect(householdRows(rows)).toHaveLength(4);
    });

    it('answers a racing double activation (unique household + key) as jar_already_active, not a 500', async () => {
        const { service, rows } = buildService({
            commitError: Object.assign(
                new Error(
                    'duplicate key value violates unique constraint "money_jar_household_id_key_unique"'
                ),
                { code: '23505' }
            ),
        });

        await expect(inHousehold(() => service.activate(JarKey.GIVE))).rejects.toMatchObject({
            response: expect.objectContaining({ message: 'jar_already_active' }),
        });
        expect(percentageOf(rows, JarKey.PLAY)).toBe('25.00');
    });

    it('refuses a main pot with jar_not_optional', async () => {
        const { service, rows } = buildService();

        await expect(
            inHousehold(() => service.activate(JarKey.PLAY as never))
        ).rejects.toMatchObject({
            response: expect.objectContaining({ message: 'jar_not_optional' }),
        });
        expect(householdRows(rows)).toHaveLength(3);
    });

    it.each([
        ['at the share', '6.00'],
        ['below the share', '5.99'],
    ])(
        'refuses with jar_share_too_small when the main pot is %s',
        async (_label, mainPercentage) => {
            const { service, rows } = buildService({
                board: [
                    [JarKey.NECESSITIES, (94 - Number(mainPercentage)).toFixed(2)],
                    [JarKey.LONG_TERM_SAVINGS, mainPercentage],
                    [JarKey.PLAY, '6.00'],
                ],
            });

            await expect(inHousehold(() => service.activate(JarKey.GOALS))).rejects.toMatchObject({
                response: expect.objectContaining({ message: 'jar_share_too_small' }),
            });
            expect(percentageOf(rows, JarKey.LONG_TERM_SAVINGS)).toBe(mainPercentage);
            expect(householdRows(rows)).toHaveLength(3);
        }
    );

    it('allows the main pot to be left with a single hundredth', async () => {
        const { service, rows } = buildService({
            board: [
                [JarKey.NECESSITIES, '55.00'],
                [JarKey.LONG_TERM_SAVINGS, '6.01'],
                [JarKey.PLAY, '38.99'],
            ],
        });

        await inHousehold(() => service.activate(JarKey.GOALS));

        expect(percentageOf(rows, JarKey.LONG_TERM_SAVINGS)).toBe('0.01');
        expect(totalBasisPoints(rows)).toBe(10_000);
    });

    it('has no float drift on a two-decimal share', async () => {
        const { service, rows } = buildService({
            templates: [templateFor(JarKey.GOALS, { percentage: '0.10' })],
            board: [
                [JarKey.NECESSITIES, '55.00'],
                [JarKey.LONG_TERM_SAVINGS, '20.20'],
                [JarKey.PLAY, '24.80'],
            ],
        });

        await inHousehold(() => service.activate(JarKey.GOALS));

        expect(percentageOf(rows, JarKey.LONG_TERM_SAVINGS)).toBe('20.10');
        expect(percentageOf(rows, JarKey.GOALS)).toBe('0.10');
        expect(totalBasisPoints(rows)).toBe(10_000);
    });

    it('fails with one setup error, carrying only the key, when the template is missing or has no share', async () => {
        const missing = buildService({ templates: [] });
        const noShare = buildService({
            templates: [templateFor(JarKey.GIVE, { percentage: '0.00' })],
        });

        for (const { service } of [missing, noShare]) {
            await expect(inHousehold(() => service.activate(JarKey.GIVE))).rejects.toMatchObject({
                constructor: InternalServerErrorException,
                message: `Jar template for ${JarKey.GIVE} is not set up`,
            });
        }
        expect(householdRows(missing.rows)).toHaveLength(3);
    });

    it('locks the full household set in id order, then validates against those rows', async () => {
        const { service, jarFinds } = buildService();

        await inHousehold(() => service.activate(JarKey.DAILY));

        expect(jarFinds).toHaveLength(1);
        expect(jarFinds[0]!.where).toEqual({ household: HOUSEHOLD });
        expect(jarFinds[0]!.options).toMatchObject({
            orderBy: { id: 'ASC' },
            lockMode: LockMode.PESSIMISTIC_WRITE,
        });
    });

    it('refuses a household whose stored total is not 100 instead of spreading the error', async () => {
        const { service, rows } = buildService({
            board: [
                [JarKey.NECESSITIES, '55.00'],
                [JarKey.LONG_TERM_SAVINGS, '20.00'],
                [JarKey.PLAY, '24.00'],
            ],
        });

        await expect(inHousehold(() => service.activate(JarKey.GIVE))).rejects.toMatchObject({
            response: expect.objectContaining({ message: 'jar_split_total' }),
        });
        expect(percentageOf(rows, JarKey.PLAY)).toBe('24.00');
    });
});

describe('JarService.deactivate', () => {
    const SIX_POT_BOARD: Array<[JarKey, string]> = [
        [JarKey.NECESSITIES, '35.00'],
        [JarKey.DAILY, '20.00'],
        [JarKey.LONG_TERM_SAVINGS, '15.00'],
        [JarKey.FINANCIAL_FREEDOM, '5.00'],
        [JarKey.PLAY, '20.00'],
        [JarKey.GIVE, '5.00'],
    ];

    it.each([
        [JarKey.DAILY, JarKey.NECESSITIES, '55.00'],
        [JarKey.FINANCIAL_FREEDOM, JarKey.LONG_TERM_SAVINGS, '20.00'],
        [JarKey.GIVE, JarKey.PLAY, '25.00'],
    ] as const)(
        'turns off %s: its share returns to %s and the total stays 100',
        async (key, mainKey, mainAfter) => {
            const { service, rows } = buildService({ board: SIX_POT_BOARD });

            await inHousehold(() => service.deactivate(`${HOUSEHOLD}-${key}`));

            expect(householdRows(rows).some(row => row.key === key)).toBe(false);
            expect(percentageOf(rows, mainKey)).toBe(mainAfter);
            expect(totalBasisPoints(rows)).toBe(10_000);
        }
    );

    it('does not touch another household', async () => {
        const { service, rows } = buildService({ board: SIX_POT_BOARD });

        await inHousehold(() => service.deactivate(`${HOUSEHOLD}-${JarKey.DAILY}`));

        expect(householdRows(rows, OTHER_HOUSEHOLD)).toHaveLength(3);
        expect(totalBasisPoints(rows, OTHER_HOUSEHOLD)).toBe(10_000);
    });

    it('locks the full household set in id order, the same lock as activate and updateSplit', async () => {
        const { service, lockedWith, jarFinds } = buildService({ board: SIX_POT_BOARD });

        await inHousehold(() => service.deactivate(`${HOUSEHOLD}-${JarKey.DAILY}`));

        expect(lockedWith).toEqual([LockMode.PESSIMISTIC_WRITE]);
        const locking = jarFinds.filter(call => call.options?.lockMode);
        expect(locking).toHaveLength(1);
        expect(locking[0]!.where).toEqual({ household: HOUSEHOLD });
        expect(locking[0]!.options).toMatchObject({ orderBy: { id: 'ASC' } });
    });

    it.each([JarKey.NECESSITIES, JarKey.LONG_TERM_SAVINGS, JarKey.PLAY] as const)(
        'refuses the main pot %s with jar_not_optional',
        async key => {
            const { service, rows } = buildService({ board: SIX_POT_BOARD });

            await expect(
                inHousehold(() => service.deactivate(`${HOUSEHOLD}-${key}`))
            ).rejects.toMatchObject({
                response: expect.objectContaining({ message: 'jar_not_optional' }),
            });
            expect(householdRows(rows)).toHaveLength(6);
        }
    );

    it.each<Referenced>(['Transaction', 'FixedCost', 'Goal', 'SortRule', 'WeekCheckAllocation'])(
        'refuses with jar_not_empty while a %s still points at the pot, and changes nothing',
        async relation => {
            const jarId = `${HOUSEHOLD}-${JarKey.DAILY}`;
            const { service, rows } = buildService({
                board: SIX_POT_BOARD,
                referencing: { [relation]: [jarId] },
            });

            await expect(inHousehold(() => service.deactivate(jarId))).rejects.toMatchObject({
                response: expect.objectContaining({ message: 'jar_not_empty' }),
            });
            expect(householdRows(rows)).toHaveLength(6);
            expect(percentageOf(rows, JarKey.NECESSITIES)).toBe('35.00');
            expect(percentageOf(rows, JarKey.DAILY)).toBe('20.00');
        }
    );

    it.each<'Transaction' | 'FixedCost' | 'SortRule'>(['Transaction', 'FixedCost', 'SortRule'])(
        'refuses with jar_not_empty while a %s in another pot uses a category of this pot',
        async relation => {
            const jarId = `${HOUSEHOLD}-${JarKey.DAILY}`;
            const { service, rows } = buildService({
                board: SIX_POT_BOARD,
                categoryReferencing: { [relation]: [jarId] },
            });

            await expect(inHousehold(() => service.deactivate(jarId))).rejects.toMatchObject({
                response: expect.objectContaining({ message: 'jar_not_empty' }),
            });
            expect(householdRows(rows)).toHaveLength(6);
            expect(percentageOf(rows, JarKey.NECESSITIES)).toBe('35.00');
        }
    );

    it('checks all five relations and lets categories alone go with the pot', async () => {
        const { service, rows, referenceCounted } = buildService({ board: SIX_POT_BOARD });

        await inHousehold(() => service.deactivate(`${HOUSEHOLD}-${JarKey.DAILY}`));

        expect([...referenceCounted].sort()).toEqual([
            'FixedCost',
            'Goal',
            'SortRule',
            'Transaction',
            'WeekCheckAllocation',
        ]);
        expect(householdRows(rows).some(row => row.key === JarKey.DAILY)).toBe(false);
    });

    it('does not see a pot of another household', async () => {
        const { service, rows } = buildService({ board: SIX_POT_BOARD });

        await expect(
            inHousehold(() => service.deactivate(`${OTHER_HOUSEHOLD}-${JarKey.NECESSITIES}`))
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(householdRows(rows, OTHER_HOUSEHOLD)).toHaveLength(3);
        expect(totalBasisPoints(rows, OTHER_HOUSEHOLD)).toBe(10_000);
    });

    it('fails with not-found for an unknown pot id', async () => {
        const { service } = buildService({ board: SIX_POT_BOARD });

        await expect(inHousehold(() => service.deactivate('nope'))).rejects.toBeInstanceOf(
            NotFoundException
        );
    });

    it('round-trips: activate then deactivate returns the exact original split', async () => {
        const { service, rows } = buildService();

        const dto = await inHousehold(() => service.activate(JarKey.EDUCATION));
        await inHousehold(() => service.deactivate(dto.id));

        expect(householdRows(rows).map(row => [row.key, row.percentage])).toEqual(DEFAULT_BOARD);
        expect(asJar(householdRows(rows)[0]!).key).toBe(JarKey.NECESSITIES);
    });
});

/**
 * Share history (SP3-H): turning a pot on or off writes this month's rows and carries the
 * past, so no earlier month is re-priced. After every change each pot's row for the current
 * month equals its `percentage`.
 */
describe('share history on activate / deactivate', () => {
    const SIX_POT_BOARD: Array<[JarKey, string]> = [
        [JarKey.NECESSITIES, '35.00'],
        [JarKey.DAILY, '20.00'],
        [JarKey.LONG_TERM_SAVINGS, '15.00'],
        [JarKey.FINANCIAL_FREEDOM, '5.00'],
        [JarKey.PLAY, '20.00'],
        [JarKey.GIVE, '5.00'],
    ];

    const historyOf = (shares: ShareRow[], key: JarKey, household = HOUSEHOLD) =>
        shares
            // A pot turned on in the test is minted as `<household>-new-<key>` by the fake.
            .filter(
                row =>
                    row.household === household &&
                    [`${household}-${key}`, `${household}-new-${key}`].includes(row.jar.id)
            )
            .map(row => [row.period, row.percentage])
            .sort(([left], [right]) => left!.localeCompare(right!));

    /** Every pot's row for the current month equals its percentage (or the history reads the same). */
    const currentRowsMatch = (rows: JarRow[], shares: ShareRow[]) =>
        householdRows(rows).every(jar => {
            const own = shares
                .filter(row => row.jar.id === jar.id && row.period <= NOW)
                .sort((left, right) => left.period.localeCompare(right.period));
            return own.at(-1)?.percentage === jar.percentage;
        });

    it('turns a pot on: it starts this month, the main pot keeps its past and steps down from now', async () => {
        const { service, rows, shares } = buildService();

        await inHousehold(() => service.activate(JarKey.DAILY));

        expect(historyOf(shares, JarKey.DAILY)).toEqual([[NOW, '20.00']]);
        expect(historyOf(shares, JarKey.NECESSITIES)).toEqual([
            [JAR_SHARE_BASELINE_PERIOD, '55.00'],
            [NOW, '35.00'],
        ]);
        expect(currentRowsMatch(rows, shares)).toBe(true);
    });

    it('writes the baseline first when the main pot has no share rows at all', async () => {
        const { service, shares } = buildService({ shares: [] });

        await inHousehold(() => service.activate(JarKey.DAILY));

        expect(historyOf(shares, JarKey.NECESSITIES)).toEqual([
            [JAR_SHARE_BASELINE_PERIOD, '55.00'],
            [NOW, '35.00'],
        ]);
    });

    it('turning a pot on in a month it already has a row (same month change) overwrites that month only', async () => {
        const { service, shares } = buildService();

        const dto = await inHousehold(() => service.activate(JarKey.GOALS));
        await inHousehold(() => service.deactivate(dto.id));
        await inHousehold(() => service.activate(JarKey.GOALS));

        expect(historyOf(shares, JarKey.GOALS)).toEqual([[NOW, '6.00']]);
        expect(historyOf(shares, JarKey.LONG_TERM_SAVINGS)).toEqual([
            [JAR_SHARE_BASELINE_PERIOD, '20.00'],
            [NOW, '14.00'],
        ]);
    });

    it('leaves the history untouched when the activation is refused or rolled back', async () => {
        const { service, shares } = buildService({
            commitError: Object.assign(new Error('duplicate key'), { code: '23505' }),
        });
        const before = shares.map(row => ({ ...row }));

        await expect(inHousehold(() => service.activate(JarKey.GIVE))).rejects.toBeTruthy();

        expect(shares).toEqual(before);
    });

    it('turns a pot off: its history is added onto the main pot, period by period, then its rows go', async () => {
        // Daily was turned on in September (20 % out of Basics), so before that Basics held 55.
        const jarId = (key: JarKey) => ({ id: `${HOUSEHOLD}-${key}` });
        const shareRow = (key: JarKey, period: string, percentage: string): ShareRow => ({
            household: HOUSEHOLD,
            jar: jarId(key),
            period,
            percentage,
        });
        const { service, rows, shares } = buildService({
            board: SIX_POT_BOARD,
            shares: [
                shareRow(JarKey.NECESSITIES, JAR_SHARE_BASELINE_PERIOD, '55.00'),
                shareRow(JarKey.NECESSITIES, '2026-09', '35.00'),
                shareRow(JarKey.DAILY, '2026-09', '15.00'),
                shareRow(JarKey.DAILY, '2026-10', '20.00'),
                ...[
                    JarKey.LONG_TERM_SAVINGS,
                    JarKey.FINANCIAL_FREEDOM,
                    JarKey.PLAY,
                    JarKey.GIVE,
                ].map(key =>
                    shareRow(
                        key,
                        JAR_SHARE_BASELINE_PERIOD,
                        SIX_POT_BOARD.find(([boardKey]) => boardKey === key)![1]
                    )
                ),
            ],
        });

        await inHousehold(() => service.deactivate(`${HOUSEHOLD}-${JarKey.DAILY}`));

        // 2026-09: 35 + 15 = 50 (Daily was 15 then); 2026-10: 35 + 20 = 55; now: 55.
        expect(historyOf(shares, JarKey.NECESSITIES)).toEqual([
            [JAR_SHARE_BASELINE_PERIOD, '55.00'],
            ['2026-09', '50.00'],
            ['2026-10', '55.00'],
            [NOW, '55.00'],
        ]);
        expect(historyOf(shares, JarKey.DAILY)).toEqual([]);
        expect(percentageOf(rows, JarKey.NECESSITIES)).toBe('55.00');
        expect(currentRowsMatch(rows, shares)).toBe(true);
    });

    it('merges a pot that has no share rows at all by its current percentage', async () => {
        const { service, shares } = buildService({ board: SIX_POT_BOARD, shares: [] });

        await inHousehold(() => service.deactivate(`${HOUSEHOLD}-${JarKey.DAILY}`));

        expect(historyOf(shares, JarKey.NECESSITIES)).toEqual([
            [JAR_SHARE_BASELINE_PERIOD, '55.00'],
            [NOW, '55.00'],
        ]);
    });

    it('keeps another household’s share rows untouched', async () => {
        const { service, shares } = buildService({ board: SIX_POT_BOARD });
        const before = shares
            .filter(row => row.household === OTHER_HOUSEHOLD)
            .map(row => ({ ...row }));

        await inHousehold(() => service.deactivate(`${HOUSEHOLD}-${JarKey.DAILY}`));
        await inHousehold(() => service.activate(JarKey.EDUCATION));

        expect(shares.filter(row => row.household === OTHER_HOUSEHOLD)).toEqual(before);
    });

    it('round-trips in the same month: the main pot ends with its original current share', async () => {
        const { service, rows, shares } = buildService();

        const dto = await inHousehold(() => service.activate(JarKey.EDUCATION));
        await inHousehold(() => service.deactivate(dto.id));

        expect(historyOf(shares, JarKey.LONG_TERM_SAVINGS)).toEqual([
            [JAR_SHARE_BASELINE_PERIOD, '20.00'],
            [NOW, '20.00'],
        ]);
        expect(historyOf(shares, JarKey.EDUCATION)).toEqual([]);
        expect(currentRowsMatch(rows, shares)).toBe(true);
    });
});
