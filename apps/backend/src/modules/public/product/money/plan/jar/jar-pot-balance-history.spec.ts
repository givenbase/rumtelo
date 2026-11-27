import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    Cadence,
    JAR_CAPABILITIES,
    JarKey,
    Locale,
    OPTIONAL_JAR_KEYS,
    OPTIONAL_JAR_SHARE,
    isMainJarKey,
    mainJarKeyFor,
} from '@rumtelo/contracts';
import {
    endOfPeriodIso,
    jarCoverage,
    monthlyNetAsOf,
    type IncomeSourceForNet,
} from '@rumtelo/utils';

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
import {
    periodFromIndex,
    periodIndex,
    shareBasisPointsAt,
    potShareHistory,
} from './jar-share.util';

/**
 * QA of the pot-balance history (SP3-Q2), end to end through `JarService` on the fake
 * EntityManager. The oracles here are written independently of the code under test: a BigInt
 * split with the remainder to the largest share, and a plain month-by-month walk. What is
 * proved:
 *
 * - M1  a household that never changed anything reads the old formula, for 3 to 8 pots and
 *       every viewed period;
 * - M2  conservation, no negative deposit and "the past is not rewritten" over seeded random
 *       histories of split changes, turn-on, turn-off and income changes;
 * - M3  the current month's figures are the direct split of the current income;
 * - M4  after every write path each pot's share this month equals `jar.percentage`, one row
 *       per pot per month, earlier rows kept;
 * - M5  activation / deactivation, and the cents a turn-off can move;
 * - M7  the edge cases of period and shares.
 */

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-23T10:00:00Z'));
});
afterEach(() => vi.useRealTimers());

// ---------------------------------------------------------------------------
// Independent oracles
// ---------------------------------------------------------------------------

/** Seeded generator (mulberry32): the same numbers on every run. */
function seeded(seed: number) {
    let state = seed;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
        mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
    };
}

/**
 * `income` split by basis points: floor(income × bp / 10 000) per pot, the remainder to the
 * largest share (first one on a tie). BigInt, so no float can hide an off-by-one. Written from
 * the product rule, not from `allocateByPercentage`.
 */
function exactSplit(income: number, entries: ReadonlyArray<readonly [string, number]>) {
    const floors = entries.map(
        ([key, basisPoints]) =>
            [key, Number((BigInt(income) * BigInt(basisPoints)) / 10_000n)] as [string, number]
    );
    const remainder = income - floors.reduce((sum, [, amount]) => sum + amount, 0);
    let largest = 0;
    entries.forEach(([, basisPoints], index) => {
        if (basisPoints > entries[largest]![1]) largest = index;
    });
    if (floors.length > 0) floors[largest]![1] += remainder;
    return new Map(floors);
}

const MAIN_KEYS = [JarKey.NECESSITIES, JarKey.LONG_TERM_SAVINGS, JarKey.PLAY] as const;

// ---------------------------------------------------------------------------
// Household fixture
// ---------------------------------------------------------------------------

type SourceRow = {
    id: string;
    amount: string;
    cadence: Cadence;
    is_active: boolean;
    started_on: string | null;
    ends_on: string | null;
};
type PeriodRow = { income_source_id: string; amount: string; effective_on: string };

function jarRow(household: string, key: JarKey, basisPoints: number, sortOrder: number): Row {
    return {
        id: `${household}-${key}`,
        household,
        key,
        name: key,
        subtitle: null,
        icon: null,
        percentage: (basisPoints / 100).toFixed(2),
        capabilities: JAR_CAPABILITIES[key],
        sortOrder,
        defaultAccount: null,
    };
}

