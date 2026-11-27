import { describe, expect, it } from 'vitest';

import { Cadence } from '@rumtelo/contracts';
import {
    allocateByPercentage,
    endOfPeriodIso,
    monthlyNetAsOf,
    type IncomeSourceForNet,
} from '@rumtelo/utils';

import { incomeChangePeriods } from './income-history.util';
import { JAR_SHARE_BASELINE_PERIOD } from './jar-share.entity';
import {
    allocateMonth,
    cumulativeDepositsByPot,
    healedShareHistory,
    mergeShareHistories,
    periodFromIndex,
    periodIndex,
    potShareHistory,
    shareBasisPointsAt,
    type PotShare,
} from './jar-share.util';

/** Seeded generator (mulberry32): the same numbers on every run, no flaky property test. */
function seeded(seed: number) {
    let state = seed;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
        mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
    };
}

const history = (...entries: Array<[string, number]>): PotShare[] =>
    entries.map(([period, basisPoints]) => ({ period, basisPoints }));

const salary = (amount: number, extra: Partial<IncomeSourceForNet> = {}): IncomeSourceForNet => ({
    amount,
    cadence: Cadence.MONTHLY,
    isActive: true,
    startedOn: '2026-01-01',
    endsOn: null,
    periods: [],
    ...extra,
});

/** Months 2026-01 … `through`, one by one: the reference the segment walk must equal. */
function bruteForce(input: {
    from: string;
    through: string;
    pots: { id: string; history: PotShare[] }[];
    sources: IncomeSourceForNet[];
}) {
    const totals = new Map(input.pots.map(pot => [pot.id, 0]));
    for (let index = periodIndex(input.from); index <= periodIndex(input.through); index += 1) {
        const period = periodFromIndex(index);
        const income = monthlyNetAsOf(input.sources, endOfPeriodIso(period));
        for (const row of allocateMonth(
            income,
            input.pots.map(pot => ({
                id: pot.id,
                basisPoints: shareBasisPointsAt(pot.history, period),
            }))
        )) {
            totals.set(row.id, (totals.get(row.id) ?? 0) + row.amount);
        }
    }
    return totals;
}

function deposits(input: {
    from: string;
    through: string;
    pots: { id: string; history: PotShare[] }[];
    sources: IncomeSourceForNet[];
}) {
    return cumulativeDepositsByPot({
        fromPeriod: input.from,
        throughPeriod: input.through,
        pots: input.pots,
        incomeAsOfPeriod: period => monthlyNetAsOf(input.sources, endOfPeriodIso(period)),
        incomeChangePeriods: incomeChangePeriods(input.sources),
    });
}

describe('period index', () => {
    it('round-trips every month across a year boundary', () => {
        for (const period of ['2025-12', '2026-01', '2026-11', '1970-01']) {
            expect(periodFromIndex(periodIndex(period))).toBe(period);
        }
        expect(periodIndex('2026-01') - periodIndex('2025-12')).toBe(1);
    });
});

describe('shareBasisPointsAt', () => {
    const board = history([JAR_SHARE_BASELINE_PERIOD, 5500], ['2026-09', 3500], ['2026-11', 3000]);

    it('reads the row with the greatest period at or before the month', () => {
        expect(shareBasisPointsAt(board, '2026-08')).toBe(5500);
        expect(shareBasisPointsAt(board, '2026-09')).toBe(3500);
        expect(shareBasisPointsAt(board, '2026-10')).toBe(3500);
        expect(shareBasisPointsAt(board, '2030-01')).toBe(3000);
    });

    it('is 0 before the pot existed', () => {
        expect(shareBasisPointsAt(history(['2026-09', 2000]), '2026-08')).toBe(0);
        expect(shareBasisPointsAt([], '2026-08')).toBe(0);
    });
});

describe('potShareHistory', () => {
    it('sorts rows oldest first and reads decimal strings in basis points', () => {
        expect(
            potShareHistory(
                [
                    { period: '2026-11', percentage: '12.50' },
                    { period: JAR_SHARE_BASELINE_PERIOD, percentage: '20.00' },
                ],
                '12.50'
            )
        ).toEqual(history([JAR_SHARE_BASELINE_PERIOD, 2000], ['2026-11', 1250]));
    });

    it('falls back to a baseline of the current percentage for a pot with no rows', () => {
        expect(potShareHistory([], '29.05')).toEqual(history([JAR_SHARE_BASELINE_PERIOD, 2905]));
        expect(potShareHistory(undefined, 25)).toEqual(history([JAR_SHARE_BASELINE_PERIOD, 2500]));
    });
});

