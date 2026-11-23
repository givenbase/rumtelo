import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    Cadence,
    JAR_CAPABILITIES,
    JarKey,
    Locale,
    OPTIONAL_JAR_KEYS,
    OPTIONAL_JAR_SHARE,
} from '@rumtelo/contracts';
import { allocateByPercentage } from '@rumtelo/utils';

import { AuthHousehold } from '../../../../../auth/household/managed/household/auth-household.entity';
import {
    asOwnerOf,
    fakeHouseholdEm,
    HOUSEHOLD_A,
    HOUSEHOLD_B,
    type Row,
} from '../../fake-household-em.testing';
import { Jar } from './jar.entity';
import { JAR_SHARE_BASELINE_PERIOD, JarShare } from './jar-share.entity';
import { JarService } from './jar.service';

/**
 * A pot's running balance through the service, end to end on the fake EntityManager: the writes
 * (`updateSplit`, `activate`, `deactivate`) put share rows in, `balances` reads them back with
 * the stored income history. What must hold: a later split or income change never re-prices an
 * earlier month, and an household that never changed anything reads what the old formula gave.
 */

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-23T10:00:00Z'));
});
afterEach(() => vi.useRealTimers());

const BOARD: Array<[JarKey, string]> = [
    [JarKey.NECESSITIES, '55.00'],
    [JarKey.LONG_TERM_SAVINGS, '20.00'],
    [JarKey.PLAY, '25.00'],
];
const INCOME = 2_500_00;
/** The household started in May: seven months through November. */
const START = new Date('2026-05-10T09:00:00Z');

type IncomeFixture = {
    sources: Array<Record<string, unknown>>;
    periods: Array<Record<string, unknown>>;
};

function jarRows(household: string, board: Array<[JarKey, string]>): Row[] {
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
        defaultAccount: null,
    }));
}

function baselines(jars: Row[]): Row[] {
    return jars.map(jar => ({
        id: `share-${jar.id}`,
        household: jar.household,
        jar,
        period: JAR_SHARE_BASELINE_PERIOD,
        percentage: jar.percentage,
    }));
}

function build(
    options: {
        createdAt?: Date;
        income?: IncomeFixture;
        withShareHistory?: boolean;
        /** A raw `lifetime spent` per jar id, for the sorted-OUT query over the range. */
        lifetimeSpent?: Record<string, number>;
    } = {}
) {
    const householdA = jarRows(HOUSEHOLD_A, BOARD);
    // Another household with a very different split: its rows must never be read for A.
    const householdB = jarRows(HOUSEHOLD_B, [
        [JarKey.NECESSITIES, '10.00'],
        [JarKey.LONG_TERM_SAVINGS, '10.00'],
        [JarKey.PLAY, '80.00'],
    ]);
    const tables = new Map<unknown, Row[]>([
        [Jar, [...householdA, ...householdB]],
        [
            JarShare,
            [
                ...(options.withShareHistory === false ? [] : baselines(householdA)),
                ...baselines(householdB),
            ],
        ],
        [
            AuthHousehold,
            [
                { id: HOUSEHOLD_A, createdAt: options.createdAt ?? START },
                { id: HOUSEHOLD_B, createdAt: START },
            ],
        ],
    ]);
    const income: IncomeFixture = options.income ?? {
        sources: [
            {
                id: 'salary',
                amount: String(INCOME),
                cadence: Cadence.MONTHLY,
                is_active: true,
                started_on: '2026-05-01',
                ends_on: null,
            },
        ],
        periods: [],
    };
    const em = fakeHouseholdEm(tables, {
        sql: (sql, params) => {
            if (sql.includes('FROM money_income_source')) return income.sources;
            if (sql.includes('FROM money_income_amount_period')) return income.periods;
            // The sorted-OUT totals over the range (lifetime) are the only `>=` query.
            if (sql.includes('amount < 0') && sql.includes('>= ?') && params.length === 3) {
                return Object.entries(options.lifetimeSpent ?? {}).map(([jarId, total]) => ({
                    jar_id: jarId,
                    total: String(total),
                }));
            }
            return [];
        },
    });
    const service = new JarService(
        em as never,
        {} as never,
        { get: async () => ({ locale: Locale.EN }) } as never,
        {
            findActive: async (key: JarKey) => {
                if (!(OPTIONAL_JAR_KEYS as readonly JarKey[]).includes(key)) return null;
                return {
                    key,
                    name: key,
                    subtitle: null,
                    icon: null,
                    percentage:
                        OPTIONAL_JAR_SHARE[key as keyof typeof OPTIONAL_JAR_SHARE].toFixed(2),
                    sortOrder: 10,
                    capabilities: JAR_CAPABILITIES[key],
                };
            },
        } as never
    );
    const asA = <T>(run: () => Promise<T>) => asOwnerOf(HOUSEHOLD_A, run);
    const balances = (period: string) => asA(() => service.balances(period));
    return { service, em, tables, asA, balances };
}