function build(input: {
    board: ReadonlyArray<readonly [JarKey, number]>;
    createdAt: Date;
    sources: SourceRow[];
    periods?: PeriodRow[];
    /** No share rows at all for household A (a deploy window), or one baseline row per pot. */
    withShareHistory?: boolean;
    spentByJar?: Record<string, number>;
    creditedByJar?: Record<string, number>;
}) {
    const jarsA = input.board.map(([key, basisPoints], index) =>
        jarRow(HOUSEHOLD_A, key, basisPoints, index)
    );
    // Household B has a loud, different split: any leak into A's figures shows.
    const jarsB = [
        jarRow(HOUSEHOLD_B, JarKey.NECESSITIES, 1_000, 0),
        jarRow(HOUSEHOLD_B, JarKey.LONG_TERM_SAVINGS, 1_000, 1),
        jarRow(HOUSEHOLD_B, JarKey.PLAY, 8_000, 2),
    ];
    const baseline = (jars: Row[]): Row[] =>
        jars.map(jar => ({
            id: `share-${jar.id}`,
            household: jar.household,
            jar,
            period: JAR_SHARE_BASELINE_PERIOD,
            percentage: jar.percentage,
        }));
    const tables = new Map<unknown, Row[]>([
        [Jar, [...jarsA, ...jarsB]],
        [
            JarShare,
            [...(input.withShareHistory === false ? [] : baseline(jarsA)), ...baseline(jarsB)],
        ],
        [
            AuthHousehold,
            [
                { id: HOUSEHOLD_A, createdAt: input.createdAt },
                { id: HOUSEHOLD_B, createdAt: input.createdAt },
            ],
        ],
    ]);
    const income = { sources: input.sources, periods: input.periods ?? [] };
    const ledger = {
        spentByJar: input.spentByJar ?? {},
        creditedByJar: input.creditedByJar ?? {},
    };
    const em = fakeHouseholdEm(tables, {
        sql: sql => {
            if (sql.includes('FROM money_income_source')) return income.sources;
            if (sql.includes('FROM money_income_amount_period')) return income.periods;
            // The range totals (start..period) are the only queries with a `>= ?` bound.
            if (sql.includes('>= ?') && sql.includes('amount < 0')) {
                return Object.entries(ledger.spentByJar).map(([jar_id, total]) => ({
                    jar_id,
                    total: String(total),
                }));
            }
            if (sql.includes('>= ?') && sql.includes('amount > 0')) {
                return Object.entries(ledger.creditedByJar).map(([jar_id, total]) => ({
                    jar_id,
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
    return {
        service,
        em,
        tables,
        income,
        ledger,
        asA,
        balances: (period: string) => asA(() => service.balances(period)),
        jarId: (key: JarKey) => `${HOUSEHOLD_A}-${key}`,
        jarsOfA: () => tables.get(Jar)!.filter(row => row.household === HOUSEHOLD_A),
        sharesOfA: () => tables.get(JarShare)!.filter(row => row.household === HOUSEHOLD_A),
    };
}

type Setup = ReturnType<typeof build>;
type BalanceRows = Awaited<ReturnType<Setup['balances']>>;

const salary = (amount: number, startedOn: string): SourceRow => ({
    id: 'salary',
    amount: String(amount),
    cadence: Cadence.MONTHLY,
    is_active: true,
    started_on: startedOn,
    ends_on: null,
});

const basisPointsOf = (jar: Row) => Math.round(Number(jar.percentage) * 100);

/** Random whole board: `count` pots (3 main first), shares in basis points totalling 10 000. */
function randomBoard(random: () => number, count: number) {
    const keys = [...MAIN_KEYS, ...OPTIONAL_JAR_KEYS.slice(0, count - 3)];
    return { keys, split: randomComposition(random, keys.length) };
}

function randomComposition(random: () => number, parts: number): number[] {
    const cuts = Array.from({ length: parts - 1 }, () => Math.floor(random() * 10_001)).sort(
        (left, right) => left - right
    );
    const bounds = [0, ...cuts, 10_000];
    return bounds.slice(1).map((bound, index) => bound - bounds[index]!);
}

// ---------------------------------------------------------------------------
// M1: the old formula, derived on its own
// ---------------------------------------------------------------------------

describe('M1 a household that never changed anything reads the old formula', () => {
    for (const potCount of [3, 4, 5, 6, 7, 8]) {
        it(`${potCount} pots, every viewed period from the start to now, to the cent`, async () => {
            const random = seeded(1_000 + potCount);
            const { keys, split } = randomBoard(random, potCount);
            // Shares such as 12.5 and 33.33 included: basis points are arbitrary here.
            const income = 1_000_00 + Math.floor(random() * 9_000_00) + 37;
            const startMonth = '2026-03';
            const setup = build({
                board: keys.map((key, index) => [key, split[index]!] as const),
                createdAt: new Date(`${startMonth}-09T08:00:00Z`),
                sources: [salary(income, '2026-03-01')],
                spentByJar: { [`${HOUSEHOLD_A}-${JarKey.PLAY}`]: 12_345 },
                creditedByJar: { [`${HOUSEHOLD_A}-${JarKey.NECESSITIES}`]: 6_789 },
            });
            const oneMonth = exactSplit(
                income,
                keys.map((key, index) => [key, split[index]!] as const)
            );

            for (let viewed = periodIndex(startMonth); viewed <= periodIndex('2026-11'); viewed++) {
                const months = viewed - periodIndex(startMonth) + 1;
                const rows = await setup.balances(periodFromIndex(viewed));
                for (const key of keys) {
                    const row = rows.find(candidate => candidate.key === key)!;
                    const expected =
                        months * oneMonth.get(key)! +
                        (key === JarKey.NECESSITIES ? 6_789 : 0) -
                        (key === JarKey.PLAY ? 12_345 : 0);
                    expect(row.potBalance, `${key} through ${periodFromIndex(viewed)}`).toBe(
                        expected
                    );
                    expect(row.allocated).toBe(oneMonth.get(key));
                }
            }
        });
    }

    it('reads the same for a household with no share rows at all, 3 to 8 pots', async () => {
        for (const potCount of [3, 5, 8]) {
            const random = seeded(2_000 + potCount);
            const { keys, split } = randomBoard(random, potCount);
            const board = keys.map((key, index) => [key, split[index]!] as const);
            const sources = [salary(2_345_67, '2026-01-01')];
            const createdAt = new Date('2026-01-12T00:00:00Z');
            const withRows = build({ board, createdAt, sources });
            const without = build({ board, createdAt, sources, withShareHistory: false });
            const pick = (rows: BalanceRows) => rows.map(row => [row.key, row.potBalance]);
            expect(pick(await without.balances('2026-11'))).toEqual(
                pick(await withRows.balances('2026-11'))
            );
        }
    });
});

// ---------------------------------------------------------------------------
// M2 + M4 + M5 + M3: seeded random histories through the real write paths
// ---------------------------------------------------------------------------

type Scenario = {
    setup: Setup;
    /** Calendar months of the history, oldest first, through the current one. */
    months: string[];
    /** Model: basis points per pot key, for each month (the intended history). */
    model: Map<string, Map<JarKey, number>>;
    now: () => string;
};

const centDrift = { merge: 0, mergeOthers: 0 };
/** How many of each write the seeded histories exercised (proves the property test is not idle). */
const opStats: Record<string, number> = {};
const countOp = (name: string) => {
    opStats[name] = (opStats[name] ?? 0) + 1;
};

/** The income of a month the way the product defines it (as of the month's last day). */
function incomeOf(setup: Setup, month: string): number {
    const sources: IncomeSourceForNet[] = setup.income.sources.map(row => ({
        amount: Number(row.amount),
        cadence: row.cadence,
        isActive: row.is_active,
        startedOn: row.started_on,
        endsOn: row.ends_on,
        periods: setup.income.periods
            .filter(period => period.income_source_id === row.id)
            .map(period => ({ amount: Number(period.amount), effectiveOn: period.effective_on })),
    }));
    return monthlyNetAsOf(sources, endOfPeriodIso(month));
}

/** Everything the board says, per month, per pot key: cumulative `potBalance` and `allocated`. */
async function readHistory(scenario: Scenario) {
    const history = new Map<string, Map<JarKey, { pot: number; allocated: number }>>();
    for (const month of scenario.months) {
        const rows = await scenario.setup.balances(month);
        history.set(
            month,
            new Map(rows.map(row => [row.key, { pot: row.potBalance, allocated: row.allocated }]))
        );
    }
    return history;
}

type History = Awaited<ReturnType<typeof readHistory>>;

/** The deposit of each pot in month `index`: cumulative now minus cumulative a month earlier. */
function depositOf(history: History, months: string[], index: number, key: JarKey): number {
    const now = history.get(months[index]!)?.get(key)?.pot ?? 0;
    if (index === 0) return now;
    return now - (history.get(months[index - 1]!)?.get(key)?.pot ?? 0);
}

function runScenario(seed: number, monthCount: number) {
    return async () => {
        const random = seeded(seed);
        const lastIndex = periodIndex('2026-11');
        const firstIndex = lastIndex - (monthCount - 1);
        const months = Array.from({ length: monthCount }, (_, offset) =>
            periodFromIndex(firstIndex + offset)
        );
        const { keys, split } = randomBoard(random, 3);
        const amount = 1_500_00 + Math.floor(random() * 5_000_00) + Math.floor(random() * 99);
        const startMonth = months[0]!;
        const setup = build({
            board: keys.map((key, index) => [key, split[index]!] as const),
            createdAt: new Date(`${startMonth}-10T08:00:00Z`),
            sources: [salary(amount, `${startMonth}-01`)],
            periods:
                random() < 0.5
                    ? [
                          {
                              income_source_id: 'salary',
                              amount: String(amount),
                              effective_on: `${startMonth}-01`,
                          },
                      ]
                    : [],
        });
        const model = new Map<string, Map<JarKey, number>>();
        const scenario: Scenario = {
            setup,
            months,
            model,
            now: () => months[Math.min(clockOffset, months.length - 1)]!,
        };
        let clockOffset = 0;
        const orderedKeys = () => setup.jarsOfA().map(jar => jar.key as JarKey);
        const modelNow = () => model.get(scenario.now())!;
        model.set(startMonth, new Map(keys.map((key, index) => [key, split[index]!] as const)));
        let sourceCount = 1;
        // Checks that sit inside branches report here (one unconditional assertion at the end),
        // each with enough text to find the seed, month and pot.
        const problems: string[] = [];
        const check = (ok: boolean, message: string) => {
            if (!ok) problems.push(message);
        };

        const verify = async (before: History | null, op: string) => {
            const label = `seed ${seed} month ${scenario.now()} after ${op}`;
            const current = scenario.now();
            const currentIndex = months.indexOf(current);
            const after = await readHistory(scenario);
            const present = orderedKeys();
            const jarRows = setup.jarsOfA();

            // Conservation (to the cent), no negative deposit, and the model, month by month.
            let incomeSoFar = 0;
            months.slice(0, currentIndex + 1).forEach((month, index) => {
                incomeSoFar += incomeOf(setup, month);
                const potTotal = present.reduce(
                    (sum, key) => sum + (after.get(month)!.get(key)?.pot ?? 0),
                    0
                );
                expect(potTotal, `${label}: conservation through ${month}`).toBe(incomeSoFar);
                const expectedMonth = exactSplit(
                    incomeOf(setup, month),
                    present.map(key => [key, model.get(month)!.get(key) ?? 0] as const)
                );
                for (const key of present) {
                    const deposit = depositOf(after, months, index, key);
                    expect(
                        deposit,
                        `${label}: deposit of ${key} in ${month}`
                    ).toBeGreaterThanOrEqual(0);
                    expect(deposit, `${label}: ${key} in ${month} vs the model`).toBe(
                        expectedMonth.get(key)
                    );
                }
            });

            // M3: the current month's figures are the direct split of the current income.
            const currentIncome = incomeOf(setup, current);
            const direct = exactSplit(
                currentIncome,
                jarRows.map(jar => [jar.key as string, basisPointsOf(jar)] as const)
            );
            for (const row of await setup.balances(current)) {
                const allocated = direct.get(row.key)!;
                const coverage = jarCoverage({ allocated, spent: 0, credited: 0, committedOut: 0 });
                expect(row.allocated, `${label}: allocated ${row.key}`).toBe(allocated);
                expect(row.remaining).toBe(coverage.remaining);
                expect(row.available).toBe(coverage.available);
                expect(row.progress).toBe(coverage.progress);
                expect(row.overspent).toBe(coverage.overspent);
            }

            // M4: every pot's share this month is `jar.percentage`, one row per pot per month.
            const seen = new Set<string>();
            for (const share of setup.sharesOfA()) {
                const key = `${String((share.jar as Row).id)}|${String(share.period)}`;
                expect(seen.has(key), `${label}: duplicate share row ${key}`).toBe(false);
                seen.add(key);
                expect(String(share.period) <= current, `${label}: row after this month`).toBe(
                    true
                );
                expect(jarRows.some(jar => jar.id === (share.jar as Row).id)).toBe(true);
            }
            for (const jar of jarRows) {
                const history = potShareHistory(
                    setup.sharesOfA().filter(row => (row.jar as Row).id === jar.id) as never,
                    jar.percentage as string
                );
                expect(
                    shareBasisPointsAt(history, current),
                    `${label}: ${String(jar.key)} share this month vs jar.percentage`
                ).toBe(basisPointsOf(jar));
            }
            expect(
                jarRows.reduce((sum, jar) => sum + basisPointsOf(jar), 0),
                `${label}: the board totals 100.00`
            ).toBe(10_000);

            // The past is not rewritten.
            if (before && !op.startsWith('deactivate')) {
                for (let index = 0; index < currentIndex; index++) {
                    const month = months[index]!;
                    for (const key of before.get(month)!.keys()) {
                        check(
                            depositOf(after, months, index, key) ===
                                depositOf(before, months, index, key),
                            `${label}: ${key} deposit in past month ${month} changed`
                        );
                    }
                    const added = [...after.get(month)!.keys()].find(
                        key => !before.get(month)!.has(key)
                    );
                    check(
                        !op.startsWith('activate ') ||
                            !added ||
                            depositOf(after, months, index, added) === 0,
                        `${label}: ${String(added)} has a deposit before it was turned on (${month})`
                    );
                }
            }
            return after;
        };

        let history = await verify(null, 'start');

        for (let offset = 0; offset < months.length; offset++) {
            clockOffset = offset;
            vi.setSystemTime(new Date(`${months[offset]}-15T10:00:00Z`));
            if (offset > 0) {
                model.set(months[offset]!, new Map(model.get(months[offset - 1]!)));
                history = await verify(history, 'new month');
            }
            const operations = Math.floor(random() * 3);
            for (let operation = 0; operation < operations; operation++) {
                const kind = random();
                const month = scenario.now();
                const rowsBefore = setup
                    .sharesOfA()
                    .map(row => [(row.jar as Row).id, row.period, row.percentage] as const);
                const presentKeys = orderedKeys();
                const optionalPresent = presentKeys.filter(key => !isMainJarKey(key));
                const optionalAbsent = OPTIONAL_JAR_KEYS.filter(key => !presentKeys.includes(key));

                if (kind < 0.3 && presentKeys.length >= 1) {
                    // updateSplit: a fresh random composition, sometimes the very same board.
                    const same = random() < 0.2;
                    const next = same
                        ? presentKeys.map(key => modelNow().get(key)!)
                        : randomComposition(random, presentKeys.length);
                    await setup.asA(() =>
                        setup.service.updateSplit(
                            presentKeys.map((key, index) => ({
                                jarId: setup.jarsOfA().find(jar => jar.key === key)!.id,
                                percentage: next[index]! / 100,
                            }))
                        )
                    );
                    presentKeys.forEach((key, index) => modelNow().set(key, next[index]!));
                    check(
                        !same || setup.sharesOfA().length === rowsBefore.length,
                        `seed ${seed}: saving an untouched split added a row`
                    );
                    countOp(same ? 'updateSplit same' : 'updateSplit');
                    history = await verify(history, `updateSplit${same ? ' (same)' : ''}`);
                } else if (kind < 0.55 && optionalAbsent.length > 0) {
                    const key = optionalAbsent[Math.floor(random() * optionalAbsent.length)]!;
                    const shareBp = OPTIONAL_JAR_SHARE[key] * 100;
                    const mainKey = mainJarKeyFor(key);
                    if (modelNow().get(mainKey)! - shareBp <= 0) {
                        const refusal = await setup
                            .asA(() => setup.service.activate(key))
                            .then(
                                () => null,
                                (error: { response?: { message?: string } }) => error
                            );
                        check(
                            refusal?.response?.message === 'jar_share_too_small',
                            `seed ${seed}: activating ${key} on too small a main pot was not refused`
                        );
                        countOp('activate refused');
                        history = await verify(history, 'activate refused');
                    } else {
                        await setup.asA(() => setup.service.activate(key));
                        modelNow().set(mainKey, modelNow().get(mainKey)! - shareBp);
                        modelNow().set(key, shareBp);
                        countOp('activate');
                        history = await verify(history, `activate ${key}`);
                    }
                } else if (kind < 0.75 && optionalPresent.length > 0) {
                    const key = optionalPresent[Math.floor(random() * optionalPresent.length)]!;
                    const mainKey = mainJarKeyFor(key);
                    const before = history;
                    const id = setup.jarsOfA().find(jar => jar.key === key)!.id;
                    await setup.asA(() => setup.service.deactivate(id));
                    for (const monthModel of model.values()) {
                        monthModel.set(
                            mainKey,
                            (monthModel.get(mainKey) ?? 0) + (monthModel.get(key) ?? 0)
                        );
                        monthModel.delete(key);
                    }
                    countOp('deactivate');
                    history = await verify(history, `deactivate ${key}`);
                    // What a turn-off can move in the past: only the remainder cents.
                    const currentIndex = months.indexOf(month);
                    for (let index = 0; index < currentIndex; index++) {
                        const bothBefore =
                            depositOf(before, months, index, mainKey) +
                            depositOf(before, months, index, key);
                        const mainAfter = depositOf(history, months, index, mainKey);
                        centDrift.merge = Math.max(
                            centDrift.merge,
                            Math.abs(mainAfter - bothBefore)
                        );
                        let totalBefore = 0;
                        let totalAfter = 0;
                        for (const other of before.get(months[index]!)!.keys()) {
                            totalBefore += depositOf(before, months, index, other);
                            if (other !== key && other !== mainKey) {
                                centDrift.mergeOthers = Math.max(
                                    centDrift.mergeOthers,
                                    Math.abs(
                                        depositOf(history, months, index, other) -
                                            depositOf(before, months, index, other)
                                    )
                                );
                            }
                        }
                        for (const other of history.get(months[index]!)!.keys()) {
                            totalAfter += depositOf(history, months, index, other);
                        }
                        // The household total of a past month is exact, always.
                        check(
                            totalAfter === totalBefore,
                            `seed ${seed}: deactivate changed the total of ${months[index]}`
                        );
                    }
                } else {
                    // Income change from this month on (never a past month).
                    const day = [1, 15, 28][Math.floor(random() * 3)]!;
                    const date = `${month}-${String(day).padStart(2, '0')}`;
                    const incomeKind = random();
                    const live = setup.income.sources.filter(
                        row => row.is_active && (!row.ends_on || row.ends_on >= date)
                    );
                    if (incomeKind < 0.5 && live.length > 0) {
                        const target = live[Math.floor(random() * live.length)]!;
                        const raised = Math.floor(Number(target.amount) * (0.5 + random()) + 1);
                        if (!setup.income.periods.some(row => row.income_source_id === target.id)) {
                            setup.income.periods.push({
                                income_source_id: target.id,
                                amount: target.amount,
                                effective_on: target.started_on ?? `${startMonth}-01`,
                            });
                        }
                        target.amount = String(raised);
                        setup.income.periods.push({
                            income_source_id: target.id,
                            amount: String(raised),
                            effective_on: date,
                        });
                    } else if (incomeKind < 0.8) {
                        sourceCount += 1;
                        setup.income.sources.push({
                            id: `extra-${sourceCount}`,
                            amount: String(100_00 + Math.floor(random() * 900_00) + 1),
                            cadence: [Cadence.MONTHLY, Cadence.WEEKLY, Cadence.YEARLY][
                                Math.floor(random() * 3)
                            ]!,
                            is_active: true,
                            started_on: date,
                            ends_on: null,
                        });
                    } else if (live.length > 0) {
                        // An income that ends from now on: it stops counting after its end date.
                        live[Math.floor(random() * live.length)]!.ends_on = date;
                    }
                    countOp('income change');
                    history = await verify(history, 'income change');
                }
            }
        }
        return problems;
    };
}

describe('M2 M4 M5 seeded random histories (updateSplit / activate / deactivate / income)', () => {
    // 1 to 60 months, boards that grow from 3 up to 8 pots.
    const scenarios: Array<[number, number]> = [
        [11, 1],
        [12, 2],
        [13, 6],
        [14, 13],
        [15, 24],
        [16, 36],
        [17, 48],
        [18, 60],
        [19, 60],
        [20, 17],
    ];
    for (const [seed, monthCount] of scenarios) {
        it(
            `seed ${seed}, ${monthCount} month(s)`,
            async () => expect(await runScenario(seed, monthCount)()).toEqual([]),
            240_000
        );
    }

    it('reports the cents a turn-off can move in earlier months', () => {
        // Evidence for M5. The remainder rule is what moves them, never more than the pots
        // minus one per month; the household total of every past month stayed exact (asserted
        // above after every deactivate).
        console.info(
            `deactivate: main pot vs both pots, max cents per past month: ${centDrift.merge}; ` +
                `other pots, max cents per past month: ${centDrift.mergeOthers}`
        );
        console.info(`operations exercised: ${JSON.stringify(opStats)}`);
        for (const name of [
            'updateSplit',
            'updateSplit same',
            'activate',
            'deactivate',
            'income change',
        ]) {
            expect(opStats[name] ?? 0, `${name} was exercised`).toBeGreaterThan(0);
        }
        expect(centDrift.merge).toBeLessThanOrEqual(7);
        expect(centDrift.mergeOthers).toBeLessThanOrEqual(7);
    });
});

// ---------------------------------------------------------------------------
// M7 edge cases
// ---------------------------------------------------------------------------

describe('M7 edges of period and shares', () => {
    const board = [
        [JarKey.NECESSITIES, 5_500],
        [JarKey.LONG_TERM_SAVINGS, 2_000],
        [JarKey.PLAY, 2_500],
    ] as const;

    it('a household that started this month has one month of deposit', async () => {
        const setup = build({
            board,
            createdAt: new Date('2026-11-02T00:00:00Z'),
            sources: [salary(2_500_00, '2026-11-01')],
        });
        const rows = await setup.balances('2026-11');
        expect(rows.map(row => row.potBalance)).toEqual([1_375_00, 500_00, 625_00]);
    });

    it('a period before the household started reads one month, like before (unchanged semantics)', async () => {
        const setup = build({
            board,
            createdAt: new Date('2026-05-02T00:00:00Z'),
            sources: [salary(2_500_00, '2026-01-01')],
        });
        const rows = await setup.balances('2026-02');
        expect(rows.map(row => row.potBalance)).toEqual([1_375_00, 500_00, 625_00]);
    });

    it('a period in the future grows the live pot by the months ahead at this month’s deposit', async () => {
        const setup = build({
            board,
            createdAt: new Date('2026-05-02T00:00:00Z'),
            sources: [salary(2_500_00, '2026-05-01')],
        });
        const now = await setup.balances('2026-11');
        const ahead = await setup.balances('2027-03'); // Dec, Jan, Feb, Mar = 4 months ahead
        ahead.forEach((row, index) => {
            expect(row.potBalance).toBe(now[index]!.potBalance + 4 * now[index]!.allocated);
            // Stacked allocation = 5 months (this one + 4) of the live deposit.
            expect(row.allocated).toBe(5 * now[index]!.allocated);
        });
    });

    it('a past month whose shares do not total 100 does not crash and invents no money', async () => {
        const setup = build({
            board,
            createdAt: new Date('2026-08-02T00:00:00Z'),
            sources: [salary(1_000_00, '2026-08-01')],
        });
        const shareRow = (id: string, key: JarKey, period: string, percentage: string) => ({
            id,
            household: HOUSEHOLD_A,
            jar: setup.jarsOfA().find(row => row.key === key)!,
            period,
            percentage,
        });
        setup.tables.get(JarShare)!.push(
            // September: Necessities 40 % -> the month totals 85 %.
            shareRow('short', JarKey.NECESSITIES, '2026-09', '40.00'),
            // October: back to 55 %, but Play 70 % -> the month totals 145 %.
            shareRow('back', JarKey.NECESSITIES, '2026-10', '55.00'),
            shareRow('over', JarKey.PLAY, '2026-10', '70.00'),
            // November (this month): Play back to 25 %.
            shareRow('fixed', JarKey.PLAY, '2026-11', '25.00')
        );
        const [september, october, november] = await Promise.all(
            ['2026-09', '2026-10', '2026-11'].map(period => setup.balances(period))
        );
        for (const rows of [september!, october!, november!]) {
            for (const row of rows) {
                expect(Number.isInteger(row.potBalance)).toBe(true);
                expect(Number.isInteger(row.allocated)).toBe(true);
                expect(row.allocated).toBeGreaterThanOrEqual(0);
            }
        }
        const total = (rows: BalanceRows) => rows.reduce((sum, row) => sum + row.allocated, 0);
        // Short month: what the shares say, rounded down; the 15 % nobody claims goes to no pot.
        expect(september!.find(row => row.key === JarKey.NECESSITIES)!.allocated).toBe(400_00);
        expect(total(september!)).toBe(850_00);
        // Month over 100 %: the income is allocated exactly, never more (nothing invented).
        expect(total(october!)).toBe(1_000_00);
        // A whole month is exact as always.
        expect(total(november!)).toBe(1_000_00);
        // The running balance is the sum of those months: Aug whole + Sep short + Oct scaled + Nov whole.
        expect(november!.reduce((sum, row) => sum + row.potBalance, 0)).toBe(
            1_000_00 + 850_00 + 1_000_00 + 1_000_00
        );
    });

    it('never reads another household’s share rows, even with rows for the same keys and periods', async () => {
        const setup = build({
            board,
            createdAt: new Date('2026-09-02T00:00:00Z'),
            sources: [salary(1_000_00, '2026-09-01')],
        });
        setup.tables.get(JarShare)!.push({
            id: 'foreign',
            household: HOUSEHOLD_B,
            jar: setup.tables.get(Jar)!.find(row => row.id === `${HOUSEHOLD_B}-${JarKey.PLAY}`)!,
            period: '2026-10',
            percentage: '99.00',
        });
        const rows = await setup.balances('2026-11');
        expect(rows.find(row => row.key === JarKey.PLAY)!.potBalance).toBe(3 * 250_00);
    });

    it('long history: 600 months in the same number of queries, fast, and across year boundaries', async () => {
        const long = build({
            board,
            createdAt: new Date('1976-12-05T00:00:00Z'),
            sources: [salary(2_500_00, '1976-12-01')],
        });
        const short = build({
            board,
            createdAt: new Date('2026-05-05T00:00:00Z'),
            sources: [salary(2_500_00, '2026-05-01')],
        });
        // 1976-12 .. 2026-11 = 600 months, spanning 50 year boundaries.
        const started = performance.now();
        const longRows = await long.balances('2026-11');
        const elapsed = performance.now() - started;
        await short.balances('2026-11');
        const queries = (setup: Setup) =>
            setup.em.find.mock.calls.length +
            setup.em.findOne.mock.calls.length +
            setup.em.getConnection().execute.mock.calls.length;
        expect(queries(long)).toBe(queries(short));
        expect(elapsed).toBeLessThan(500);
        expect(longRows.map(row => row.potBalance)).toEqual([
            600 * 1_375_00,
            600 * 500_00,
            600 * 625_00,
        ]);
    });

    it('a split changed in December and again in January keeps December’s row (year boundary)', async () => {
        const setup = build({
            board,
            createdAt: new Date('2026-10-05T00:00:00Z'),
            sources: [salary(2_000_00, '2026-10-01')],
        });
        const jarId = (key: JarKey) => setup.jarId(key);
        const split = (necessities: number, savings: number, play: number) => [
            { jarId: jarId(JarKey.NECESSITIES), percentage: necessities },
            { jarId: jarId(JarKey.LONG_TERM_SAVINGS), percentage: savings },
            { jarId: jarId(JarKey.PLAY), percentage: play },
        ];
        vi.setSystemTime(new Date('2026-12-20T10:00:00Z'));
        await setup.asA(() => setup.service.updateSplit(split(50, 25, 25)));
        await setup.asA(() => setup.service.updateSplit(split(45, 25, 30))); // same month again
        const december = setup
            .sharesOfA()
            .filter(row => row.period === '2026-12')
            .map(row => [(row.jar as Row).key, row.percentage]);
        expect(december).toHaveLength(3);
        expect(december).toEqual(
            expect.arrayContaining([
                [JarKey.NECESSITIES, '45.00'],
                [JarKey.PLAY, '30.00'],
            ])
        );
        vi.setSystemTime(new Date('2027-01-10T10:00:00Z'));
        await setup.asA(() => setup.service.updateSplit(split(40, 30, 30)));
        const periods = setup
            .sharesOfA()
            .filter(row => (row.jar as Row).key === JarKey.NECESSITIES)
            .map(row => [row.period, row.percentage]);
        expect(periods).toEqual([
            [JAR_SHARE_BASELINE_PERIOD, '55.00'],
            ['2026-12', '45.00'],
            ['2027-01', '40.00'],
        ]);
        // Oct, Nov at 55 %; Dec at 45 %; Jan at 40 % of 2 000.
        const rows = await setup.balances('2027-01');
        expect(rows.find(row => row.key === JarKey.NECESSITIES)!.potBalance).toBe(
            2 * 1_100_00 + 900_00 + 800_00
        );
    });
});

// ---------------------------------------------------------------------------
// D1: history that drifted from `jar.percentage` (deploy window)
// ---------------------------------------------------------------------------

describe('D1 the current month follows jar.percentage when the share rows drifted from it', () => {
    /**
     * The migration has run (one baseline row per pot) but an old backend instance, which does
     * not know `money_jar_share`, is still serving: it turns Daily on by changing the main pot's
     * percentage and creating the pot, and writes no share row. `jar.percentage` is the cached
     * current split everywhere else (and `deactivate` says "the cached percentage wins"), so
     * this month's board must still total the income.
     */
    it('this month’s pots add up to the income after an old instance turned a pot on', async () => {
        const setup = build({
            board: [
                [JarKey.NECESSITIES, 5_500],
                [JarKey.LONG_TERM_SAVINGS, 2_000],
                [JarKey.PLAY, 2_500],
            ],
            createdAt: new Date('2026-05-02T00:00:00Z'),
            sources: [salary(2_500_00, '2026-05-01')],
        });
        // What the old code did: Necessities 55 -> 35, a Daily pot at 20, no share rows.
        setup.jarsOfA().find(row => row.key === JarKey.NECESSITIES)!.percentage = '35.00';
        setup.tables.get(Jar)!.push(jarRow(HOUSEHOLD_A, JarKey.DAILY, 2_000, 5));

        const rows = await setup.balances('2026-11');

        expect(rows.reduce((sum, row) => sum + row.allocated, 0)).toBe(2_500_00);
        expect(rows.find(row => row.key === JarKey.NECESSITIES)!.allocated).toBe(875_00);
    });
});

describe('D1b every write path repairs the drift and keeps the past whole', () => {
    function drifted() {
        const setup = build({
            board: [
                [JarKey.NECESSITIES, 5_500],
                [JarKey.LONG_TERM_SAVINGS, 2_000],
                [JarKey.PLAY, 2_500],
            ],
            createdAt: new Date('2026-05-02T00:00:00Z'),
            sources: [salary(2_500_00, '2026-05-01')],
        });
        // The old instance turned Daily on: Necessities 55 -> 35, Daily 20, no share rows.
        setup.jarsOfA().find(row => row.key === JarKey.NECESSITIES)!.percentage = '35.00';
        setup.tables.get(Jar)!.push(jarRow(HOUSEHOLD_A, JarKey.DAILY, 2_000, 5));
        return setup;
    }

    const writes: Array<[string, (setup: Setup) => Promise<unknown>]> = [
        [
            'updateSplit with the very same board',
            setup =>
                setup.asA(() =>
                    setup.service.updateSplit(
                        setup.jarsOfA().map(row => ({
                            jarId: row.id,
                            percentage: Number(row.percentage),
                        }))
                    )
                ),
        ],
        ['activate GIVE', setup => setup.asA(() => setup.service.activate(JarKey.GIVE))],
        [
            'deactivate DAILY',
            setup =>
                setup.asA(() =>
                    setup.service.deactivate(
                        setup.jarsOfA().find(row => row.key === JarKey.DAILY)!.id
                    )
                ),
        ],
    ];
    for (const [name, write] of writes) {
        it(`${name}: this month's rows equal jar.percentage, one row per pot per month, past months total the income`, async () => {
            const setup = drifted();
            await write(setup);

            const keys = new Set<string>();
            for (const share of setup.sharesOfA()) {
                const key = `${String((share.jar as Row).id)}|${String(share.period)}`;
                expect(keys.has(key), `duplicate row ${key}`).toBe(false);
                keys.add(key);
            }
            for (const jar of setup.jarsOfA()) {
                const own = setup
                    .sharesOfA()
                    .filter(row => (row.jar as Row).id === jar.id)
                    .sort((left, right) => String(left.period).localeCompare(String(right.period)));
                expect(own.length, `${String(jar.key)} has rows`).toBeGreaterThan(0);
                expect(own.at(-1)!.percentage, `${String(jar.key)} latest row`).toBe(
                    jar.percentage
                );
            }
            // Every viewed month from the start: the pots add up to the income of the months so far.
            for (const [index, period] of ['2026-05', '2026-06', '2026-10', '2026-11'].entries()) {
                const months = [1, 2, 6, 7][index]!;
                const rows = await setup.balances(period);
                expect(
                    rows.reduce((sum, row) => sum + row.potBalance, 0),
                    `through ${period}`
                ).toBe(months * 2_500_00);
            }
        });
    }
});