describe('allocateMonth', () => {
    it('hands the rounding remainder to the largest share, so the pots add up to the income', () => {
        const rows = allocateMonth(100_01, [
            { id: 'a', basisPoints: 5500 },
            { id: 'b', basisPoints: 2000 },
            { id: 'c', basisPoints: 2500 },
        ]);
        expect(rows.reduce((total, row) => total + row.amount, 0)).toBe(100_01);
        expect(rows).toEqual(
            allocateByPercentage(100_01, [
                { id: 'a', percentage: 55 },
                { id: 'b', percentage: 20 },
                { id: 'c', percentage: 25 },
            ])
        );
    });

    it('gives what the shares say, and does not crash, when they do not total 100 %', () => {
        const rows = allocateMonth(100_00, [
            { id: 'a', basisPoints: 5000 },
            { id: 'b', basisPoints: 2000 },
            { id: 'c', basisPoints: 0 },
        ]);
        expect(rows).toEqual([
            { id: 'a', amount: 50_00 },
            { id: 'b', amount: 20_00 },
            { id: 'c', amount: 0 },
        ]);
        expect(allocateMonth(100_00, [])).toEqual([]);
    });
});

describe('cumulativeDepositsByPot', () => {
    const THREE_POTS = [
        { id: 'basics', history: history([JAR_SHARE_BASELINE_PERIOD, 5500]) },
        { id: 'future', history: history([JAR_SHARE_BASELINE_PERIOD, 2000]) },
        { id: 'free', history: history([JAR_SHARE_BASELINE_PERIOD, 2500]) },
    ];

    it('equals months × this month’s allocation for a household whose split and income never changed (the old formula)', () => {
        const sources = [salary(2_500_00, { startedOn: '2026-05-01' })];
        const result = deposits({ from: '2026-05', through: '2026-11', pots: THREE_POTS, sources });

        const thisMonth = allocateByPercentage(2_500_00, [
            { id: 'basics', percentage: 55 },
            { id: 'future', percentage: 20 },
            { id: 'free', percentage: 25 },
        ]);
        const monthCount = 7;
        for (const row of thisMonth) {
            expect(result.get(row.id)).toBe(monthCount * row.amount);
        }
    });

    it('equals the old formula across many unchanged households (income, start month, pot count)', () => {
        const random = seeded(7);
        for (let round = 0; round < 60; round += 1) {
            const potCount = 3 + Math.floor(random() * 6);
            // Random shares that total exactly 10 000 bp.
            const cuts = Array.from({ length: potCount - 1 }, () =>
                Math.floor(random() * 10_000)
            ).sort((left, right) => left - right);
            const bounds = [0, ...cuts, 10_000];
            const pots = bounds.slice(1).map((bound, index) => ({
                id: `pot-${index}`,
                history: history([JAR_SHARE_BASELINE_PERIOD, bound - bounds[index]!]),
            }));
            const income = Math.floor(random() * 900_000) + 1;
            const monthCount = 1 + Math.floor(random() * 40);
            const through = periodFromIndex(periodIndex('2026-01') + monthCount - 1);
            const result = deposits({
                from: '2026-01',
                through,
                pots,
                sources: [salary(income)],
            });

            const old = allocateByPercentage(
                income,
                pots.map(pot => ({ id: pot.id, percentage: pot.history[0]!.basisPoints / 100 }))
            );
            for (const row of old) expect(result.get(row.id)).toBe(monthCount * row.amount);
        }
    });

    it('does not re-price earlier months when the split changes this month', () => {
        const sources = [salary(3_000_00)];
        const before = deposits({ from: '2026-01', through: '2026-10', pots: THREE_POTS, sources });
        const changed = [
            {
                id: 'basics',
                history: history([JAR_SHARE_BASELINE_PERIOD, 5500], ['2026-11', 4500]),
            },
            {
                id: 'future',
                history: history([JAR_SHARE_BASELINE_PERIOD, 2000], ['2026-11', 3000]),
            },
            { id: 'free', history: THREE_POTS[2]!.history },
        ];

        // Through October nothing moved; November alone is repriced.
        const throughOctober = deposits({
            from: '2026-01',
            through: '2026-10',
            pots: changed,
            sources,
        });
        expect([...throughOctober]).toEqual([...before]);
        const throughNovember = deposits({
            from: '2026-01',
            through: '2026-11',
            pots: changed,
            sources,
        });
        expect(throughNovember.get('basics')).toBe(10 * 1_650_00 + 1_350_00);
        expect(throughNovember.get('future')).toBe(10 * 600_00 + 900_00);
    });

    it('starts a pot turned on this month at 0 for every past month, and the main pot keeps its past', () => {
        const sources = [salary(2_000_00)];
        const pots = [
            {
                id: 'basics',
                history: history([JAR_SHARE_BASELINE_PERIOD, 5500], ['2026-11', 3500]),
            },
            { id: 'daily', history: history(['2026-11', 2000]) },
            { id: 'future', history: history([JAR_SHARE_BASELINE_PERIOD, 2000]) },
            { id: 'free', history: history([JAR_SHARE_BASELINE_PERIOD, 2500]) },
        ];

        const throughOctober = deposits({ from: '2026-05', through: '2026-10', pots, sources });
        expect(throughOctober.get('daily')).toBe(0);
        expect(throughOctober.get('basics')).toBe(6 * 1_100_00);

        const throughNovember = deposits({ from: '2026-05', through: '2026-11', pots, sources });
        expect(throughNovember.get('daily')).toBe(400_00);
        expect(throughNovember.get('basics')).toBe(6 * 1_100_00 + 700_00);
    });

    it('uses the income of each month: a raise in month 4 leaves months 1 to 3 at the old income', () => {
        const sources = [
            salary(2_000_00, {
                startedOn: '2026-01-01',
                periods: [
                    { amount: 2_000_00, effectiveOn: '2026-01-01' },
                    { amount: 3_000_00, effectiveOn: '2026-04-01' },
                ],
            }),
        ];
        const result = deposits({ from: '2026-01', through: '2026-06', pots: THREE_POTS, sources });

        // 3 months at 2 000 and 3 months at 3 000: Basics takes 55 % of each.
        expect(result.get('basics')).toBe(3 * 1_100_00 + 3 * 1_650_00);
        const total = [...result.values()].reduce((sum, value) => sum + value, 0);
        expect(total).toBe(3 * 2_000_00 + 3 * 3_000_00);
    });

    it('counts months before the first income as 0 and stops at the end of an ended source', () => {
        const sources = [salary(1_000_00, { startedOn: '2026-03-15', endsOn: '2026-05-10' })];
        const result = deposits({ from: '2026-01', through: '2026-08', pots: THREE_POTS, sources });

        // March (as of 31 March the source runs) and April count; May ends on the 10th: gone.
        const total = [...result.values()].reduce((sum, value) => sum + value, 0);
        expect(total).toBe(2 * 1_000_00);
    });

    it('a pot with no rows at all reads as its current percentage since the start (fallback)', () => {
        const sources = [salary(1_000_00)];
        const fallback = potShareHistory([], '40.00');
        const result = deposits({
            from: '2026-01',
            through: '2026-04',
            pots: [
                { id: 'fallback', history: fallback },
                { id: 'other', history: history([JAR_SHARE_BASELINE_PERIOD, 6000]) },
            ],
            sources,
        });
        expect(result.get('fallback')).toBe(4 * 400_00);
        expect(result.get('other')).toBe(4 * 600_00);
    });

    it('allocates what the shares say for a month that does not total 100 %, without throwing', () => {
        const sources = [salary(1_000_00)];
        const pots = [
            { id: 'a', history: history([JAR_SHARE_BASELINE_PERIOD, 5000]) },
            { id: 'b', history: history([JAR_SHARE_BASELINE_PERIOD, 2000], ['2026-03', 3000]) },
        ];
        expect(() =>
            deposits({ from: '2026-01', through: '2026-04', pots, sources })
        ).not.toThrow();
        const result = deposits({ from: '2026-01', through: '2026-04', pots, sources });
        expect(result.get('a')).toBe(4 * 500_00);
        // Two months at 20 %, then two at 30 %: floored, and no remainder invented onto a pot.
        expect(result.get('b')).toBe(2 * 200_00 + 2 * 300_00);
    });

    it('clamps a start after the viewed month to that month', () => {
        const result = deposits({
            from: '2027-01',
            through: '2026-11',
            pots: THREE_POTS,
            sources: [salary(1_000_00)],
        });
        expect([...result.values()].reduce((sum, value) => sum + value, 0)).toBe(1_000_00);
    });

    it('the pots add up to the income of every month, to the cent, for 3 to 8 pots over random changes', () => {
        const random = seeded(2026);
        for (let round = 0; round < 80; round += 1) {
            const potCount = 3 + Math.floor(random() * 6);
            const months = 6 + Math.floor(random() * 30);
            const through = periodFromIndex(periodIndex('2024-01') + months - 1);

            // Every pot gets a share history with a few changes; each month's shares are
            // re-dealt so they always total 100 %, as the writes guarantee.
            const changeMonths = [
                ...new Set(
                    Array.from({ length: 1 + Math.floor(random() * 4) }, () =>
                        periodFromIndex(periodIndex('2024-01') + Math.floor(random() * months))
                    )
                ),
            ].sort();
            const rowsByPot: PotShare[][] = Array.from({ length: potCount }, () => []);
            for (const period of [JAR_SHARE_BASELINE_PERIOD, ...changeMonths]) {
                const cuts = Array.from({ length: potCount - 1 }, () =>
                    Math.floor(random() * 10_001)
                ).sort((left, right) => left - right);
                const bounds = [0, ...cuts, 10_000];
                rowsByPot.forEach((rows, index) =>
                    rows.push({ period, basisPoints: bounds[index + 1]! - bounds[index]! })
                );
            }
            const pots = rowsByPot.map((rows, index) => ({ id: `pot-${index}`, history: rows }));

            // Income with a raise somewhere and a second source that starts later.
            const raiseMonth = periodFromIndex(
                periodIndex('2024-01') + Math.floor(random() * months)
            );
            const sources = [
                salary(Math.floor(random() * 500_000) + 1, {
                    startedOn: '2024-01-01',
                    periods: [
                        { amount: Math.floor(random() * 500_000) + 1, effectiveOn: '2024-01-01' },
                        {
                            amount: Math.floor(random() * 500_000) + 1,
                            effectiveOn: `${raiseMonth}-15`,
                        },
                    ],
                }),
                salary(Math.floor(random() * 90_000), {
                    startedOn: `${periodFromIndex(periodIndex('2024-01') + Math.floor(random() * months))}-20`,
                }),
            ];

            const result = deposits({ from: '2024-01', through, pots, sources });
            let expectedIncome = 0;
            for (let index = 0; index < months; index += 1) {
                expectedIncome += monthlyNetAsOf(
                    sources,
                    endOfPeriodIso(periodFromIndex(periodIndex('2024-01') + index))
                );
            }
            expect([...result.values()].reduce((sum, value) => sum + value, 0)).toBe(
                expectedIncome
            );
            // Segments equal the month-by-month walk, pot by pot.
            expect([...result]).toEqual([
                ...bruteForce({ from: '2024-01', through, pots, sources }),
            ]);
        }
    });
});