type Balances = Awaited<ReturnType<ReturnType<typeof build>['balances']>>;
const potOf = (rows: Balances, key: JarKey) => rows.find(row => row.key === key)!;

/** What the old formula said for a household that never changed anything. */
function oldFormula(months: number, income: number, percentages: Record<string, number>) {
    const allocated = allocateByPercentage(
        income,
        Object.entries(percentages).map(([id, percentage]) => ({ id, percentage }))
    );
    return Object.fromEntries(allocated.map(row => [row.id, months * row.amount]));
}

describe('potBalance for a household that never changed its split or income', () => {
    it('equals months × this month’s allocation, the old formula, to the cent', async () => {
        const { balances } = build();

        const rows = await balances('2026-11');

        const expected = oldFormula(7, INCOME, {
            [JarKey.NECESSITIES]: 55,
            [JarKey.LONG_TERM_SAVINGS]: 20,
            [JarKey.PLAY]: 25,
        });
        for (const key of [JarKey.NECESSITIES, JarKey.LONG_TERM_SAVINGS, JarKey.PLAY]) {
            expect(potOf(rows, key).potBalance).toBe(expected[key]);
        }
        // The current month is untouched: this month's deposit and what is left of it.
        expect(potOf(rows, JarKey.NECESSITIES)).toMatchObject({
            allocated: 1_375_00,
            remaining: 1_375_00,
            available: 1_375_00,
            overspent: false,
        });
    });

    it('subtracts what was spent over the whole range', async () => {
        const { balances } = build({
            lifetimeSpent: { [`${HOUSEHOLD_A}-${JarKey.PLAY}`]: 300_00 },
        });

        const rows = await balances('2026-11');

        expect(potOf(rows, JarKey.PLAY).potBalance).toBe(7 * 625_00 - 300_00);
    });

    it('reads the same numbers for a pot household with no share rows at all (deploy window)', async () => {
        const withRows = await build().balances('2026-11');
        const withoutRows = await build({ withShareHistory: false }).balances('2026-11');

        expect(withoutRows.map(row => [row.key, row.allocated, row.potBalance])).toEqual(
            withRows.map(row => [row.key, row.allocated, row.potBalance])
        );
    });
});

describe('a split change is not applied backwards', () => {
    it('keeps earlier months at their own share and prices only this month at the new one', async () => {
        const { service, asA, balances } = build();
        const octoberBefore = await balances('2026-10');

        await asA(() =>
            service.updateSplit([
                { jarId: `${HOUSEHOLD_A}-${JarKey.NECESSITIES}`, percentage: 45 },
                { jarId: `${HOUSEHOLD_A}-${JarKey.LONG_TERM_SAVINGS}`, percentage: 30 },
                { jarId: `${HOUSEHOLD_A}-${JarKey.PLAY}`, percentage: 25 },
            ])
        );

        // October is a past month: allocation and running balance both stay as they were.
        const octoberAfter = await balances('2026-10');
        expect(octoberAfter.map(row => [row.key, row.allocated, row.potBalance])).toEqual(
            octoberBefore.map(row => [row.key, row.allocated, row.potBalance])
        );
        // November: six months at the old 55 %, this month at 45 %.
        const november = await balances('2026-11');
        expect(potOf(november, JarKey.NECESSITIES)).toMatchObject({
            allocated: 1_125_00,
            potBalance: 6 * 1_375_00 + 1_125_00,
        });
        expect(potOf(november, JarKey.LONG_TERM_SAVINGS).potBalance).toBe(6 * 500_00 + 750_00);
        expect(potOf(november, JarKey.PLAY).potBalance).toBe(7 * 625_00);
    });
});

