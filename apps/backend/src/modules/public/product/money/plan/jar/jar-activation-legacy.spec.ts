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

/**
 * Households created before the three-pot default keep their six pots untouched. These specs
 * pin that: the board saves, turns on the two new optional pots, turns off an empty one, and
 * main pots with decimal shares stay exact in basis points.
 */

const HOUSEHOLD = 'household-legacy';
const OTHER_HOUSEHOLD = 'household-other';
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

/** The old board as it was seeded: stored sort order 0..5, six pots, 55 / 10 / 10 / 10 / 10 / 5. */
const LEGACY_BOARD: Array<[JarKey, string]> = [
    [JarKey.NECESSITIES, '55.00'],
    [JarKey.FINANCIAL_FREEDOM, '10.00'],
    [JarKey.EDUCATION, '10.00'],
    [JarKey.LONG_TERM_SAVINGS, '10.00'],
    [JarKey.PLAY, '10.00'],
    [JarKey.GIVE, '5.00'],
];

function rowsFor(household: string, board: Array<[JarKey, string]>): JarRow[] {
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

function template(key: OptionalJarKey) {
    return {
        key,
        name: `${key} pot`,
        subtitle: null,
        icon: '*',
        percentage: OPTIONAL_JAR_SHARE[key].toFixed(2),
        sortOrder: 10 + OPTIONAL_JAR_KEYS.indexOf(key),
        capabilities: JAR_CAPABILITIES[key],
    };
}

type ShareRow = { household: string; jar: { id: string }; period: string; percentage: string };

/** The baseline row the migration wrote for every pot that existed when the table was made. */
const baselineRows = (jars: JarRow[]): ShareRow[] =>
    jars.map(jar => ({
        household: jar.household,
        jar: { id: jar.id },
        period: JAR_SHARE_BASELINE_PERIOD,
        percentage: jar.percentage,
    }));

/** Same fake as the activation spec: honours the injected `household`, rolls back on error. */
function build(
    board: Array<[JarKey, string]> = LEGACY_BOARD,
    options: { withShareHistory?: boolean } = {}
) {
    const householdSeed = rowsFor(HOUSEHOLD, board);
    const otherSeed = rowsFor(OTHER_HOUSEHOLD, LEGACY_BOARD);
    const rows = [...householdSeed, ...otherSeed];
    const shares: ShareRow[] = [
        ...(options.withShareHistory === false ? [] : baselineRows(householdSeed)),
        ...baselineRows(otherSeed),
    ];
    const matches = (row: JarRow, where: { household: string; key?: unknown; id?: string }) => {
        if (row.household !== where.household) return false;
        if (where.id !== undefined && row.id !== where.id) return false;
        if (where.key !== undefined) {
            const wanted = where.key as JarKey | { $in: JarKey[] };
            const keys = typeof wanted === 'string' ? [wanted] : wanted.$in;
            if (!keys.includes(row.key)) return false;
        }
        return true;
    };
    const flush = vi.fn<() => Promise<void>>(async () => undefined);
    const em = {
        find: vi.fn<
            (entity: unknown, where: { household: string; key?: unknown }) => Promise<JarRow[]>
        >(async (entity, where) =>
            entity === JarShare
                ? (shares.filter(row => row.household === where.household) as never)
                : rows.filter(row => matches(row, where))
        ),
        findOne: vi.fn<
            (entity: unknown, where: { household: string; id?: string }) => Promise<JarRow | null>
        >(async (_entity, where) => rows.find(row => matches(row, where)) ?? null),
        // Nothing points at any pot in these cases.
        count: vi.fn<() => Promise<number>>(async () => 0),
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
        flush,
        transactional: undefined as unknown as <T>(cb: (tx: unknown) => Promise<T>) => Promise<T>,
    };
    em.transactional = async cb => {
        const before = [...rows];
        const percentages = rows.map(row => row.percentage);
        const sharesBefore = [...shares];
        const sharePercentages = shares.map(row => row.percentage);
        try {
            return await cb(em);
        } catch (error) {
            rows.splice(0, rows.length, ...before);
            rows.forEach((row, index) => (row.percentage = percentages[index]!));
            shares.splice(0, shares.length, ...sharesBefore);
            shares.forEach((row, index) => (row.percentage = sharePercentages[index]!));
            throw error;
        }
    };
    const service = new JarService(
        em as never,
        {} as never,
        { get: async () => ({ locale: Locale.EN }) } as never,
        {
            findActive: async (key: JarKey) =>
                (OPTIONAL_JAR_KEYS as readonly JarKey[]).includes(key)
                    ? template(key as OptionalJarKey)
                    : null,
        } as never
    );
    vi.spyOn(service, 'list').mockResolvedValue([]);
    return { service, rows, shares, flush };
}

const inHousehold = <T>(run: () => Promise<T>) =>
    householdStorage.run(
        {
            userId: 'user-1',
            householdId: HOUSEHOLD,
            role: 'OWNER',
            source: 'SEAT' as never,
            relation: null,
        },
        run
    );

const mine = (rows: JarRow[], household = HOUSEHOLD) =>
    rows.filter(row => row.household === household);
const pct = (rows: JarRow[], key: JarKey, household = HOUSEHOLD) =>
    mine(rows, household).find(row => row.key === key)?.percentage;
const totalBp = (rows: JarRow[], household = HOUSEHOLD) =>
    mine(rows, household).reduce(
        (total, row) => total + Math.round(Number(row.percentage) * 100),
        0
    );

describe('an existing six-pot household', () => {
    it('still saves its split, writes two-decimal strings and touches nobody else', async () => {
        const { service, rows } = build();
        const split = [
            [JarKey.NECESSITIES, 50],
            [JarKey.FINANCIAL_FREEDOM, 12.5],
            [JarKey.EDUCATION, 7.5],
            [JarKey.LONG_TERM_SAVINGS, 10],
            [JarKey.PLAY, 15],
            [JarKey.GIVE, 5],
        ] as const;

        await inHousehold(() =>
            service.updateSplit(
                split.map(([key, percentage]) => ({ jarId: `${HOUSEHOLD}-${key}`, percentage }))
            )
        );

        expect(mine(rows).map(row => row.percentage)).toEqual([
            '50.00',
            '12.50',
            '7.50',
            '10.00',
            '15.00',
            '5.00',
        ]);
        expect(totalBp(rows)).toBe(10_000);
        expect(mine(rows, OTHER_HOUSEHOLD).map(row => row.percentage)).toEqual(
            LEGACY_BOARD.map(([, percentage]) => percentage)
        );
    });

    it('keeps the stored sort order of its pots (no renumbering on save)', async () => {
        const { service, rows } = build();
        await inHousehold(() =>
            service.updateSplit(
                LEGACY_BOARD.map(([key, percentage]) => ({
                    jarId: `${HOUSEHOLD}-${key}`,
                    percentage: Number(percentage),
                }))
            )
        );
        expect(mine(rows).map(row => [row.key, row.sortOrder])).toEqual(
            LEGACY_BOARD.map(([key], index) => [key, index])
        );
    });

    it('turns on Daily out of Necessities and Goals out of Long Term Savings, totals stay 100', async () => {
        const { service, rows } = build();

        await inHousehold(() => service.activate(JarKey.DAILY));
        await inHousehold(() => service.activate(JarKey.GOALS));

        expect(pct(rows, JarKey.NECESSITIES)).toBe('35.00');
        expect(pct(rows, JarKey.DAILY)).toBe('20.00');
        expect(pct(rows, JarKey.LONG_TERM_SAVINGS)).toBe('4.00');
        expect(pct(rows, JarKey.GOALS)).toBe('6.00');
        // The pots it already had are untouched.
        expect(pct(rows, JarKey.FINANCIAL_FREEDOM)).toBe('10.00');
        expect(pct(rows, JarKey.EDUCATION)).toBe('10.00');
        expect(pct(rows, JarKey.PLAY)).toBe('10.00');
        expect(pct(rows, JarKey.GIVE)).toBe('5.00');
        expect(totalBp(rows)).toBe(10_000);
        expect(mine(rows)).toHaveLength(8);
        // And the new pots sit on the main pot's bank seat.
        expect(mine(rows).every(row => row.defaultAccount === SEAT)).toBe(true);
    });

    it.each([JarKey.FINANCIAL_FREEDOM, JarKey.EDUCATION, JarKey.GIVE] as const)(
        'refuses to turn on %s again with jar_already_active',
        async key => {
            const { service, rows } = build();
            await expect(inHousehold(() => service.activate(key))).rejects.toMatchObject({
                response: expect.objectContaining({ message: 'jar_already_active' }),
            });
            expect(totalBp(rows)).toBe(10_000);
            expect(mine(rows)).toHaveLength(6);
        }
    );

    it('turns off an empty optional pot and gives its share back to the group main pot', async () => {
        const { service, rows } = build();

        await inHousehold(() => service.deactivate(`${HOUSEHOLD}-${JarKey.EDUCATION}`));
        await inHousehold(() => service.deactivate(`${HOUSEHOLD}-${JarKey.FINANCIAL_FREEDOM}`));
        await inHousehold(() => service.deactivate(`${HOUSEHOLD}-${JarKey.GIVE}`));

        expect(mine(rows).map(row => [row.key, row.percentage])).toEqual([
            [JarKey.NECESSITIES, '55.00'],
            [JarKey.LONG_TERM_SAVINGS, '30.00'],
            [JarKey.PLAY, '15.00'],
        ]);
        expect(totalBp(rows)).toBe(10_000);
        expect(mine(rows, OTHER_HOUSEHOLD)).toHaveLength(6);
    });

    it('never turns off its main pots', async () => {
        const { service, rows } = build();
        for (const key of [JarKey.NECESSITIES, JarKey.LONG_TERM_SAVINGS, JarKey.PLAY]) {
            await expect(
                inHousehold(() => service.deactivate(`${HOUSEHOLD}-${key}`))
            ).rejects.toMatchObject({
                response: expect.objectContaining({ message: 'jar_not_optional' }),
            });
        }
        expect(mine(rows)).toHaveLength(6);
    });
});

/**
 * Share history of a household that predates it: one baseline row per pot (what the migration
 * wrote), so its past keeps the split it had, and every change adds only this month's rows.
 */
describe('an existing household keeps its past split', () => {
    const history = (shares: ShareRow[], key: JarKey) =>
        shares
            .filter(row => row.household === HOUSEHOLD && row.jar.id.endsWith(`-${key}`))
            .map(row => [row.period, row.percentage])
            .sort(([left], [right]) => left!.localeCompare(right!));

    it('a saved split adds this month for the pots that moved; the baseline stays as it was', async () => {
        const { service, shares } = build();

        await inHousehold(() =>
            service.updateSplit(
                [
                    [JarKey.NECESSITIES, 50],
                    [JarKey.FINANCIAL_FREEDOM, 15],
                    [JarKey.EDUCATION, 10],
                    [JarKey.LONG_TERM_SAVINGS, 10],
                    [JarKey.PLAY, 10],
                    [JarKey.GIVE, 5],
                ].map(([key, percentage]) => ({
                    jarId: `${HOUSEHOLD}-${key}`,
                    percentage: percentage as number,
                }))
            )
        );

        expect(history(shares, JarKey.NECESSITIES)).toEqual([
            [JAR_SHARE_BASELINE_PERIOD, '55.00'],
            [NOW, '50.00'],
        ]);
        expect(history(shares, JarKey.FINANCIAL_FREEDOM)).toEqual([
            [JAR_SHARE_BASELINE_PERIOD, '10.00'],
            [NOW, '15.00'],
        ]);
        expect(history(shares, JarKey.PLAY)).toEqual([[JAR_SHARE_BASELINE_PERIOD, '10.00']]);
    });

    it('turning Daily on adds it from this month and steps Necessities down from this month', async () => {
        const { service, shares } = build();

        await inHousehold(() => service.activate(JarKey.DAILY));

        expect(history(shares, JarKey.DAILY)).toEqual([[NOW, '20.00']]);
        expect(history(shares, JarKey.NECESSITIES)).toEqual([
            [JAR_SHARE_BASELINE_PERIOD, '55.00'],
            [NOW, '35.00'],
        ]);
    });

    it('a household with no share rows yet (deploy window) is read as its baseline, then written down on first change', async () => {
        const { service, shares } = build(LEGACY_BOARD, { withShareHistory: false });

        await inHousehold(() => service.activate(JarKey.DAILY));

        expect(history(shares, JarKey.NECESSITIES)).toEqual([
            [JAR_SHARE_BASELINE_PERIOD, '55.00'],
            [NOW, '35.00'],
        ]);
        // A household with no rows at all gets a baseline for EVERY pot, so none of them is
        // later mistaken for a pot an old backend created after the table existed.
        expect(history(shares, JarKey.PLAY)).toEqual([[JAR_SHARE_BASELINE_PERIOD, '10.00']]);
    });

    it('turning all optional pots on and off leaves the main pot with the original baseline and a current row at its percentage', async () => {
        const { service, rows, shares } = build();
        const created: string[] = [];
        for (const key of [JarKey.DAILY, JarKey.GOALS]) {
            created.push((await inHousehold(() => service.activate(key))).id);
        }
        for (const id of created) await inHousehold(() => service.deactivate(id));

        expect(history(shares, JarKey.NECESSITIES)).toEqual([
            [JAR_SHARE_BASELINE_PERIOD, '55.00'],
            [NOW, '55.00'],
        ]);
        expect(pct(rows, JarKey.NECESSITIES)).toBe('55.00');
        expect(history(shares, JarKey.DAILY)).toEqual([]);
    });
});

describe('decimal shares stay exact in basis points', () => {
    it('main pot at 12.5 gives 6 to Goals and keeps 6.5 (no 6.499999 drift)', async () => {
        const { service, rows } = build([
            [JarKey.NECESSITIES, '55.00'],
            [JarKey.LONG_TERM_SAVINGS, '12.50'],
            [JarKey.PLAY, '32.50'],
        ]);

        await inHousehold(() => service.activate(JarKey.GOALS));

        expect(pct(rows, JarKey.LONG_TERM_SAVINGS)).toBe('6.50');
        expect(pct(rows, JarKey.GOALS)).toBe('6.00');
        expect(totalBp(rows)).toBe(10_000);
    });

    it('a main pot stored as a plain "12.5" (no trailing zero) is read the same way', async () => {
        const { service, rows } = build([
            [JarKey.NECESSITIES, '55'],
            [JarKey.LONG_TERM_SAVINGS, '12.5'],
            [JarKey.PLAY, '32.5'],
        ]);

        await inHousehold(() => service.activate(JarKey.GOALS));

        expect(pct(rows, JarKey.LONG_TERM_SAVINGS)).toBe('6.50');
        expect(totalBp(rows)).toBe(10_000);
    });

    it('a 0.1 + 0.2 style main pot turns on and off without drift', async () => {
        const { service, rows } = build([
            [JarKey.NECESSITIES, '55.30'],
            [JarKey.LONG_TERM_SAVINGS, '20.10'],
            [JarKey.PLAY, '24.60'],
        ]);

        const jar = await inHousehold(() => service.activate(JarKey.FINANCIAL_FREEDOM));
        expect(pct(rows, JarKey.LONG_TERM_SAVINGS)).toBe('15.10');
        expect(totalBp(rows)).toBe(10_000);

        await inHousehold(() => service.deactivate(jar.id));
        expect(mine(rows).map(row => row.percentage)).toEqual(['55.30', '20.10', '24.60']);
    });

    it('turning every optional pot on one by one and off again returns the exact board', async () => {
        const { service, rows } = build([
            [JarKey.NECESSITIES, '55.00'],
            [JarKey.LONG_TERM_SAVINGS, '20.00'],
            [JarKey.PLAY, '25.00'],
        ]);
        const created: string[] = [];

        for (const key of OPTIONAL_JAR_KEYS) {
            const jar = await inHousehold(() => service.activate(key));
            created.push(jar.id);
            expect(totalBp(rows)).toBe(10_000);
        }
        expect(mine(rows)).toHaveLength(8);
        // Future now holds 4 + 6 + 5 + 5 = 20.
        expect(pct(rows, JarKey.LONG_TERM_SAVINGS)).toBe('4.00');

        for (const id of created.reverse()) {
            await inHousehold(() => service.deactivate(id));
            expect(totalBp(rows)).toBe(10_000);
        }
        expect(mine(rows).map(row => [row.key, row.percentage])).toEqual([
            [JarKey.NECESSITIES, '55.00'],
            [JarKey.LONG_TERM_SAVINGS, '20.00'],
            [JarKey.PLAY, '25.00'],
        ]);
    });
});

describe('Jar type sanity', () => {
    it('the fake rows satisfy the fields the service reads', () => {
        const row = rowsFor(HOUSEHOLD, LEGACY_BOARD)[0]!;
        expect(row as unknown as Jar).toMatchObject({ key: JarKey.NECESSITIES });
    });
});