describe('incomeChangePeriods', () => {
    it('lists the month of every date on a source and the month after it, oldest first', () => {
        expect(
            incomeChangePeriods([
                salary(1, {
                    startedOn: '2026-01-15',
                    endsOn: '2026-12-31',
                    periods: [{ amount: 2, effectiveOn: '2026-04-01' }],
                }),
            ])
        ).toEqual(['2026-01', '2026-02', '2026-04', '2026-05', '2026-12', '2027-01']);
    });

    it('ignores missing dates', () => {
        expect(incomeChangePeriods([salary(1, { startedOn: null, periods: [] })])).toEqual([]);
    });
});

describe('mergeShareHistories', () => {
    it('adds the removed pot onto the main pot period by period and always covers the current month', () => {
        const main = history([JAR_SHARE_BASELINE_PERIOD, 5500], ['2026-09', 3500]);
        const removed = history(['2026-09', 1500], ['2026-10', 2000]);

        expect(mergeShareHistories(main, removed, '2026-11')).toEqual(
            history(
                [JAR_SHARE_BASELINE_PERIOD, 5500],
                ['2026-09', 5000],
                ['2026-10', 5500],
                ['2026-11', 5500]
            )
        );
    });

    it('keeps the main pot’s cumulative deposit equal to what both pots had when no cent is rounded', () => {
        const sources = [salary(2_000_00)];
        const main = history([JAR_SHARE_BASELINE_PERIOD, 5500], ['2026-09', 3500]);
        const removed = history(['2026-09', 2000]);
        const others = [
            { id: 'future', history: history([JAR_SHARE_BASELINE_PERIOD, 2000]) },
            { id: 'free', history: history([JAR_SHARE_BASELINE_PERIOD, 2500]) },
        ];

        const before = deposits({
            from: '2026-05',
            through: '2026-11',
            pots: [{ id: 'basics', history: main }, { id: 'daily', history: removed }, ...others],
            sources,
        });
        const after = deposits({
            from: '2026-05',
            through: '2026-11',
            pots: [
                { id: 'basics', history: mergeShareHistories(main, removed, '2026-11') },
                ...others,
            ],
            sources,
        });

        expect(after.get('basics')).toBe(before.get('basics')! + before.get('daily')!);
        expect(after.get('future')).toBe(before.get('future'));
    });

    it('stays within the rounding of a few cents per month when shares do not divide the income', () => {
        const sources = [salary(2_345_67)];
        const main = history([JAR_SHARE_BASELINE_PERIOD, 3333]);
        const removed = history([JAR_SHARE_BASELINE_PERIOD, 1667]);
        const free = { id: 'free', history: history([JAR_SHARE_BASELINE_PERIOD, 5000]) };
        const months = 12;
        const through = periodFromIndex(periodIndex('2026-01') + months - 1);

        const before = deposits({
            from: '2026-01',
            through,
            pots: [{ id: 'basics', history: main }, { id: 'daily', history: removed }, free],
            sources,
        });
        const after = deposits({
            from: '2026-01',
            through,
            pots: [{ id: 'basics', history: mergeShareHistories(main, removed, through) }, free],
            sources,
        });

        const difference = Math.abs(
            after.get('basics')! - (before.get('basics')! + before.get('daily')!)
        );
        expect(difference).toBeLessThanOrEqual(months * 2);
        // The household total is still exactly the income.
        const total = [...after.values()].reduce((sum, value) => sum + value, 0);
        expect(total).toBe(months * 2_345_67);
    });
});