describe('turning a pot on and off', () => {
    it('starts a new pot at 0 for every past month and leaves the main pot its past', async () => {
        const { service, asA, balances } = build();

        await asA(() => service.activate(JarKey.DAILY));
        // Turn Daily on from Necessities: 55 -> 35.
        const november = await balances('2026-11');
        const october = await balances('2026-10');

        expect(potOf(november, JarKey.DAILY).potBalance).toBe(500_00);
        expect(potOf(november, JarKey.NECESSITIES).potBalance).toBe(6 * 1_375_00 + 875_00);
        expect(potOf(october, JarKey.DAILY)).toMatchObject({ allocated: 0, potBalance: 0 });
        expect(potOf(october, JarKey.NECESSITIES).potBalance).toBe(6 * 1_375_00);
    });

    it('turning it off again returns every figure, the removed pot’s money included, to the main pot', async () => {
        const { service, asA, balances } = build();
        const before = await balances('2026-11');

        const daily = await asA(() => service.activate(JarKey.DAILY));
        await asA(() => service.deactivate(daily.id));
        const after = await balances('2026-11');

        expect(after.map(row => [row.key, row.allocated, row.potBalance])).toEqual(
            before.map(row => [row.key, row.allocated, row.potBalance])
        );
    });

    it('moves the removed pot’s own past deposits onto the main pot when it was on for some months', async () => {
        const { service, asA, balances, tables } = build();
        // Daily was turned on in September: 20 % out of Necessities from then.
        const jarId = `${HOUSEHOLD_A}-${JarKey.DAILY}`;
        const necessities = tables
            .get(Jar)!
            .find(row => row.id === `${HOUSEHOLD_A}-${JarKey.NECESSITIES}`)!;
        necessities.percentage = '35.00';
        tables.get(Jar)!.push({
            ...jarRows(HOUSEHOLD_A, [[JarKey.DAILY, '20.00']])[0]!,
            id: jarId,
            sortOrder: 5,
        });
        tables.get(JarShare)!.push(
            {
                id: 'share-necessities-sep',
                household: HOUSEHOLD_A,
                jar: necessities,
                period: '2026-09',
                percentage: '35.00',
            },
            {
                id: 'share-daily-sep',
                household: HOUSEHOLD_A,
                jar: tables.get(Jar)!.find(row => row.id === jarId)!,
                period: '2026-09',
                percentage: '20.00',
            }
        );

        const before = await balances('2026-11');
        // Necessities: May-Aug at 55 %, Sep-Nov at 35 %; Daily: Sep-Nov at 20 %.
        expect(potOf(before, JarKey.NECESSITIES).potBalance).toBe(4 * 1_375_00 + 3 * 875_00);
        expect(potOf(before, JarKey.DAILY).potBalance).toBe(3 * 500_00);

        await asA(() => service.deactivate(jarId));
        const after = await balances('2026-11');

        expect(after.find(row => row.key === JarKey.DAILY)).toBeUndefined();
        // Same cumulative deposit as both pots had together (every share divides the income).
        expect(potOf(after, JarKey.NECESSITIES).potBalance).toBe(4 * 1_375_00 + 3 * 1_375_00);
        // And September's month still reads what it read: Necessities 55 % of September.
        expect(potOf(await balances('2026-09'), JarKey.NECESSITIES).allocated).toBe(1_375_00);
    });
});

describe('income of each month', () => {
    it('prices months before a raise at the income they had', async () => {
        const { balances } = build({
            income: {
                sources: [
                    {
                        id: 'salary',
                        amount: String(3_000_00),
                        cadence: Cadence.MONTHLY,
                        is_active: true,
                        started_on: '2026-05-01',
                        ends_on: null,
                    },
                ],
                // 2 000 from May, 3 000 from August (the cached amount is the latest).
                periods: [
                    { income_source_id: 'salary', amount: '200000', effective_on: '2026-05-01' },
                    { income_source_id: 'salary', amount: '300000', effective_on: '2026-08-01' },
                ],
            },
        });

        const rows = await balances('2026-11');

        // Necessities 55 %: 3 months at 2 000, 4 months at 3 000.
        expect(potOf(rows, JarKey.NECESSITIES).potBalance).toBe(3 * 1_100_00 + 4 * 1_650_00);
        expect(potOf(rows, JarKey.NECESSITIES).allocated).toBe(1_650_00);
        const total = rows.reduce((sum, row) => sum + row.potBalance, 0);
        expect(total).toBe(3 * 2_000_00 + 4 * 3_000_00);
    });

    it('the pots of a board add up to the income of every month since the start', async () => {
        const { balances } = build({
            createdAt: new Date('2025-02-03T00:00:00Z'),
            income: {
                sources: [
                    {
                        id: 'salary',
                        amount: '333333',
                        cadence: Cadence.MONTHLY,
                        is_active: true,
                        started_on: '2025-02-01',
                        ends_on: null,
                    },
                ],
                periods: [],
            },
        });

        const rows = await balances('2026-11');

        // 22 months (Feb 2025 .. Nov 2026), every one split to the cent.
        expect(rows.reduce((sum, row) => sum + row.potBalance, 0)).toBe(22 * 3_333_33);
    });
});

