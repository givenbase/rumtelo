import { describe, expect, it, vi } from 'vitest';

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
import { JarService } from './jar.service';

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

/** Same fake as the activation spec: honours the injected `household`, rolls back on error. */
function build(board: Array<[JarKey, string]> = LEGACY_BOARD) {
    const rows = [...rowsFor(HOUSEHOLD, board), ...rowsFor(OTHER_HOUSEHOLD, LEGACY_BOARD)];
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
        >(async (_entity, where) => rows.filter(row => matches(row, where))),
        findOne: vi.fn<
            (entity: unknown, where: { household: string; id?: string }) => Promise<JarRow | null>
        >(async (_entity, where) => rows.find(row => matches(row, where)) ?? null),
        // Nothing points at any pot in these cases.
        count: vi.fn<() => Promise<number>>(async () => 0),
        create: vi.fn<(entity: unknown, data: JarRow) => JarRow>((_entity, data) => ({
            ...data,
            id: `${data.household}-new-${data.key}`,
        })),
        persist: vi.fn<(row: JarRow) => void>(row => {
            rows.push(row);
        }),
        remove: vi.fn<(row: JarRow) => void>(row => {
            rows.splice(rows.indexOf(row), 1);
        }),
        flush,
        transactional: undefined as unknown as <T>(cb: (tx: unknown) => Promise<T>) => Promise<T>,
    };
    em.transactional = async cb => {
        const before = [...rows];
        const percentages = rows.map(row => row.percentage);
        try {
            return await cb(em);
        } catch (error) {
            rows.splice(0, rows.length, ...before);
            rows.forEach((row, index) => (row.percentage = percentages[index]!));
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
    return { service, rows, flush };
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