/**
 * Deploy-window drift (SP3-H M1): the old backend can still activate, deactivate or save a split
 * after the table exists, and it writes no share rows. Reads must never invent money from that.
 */
describe('allocateMonth over 100 %', () => {
    it('scales the shares down so the month allocates exactly the income, never more (random overshoots, 3 to 8 pots)', () => {
        const random = seeded(4242);
        for (let round = 0; round < 300; round += 1) {
            const potCount = 3 + Math.floor(random() * 6);
            const income = Math.floor(random() * 2_000_000);
            // Each pot 0..40 %, kept only when the board totals strictly more than 100 %.
            const shares = Array.from({ length: potCount }, (_, index) => ({
                id: `pot-${index}`,
                basisPoints: Math.floor(random() * 4_000),
            }));
            const total = shares.reduce((sum, share) => sum + share.basisPoints, 0);
            if (total <= 10_000) {
                shares[0]!.basisPoints += 10_001 - total;
            }
            const rows = allocateMonth(income, shares);

            expect(rows.reduce((sum, row) => sum + row.amount, 0)).toBe(income);
            expect(rows.every(row => row.amount >= 0 && row.amount <= income)).toBe(true);
            // Proportional: each pot sits within the pot count of cents of its exact scaled share.
            const scaledTotal = shares.reduce((sum, share) => sum + share.basisPoints, 0);
            rows.forEach((row, index) => {
                const exact = (income * shares[index]!.basisPoints) / scaledTotal;
                expect(Math.abs(row.amount - exact)).toBeLessThan(potCount + 1);
            });
        }
    });

    it('puts the remainder on the largest share, the first on a tie, and leaves a board under 100 % as it was', () => {
        expect(
            allocateMonth(100, [
                { id: 'a', basisPoints: 6_000 },
                { id: 'b', basisPoints: 6_000 },
                { id: 'c', basisPoints: 6_000 },
            ]).map(row => row.amount)
        ).toEqual([34, 33, 33]);
        expect(
            allocateMonth(100_00, [
                { id: 'a', basisPoints: 5_000 },
                { id: 'b', basisPoints: 2_000 },
            ]).map(row => row.amount)
        ).toEqual([50_00, 20_00]);
    });
});