describe('queries and isolation', () => {
    it('reads with the same number of queries for 7 months of history as for 120', async () => {
        const short = build();
        const long = build({ createdAt: new Date('2016-11-05T00:00:00Z') });

        await short.balances('2026-11');
        await long.balances('2026-11');

        const queryCount = (setup: typeof short) =>
            setup.em.find.mock.calls.length +
            setup.em.findOne.mock.calls.length +
            setup.em.getConnection().execute.mock.calls.length;
        expect(queryCount(long)).toBe(queryCount(short));
        // Share rows and income rows are each read once, not once per month.
        expect(long.em.find.mock.calls.filter(([entity]) => entity === JarShare)).toHaveLength(1);
        const incomeReads = long.em
            .getConnection()
            .execute.mock.calls.filter(([sql]) => String(sql).includes('money_income'));
        expect(incomeReads).toHaveLength(2);
    });

    it('never reads another household’s share rows', async () => {
        const { em, balances } = build();

        const rows = await balances('2026-11');

        const shareReads = em.find.mock.calls.filter(([entity]) => entity === JarShare);
        expect(shareReads.length).toBeGreaterThan(0);
        expect(shareReads.map(([, where]) => where)).toEqual(
            shareReads.map(() => expect.objectContaining({ household: HOUSEHOLD_A }))
        );
        // Household B's 10 / 10 / 80 split would show here if it leaked.
        expect(potOf(rows, JarKey.PLAY).potBalance).toBe(7 * 625_00);
        expect(rows.every(row => row.householdId === HOUSEHOLD_A)).toBe(true);
    });
});

/**
 * Deploy-window drift (SP3-H M1): rows an old backend never wrote. Reads self-heal the current
 * month and never invent money; the next write makes the history consistent again.
 */