describe('healedShareHistory', () => {
    const NOW = '2026-11';

    it('always reads the current month at jar.percentage, whatever the rows say', () => {
        const stale = [
            { period: JAR_SHARE_BASELINE_PERIOD, percentage: '55.00' },
            { period: NOW, percentage: '50.00' },
        ];
        const healed = healedShareHistory(stale, '35.00', NOW, true);

        expect(shareBasisPointsAt(healed, NOW)).toBe(3500);
        expect(shareBasisPointsAt(healed, '2026-10')).toBe(5500);
        // A stale row from an earlier month also gives way in the current month only.
        const older = healedShareHistory(
            [{ period: '2026-09', percentage: '55.00' }],
            '35.00',
            NOW,
            true
        );
        expect(shareBasisPointsAt(older, '2026-10')).toBe(5500);
        expect(shareBasisPointsAt(older, NOW)).toBe(3500);
    });

    it('leaves a consistent history exactly as it is', () => {
        const rows = [
            { period: JAR_SHARE_BASELINE_PERIOD, percentage: '55.00' },
            { period: NOW, percentage: '35.00' },
        ];
        expect(healedShareHistory(rows, '35.00', NOW, true)).toEqual(
            potShareHistory(rows, '35.00')
        );
    });

    it('starts a pot with no rows at the current month when the household has rows for other pots', () => {
        expect(healedShareHistory([], '20.00', NOW, true)).toEqual(history([NOW, 2000]));
    });

    it('reads a pot with no rows as a baseline when the household has no rows at all', () => {
        expect(healedShareHistory(undefined, '20.00', NOW, false)).toEqual(
            history([JAR_SHARE_BASELINE_PERIOD, 2000])
        );
    });
});

describe('a pot an old backend created after the table existed', () => {
    it('counts from the current month: no past month exceeds the income and every month is conserved', () => {
        const sources = [salary(2_000_00, { startedOn: '2026-05-01' })];
        // Old-code activate: Basics now says 35 (percentage) while its rows still say 55, and
        // Daily (20) has no rows at all.
        const basicsRows = [{ period: JAR_SHARE_BASELINE_PERIOD, percentage: '55.00' }];
        const pots = [
            { id: 'basics', history: healedShareHistory(basicsRows, '35.00', '2026-11', true) },
            { id: 'daily', history: healedShareHistory([], '20.00', '2026-11', true) },
            {
                id: 'future',
                history: healedShareHistory(
                    [{ period: JAR_SHARE_BASELINE_PERIOD, percentage: '20.00' }],
                    '20.00',
                    '2026-11',
                    true
                ),
            },
            {
                id: 'free',
                history: healedShareHistory(
                    [{ period: JAR_SHARE_BASELINE_PERIOD, percentage: '25.00' }],
                    '25.00',
                    '2026-11',
                    true
                ),
            },
        ];

        // Every month from the start: the pots total exactly one income, never more.
        for (let index = periodIndex('2026-05'); index <= periodIndex('2026-11'); index += 1) {
            const month = periodFromIndex(index);
            const total = deposits({ from: month, through: month, pots, sources });
            expect([...total.values()].reduce((sum, value) => sum + value, 0)).toBe(2_000_00);
        }
        const result = deposits({ from: '2026-05', through: '2026-11', pots, sources });
        expect(result.get('daily')).toBe(400_00);
        expect(result.get('basics')).toBe(6 * 1_100_00 + 700_00);
    });

    it('still equals the old formula for a household with no rows at all', () => {
        const sources = [salary(2_500_00, { startedOn: '2026-05-01' })];
        const percentages = { a: '55.00', b: '20.00', c: '25.00' };
        const pots = Object.entries(percentages).map(([id, percentage]) => ({
            id,
            history: healedShareHistory([], percentage, '2026-11', false),
        }));
        const result = deposits({ from: '2026-05', through: '2026-11', pots, sources });

        const old = allocateByPercentage(
            2_500_00,
            Object.entries(percentages).map(([id, percentage]) => ({
                id,
                percentage: Number(percentage),
            }))
        );
        for (const row of old) expect(result.get(row.id)).toBe(7 * row.amount);
    });

    it('does not let months over 100 % invent money: a stale board that overshoots allocates the income', () => {
        // Old-code deactivate in reverse: rows keep a removed pot's share on top of the main pot's.
        const sources = [salary(1_000_00, { startedOn: '2026-05-01' })];
        const pots = [
            { id: 'basics', history: history([JAR_SHARE_BASELINE_PERIOD, 5500]) },
            { id: 'daily', history: history([JAR_SHARE_BASELINE_PERIOD, 2000]) },
            { id: 'other', history: history([JAR_SHARE_BASELINE_PERIOD, 4500]) },
        ];
        const result = deposits({ from: '2026-05', through: '2026-07', pots, sources });
        expect([...result.values()].reduce((sum, value) => sum + value, 0)).toBe(3 * 1_000_00);
    });
});