describe('drift left by an old backend in the deploy window', () => {
    /** Old-code activate: Daily exists (20 %), Necessities says 35 %, but no share rows moved. */
    function afterOldCodeActivate() {
        const setup = build();
        const jars = setup.tables.get(Jar)!;
        jars.find(row => row.id === `${HOUSEHOLD_A}-${JarKey.NECESSITIES}`)!.percentage = '35.00';
        jars.push({
            ...jarRows(HOUSEHOLD_A, [[JarKey.DAILY, '20.00']])[0]!,
            id: `${HOUSEHOLD_A}-${JarKey.DAILY}`,
            sortOrder: 5,
        });
        return setup;
    }

    it('counts a row-less pot from the current month and keeps every past month at 100 %', async () => {
        const { balances } = afterOldCodeActivate();

        const november = await balances('2026-11');
        const october = await balances('2026-10');

        expect(potOf(november, JarKey.DAILY).potBalance).toBe(500_00);
        expect(potOf(october, JarKey.DAILY)).toMatchObject({ allocated: 0, potBalance: 0 });
        // Past months: Necessities still at its 55 % rows; this month at its 35 %.
        expect(potOf(november, JarKey.NECESSITIES).potBalance).toBe(6 * 1_375_00 + 875_00);
        // Conservation: the pots add up to the income of the seven months, no more.
        expect(november.reduce((sum, row) => sum + row.potBalance, 0)).toBe(7 * INCOME);
        expect(october.reduce((sum, row) => sum + row.potBalance, 0)).toBe(6 * INCOME);
    });

    it('uses jar.percentage for the current month even when a current-month row disagrees', async () => {
        const { balances, tables } = build();
        tables.get(JarShare)!.push({
            id: 'wrong-now',
            household: HOUSEHOLD_A,
            jar: tables.get(Jar)!.find(row => row.id === `${HOUSEHOLD_A}-${JarKey.PLAY}`)!,
            period: '2026-11',
            percentage: '90.00',
        });

        const rows = await balances('2026-11');

        expect(potOf(rows, JarKey.PLAY)).toMatchObject({
            allocated: 625_00,
            potBalance: 7 * 625_00,
        });
        expect(rows.reduce((sum, row) => sum + row.allocated, 0)).toBe(INCOME);
    });

    it('one write makes the history consistent again, with the first row of the row-less pot at the current month', async () => {
        const { service, asA, tables, balances } = afterOldCodeActivate();
        const before = await balances('2026-11');

        // Save the split exactly as it stands: nothing changes in the figures.
        await asA(() =>
            service.updateSplit(
                [
                    [JarKey.NECESSITIES, 35],
                    [JarKey.LONG_TERM_SAVINGS, 20],
                    [JarKey.PLAY, 25],
                    [JarKey.DAILY, 20],
                ].map(([key, percentage]) => ({
                    jarId: `${HOUSEHOLD_A}-${key}`,
                    percentage: percentage as number,
                }))
            )
        );

        const rows = tables.get(JarShare)!.filter(row => row.household === HOUSEHOLD_A);
        const jarIdOf = (row: Row) => (row.jar as Row).id;
        // Daily's first row is this month, not 1970; Necessities gets a current-month row.
        expect(
            rows
                .filter(row => jarIdOf(row) === `${HOUSEHOLD_A}-${JarKey.DAILY}`)
                .map(row => [row.period, row.percentage])
        ).toEqual([['2026-11', '20.00']]);
        expect(
            rows
                .filter(row => jarIdOf(row) === `${HOUSEHOLD_A}-${JarKey.NECESSITIES}`)
                .map(row => [row.period, row.percentage])
        ).toEqual([
            [JAR_SHARE_BASELINE_PERIOD, '55.00'],
            ['2026-11', '35.00'],
        ]);
        // Every pot's row for the current month equals its percentage now.
        for (const jar of tables.get(Jar)!.filter(row => row.household === HOUSEHOLD_A)) {
            const own = rows
                .filter(row => jarIdOf(row) === jar.id)
                .sort((left, right) => String(left.period).localeCompare(String(right.period)));
            expect(own.at(-1)!.percentage).toBe(jar.percentage);
        }
        const after = await balances('2026-11');
        expect(after.map(row => [row.key, row.allocated, row.potBalance])).toEqual(
            before.map(row => [row.key, row.allocated, row.potBalance])
        );
    });

    it('writes the current-month row from jar.percentage when old code turned a pot off (rows stale, no merge)', async () => {
        const { service, asA, tables } = build();
        // Old-code deactivate: Necessities went 35 -> 55, but its rows still say 35.
        const necessities = tables
            .get(Jar)!
            .find(row => row.id === `${HOUSEHOLD_A}-${JarKey.NECESSITIES}`)!;
        tables.get(JarShare)!.find(row => (row.jar as Row).id === necessities.id)!.percentage =
            '35.00';

        await asA(() =>
            service.updateSplit(
                [
                    [JarKey.NECESSITIES, 55],
                    [JarKey.LONG_TERM_SAVINGS, 20],
                    [JarKey.PLAY, 25],
                ].map(([key, percentage]) => ({
                    jarId: `${HOUSEHOLD_A}-${key}`,
                    percentage: percentage as number,
                }))
            )
        );

        const own = tables
            .get(JarShare)!
            .filter(row => (row.jar as Row).id === necessities.id)
            .map(row => [row.period, row.percentage]);
        expect(own).toEqual([
            [JAR_SHARE_BASELINE_PERIOD, '35.00'],
            ['2026-11', '55.00'],
        ]);
    });

    it('activate and deactivate repair the same drift before they build on it', async () => {
        const { service, asA, tables } = afterOldCodeActivate();
        // Old code also turned on Education here? No: turn Goals on now with new code.
        await asA(() => service.activate(JarKey.GOALS));

        const rows = tables.get(JarShare)!.filter(row => row.household === HOUSEHOLD_A);
        const jarIdOf = (row: Row) => (row.jar as Row).id;
        // The row-less Daily got its first row at the current month; nothing at 1970.
        expect(
            rows
                .filter(row => jarIdOf(row) === `${HOUSEHOLD_A}-${JarKey.DAILY}`)
                .map(row => row.period)
        ).toEqual(['2026-11']);

        const daily = `${HOUSEHOLD_A}-${JarKey.DAILY}`;
        await asA(() => service.deactivate(daily));
        const necessities = tables
            .get(JarShare)!
            .filter(row => (row.jar as Row).id === `${HOUSEHOLD_A}-${JarKey.NECESSITIES}`)
            .map(row => [row.period, row.percentage]);
        // Merged: Daily had nothing before this month, so the past stays at 55; now 55 again.
        expect(necessities).toEqual([
            [JAR_SHARE_BASELINE_PERIOD, '55.00'],
            ['2026-11', '55.00'],
        ]);
    });
});
