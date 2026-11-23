import { describe, expect, it } from 'vitest';

import { Cadence } from '@rumtelo/contracts';
import { endOfPeriodIso, monthlyNetAsOf, type IncomeSourceForNet } from '@rumtelo/utils';

import { incomeChangePeriods } from './income-history.util';
import {
    allocateMonth,
    cumulativeDepositsByPot,
    fromBasisPoints,
    periodFromIndex,
    periodIndex,
    toBasisPoints,
    type PotShare,
} from './jar-share.util';

/**
 * QA (SP3-Q2) for the pure maths of the pot history: M8 (decimal exactness) and the income
 * segment walk of M6/M7 against a plain month-by-month reference, with the dates that break
 * month arithmetic (first and last day of a month, 29 February, 31 December).
 */

function seeded(seed: number) {
    let state = seed;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
        mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
    };
}

describe('M8 basis points stay exact end to end', () => {
    it('every stored percentage 0.00 to 100.00 survives string -> basis points -> string', () => {
        for (let basisPoints = 0; basisPoints <= 10_000; basisPoints++) {
            const stored = fromBasisPoints(basisPoints);
            expect(stored).toMatch(/^\d{1,3}\.\d{2}$/);
            expect(toBasisPoints(stored)).toBe(basisPoints);
            // The percentage a decimal column hands back as a number too.
            expect(toBasisPoints(Number(stored))).toBe(basisPoints);
        }
    });

    it('shares such as 12.5, 33.33 and 66.67 split the income exactly (BigInt reference)', () => {
        const random = seeded(8);
        const boards: number[][] = [
            [1_250, 8_750],
            [3_333, 6_667],
            [3_333, 3_333, 3_334],
            [1_250, 1_250, 1_250, 1_250, 1_250, 1_250, 1_250, 1_250],
            [1, 9_999],
            [5, 25, 70, 9_900],
        ];
        for (const board of boards) {
            for (let run = 0; run < 400; run++) {
                // Up to 1 000 000 000 cents (10 million euro): still far inside 2^53.
                const income = Math.floor(random() * 1_000_000_000);
                const rows = allocateMonth(
                    income,
                    board.map((basisPoints, index) => ({ id: `pot-${index}`, basisPoints }))
                );
                const floors = board.map(basisPoints =>
                    Number((BigInt(income) * BigInt(basisPoints)) / 10_000n)
                );
                const remainder = income - floors.reduce((sum, floor) => sum + floor, 0);
                const largest = board.indexOf(Math.max(...board));
                floors[largest] = floors[largest]! + remainder;
                expect(
                    rows.map(row => row.amount),
                    `income ${income} over ${board.join('/')}`
                ).toEqual(floors);
                expect(rows.reduce((sum, row) => sum + row.amount, 0)).toBe(income);
                expect(rows.every(row => Number.isInteger(row.amount) && row.amount >= 0)).toBe(
                    true
                );
            }
        }
    });

    it('every two-pot board, at an income where float maths is known to land one unit low', () => {
        // 0.29 x 100 is 28.999... in float: the split must still be the integer one.
        for (let basisPoints = 0; basisPoints <= 10_000; basisPoints++) {
            for (const income of [100, 1_000_00, 333_333, 99_999_999]) {
                const [left, right] = allocateMonth(income, [
                    { id: 'left', basisPoints },
                    { id: 'right', basisPoints: 10_000 - basisPoints },
                ]);
                const exactLeft = Number((BigInt(income) * BigInt(basisPoints)) / 10_000n);
                const exactRight = Number(
                    (BigInt(income) * BigInt(10_000 - basisPoints)) / 10_000n
                );
                const remainder = income - exactLeft - exactRight;
                // Remainder to the larger share, the first one on a tie.
                const leftWins = basisPoints >= 10_000 - basisPoints;
                expect([left!.amount, right!.amount]).toEqual([
                    exactLeft + (leftWins ? remainder : 0),
                    exactRight + (leftWins ? 0 : remainder),
                ]);
            }
        }
    });

    it('a board under 100.00 is floored, never topped up; one over 100.00 is scaled to the income', () => {
        const short = allocateMonth(1_000_01, [
            { id: 'a', basisPoints: 3_333 },
            { id: 'b', basisPoints: 3_333 },
        ]);
        // 1 000,01 euro = 100 001 cents: 33.33 % of it is 33 330,33, rounded down; the 3 cents
        // that no share claims stay unassigned.
        expect(short.map(row => row.amount)).toEqual([33_330, 33_330]);
        const over = allocateMonth(1_000_00, [
            { id: 'a', basisPoints: 6_000 },
            { id: 'b', basisPoints: 6_000 },
        ]);
        // Over 100 % is scaled down (SP3-H M1): the month allocates exactly the income, never more.
        expect(over.map(row => row.amount)).toEqual([500_00, 500_00]);
    });
});

describe('M6 the income segment walk equals the month-by-month reference', () => {
    /** A date inside `month` of `year`, biased towards the edge days. */
    function edgeDate(random: () => number, year: number, month: number): string {
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const days = [1, 2, 15, 27, 28, lastDay - 1, lastDay, lastDay];
        const day = days[Math.floor(random() * days.length)]!;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    it('holds for random sources: starts, ends, raises, pauses, on edge days and across years', () => {
        const random = seeded(606);
        for (let run = 0; run < 300; run++) {
            const monthCount = 1 + Math.floor(random() * 60);
            const first = periodIndex('2023-10');
            const through = periodFromIndex(first + monthCount - 1);
            const sources: IncomeSourceForNet[] = Array.from(
                { length: 1 + Math.floor(random() * 3) },
                () => {
                    const startIndex = first + Math.floor(random() * monthCount);
                    const start = periodFromIndex(startIndex);
                    const startedOn =
                        random() < 0.15
                            ? null
                            : edgeDate(
                                  random,
                                  Number(start.slice(0, 4)),
                                  Number(start.slice(5, 7))
                              );
                    const endIndex = startIndex + Math.floor(random() * 30);
                    const end = periodFromIndex(endIndex);
                    const endsOn =
                        random() < 0.5
                            ? null
                            : edgeDate(random, Number(end.slice(0, 4)), Number(end.slice(5, 7)));
                    const raises = Array.from({ length: Math.floor(random() * 4) }, () => {
                        const at = periodFromIndex(first + Math.floor(random() * (monthCount + 6)));
                        return {
                            amount: 500_00 + Math.floor(random() * 4_000_00) + 1,
                            effectiveOn: edgeDate(
                                random,
                                Number(at.slice(0, 4)),
                                Number(at.slice(5, 7))
                            ),
                        };
                    });
                    return {
                        amount: 400_00 + Math.floor(random() * 3_000_00),
                        cadence: [
                            Cadence.MONTHLY,
                            Cadence.WEEKLY,
                            Cadence.YEARLY,
                            Cadence.QUARTERLY,
                        ][Math.floor(random() * 4)]!,
                        // A paused source (no end) never counts; a stopped one counts until its end.
                        isActive: random() < 0.85,
                        startedOn,
                        endsOn,
                        periods: raises,
                    };
                }
            );
            const history: PotShare[] = [{ period: '1970-01', basisPoints: 3_333 }];
            const pots = [
                { id: 'a', history },
                { id: 'b', history: [{ period: '1970-01', basisPoints: 6_667 }] },
            ];
            const walked = cumulativeDepositsByPot({
                fromPeriod: periodFromIndex(first),
                throughPeriod: through,
                pots,
                incomeAsOfPeriod: period => monthlyNetAsOf(sources, endOfPeriodIso(period)),
                incomeChangePeriods: incomeChangePeriods(sources),
            });
            const reference = new Map([
                ['a', 0],
                ['b', 0],
            ]);
            for (let index = first; index < first + monthCount; index++) {
                const income = monthlyNetAsOf(sources, endOfPeriodIso(periodFromIndex(index)));
                for (const row of allocateMonth(income, [
                    { id: 'a', basisPoints: 3_333 },
                    { id: 'b', basisPoints: 6_667 },
                ])) {
                    reference.set(row.id, reference.get(row.id)! + row.amount);
                }
            }
            expect([...walked], `run ${run}: sources ${JSON.stringify(sources)}`).toEqual([
                ...reference,
            ]);
        }
    });

    it('an amount that changes on the 15th is the month’s value for the whole month (as of the last day)', () => {
        const source: IncomeSourceForNet = {
            amount: 3_000_00,
            cadence: Cadence.MONTHLY,
            isActive: true,
            startedOn: '2026-01-01',
            endsOn: null,
            periods: [
                { amount: 2_000_00, effectiveOn: '2026-01-01' },
                { amount: 3_000_00, effectiveOn: '2026-03-15' },
            ],
        };
        const monthly = (period: string) => monthlyNetAsOf([source], endOfPeriodIso(period));
        expect(monthly('2026-02')).toBe(2_000_00);
        // The mid-month change counts for all of March, not half of it.
        expect(monthly('2026-03')).toBe(3_000_00);
    });

    it('an income that ends on the 15th counts nothing in its last month (as of the last day)', () => {
        // Documents the product's definition of a month's income, shared with `allocated`.
        const source: IncomeSourceForNet = {
            amount: 2_000_00,
            cadence: Cadence.MONTHLY,
            isActive: false,
            startedOn: '2026-01-01',
            endsOn: '2026-03-15',
            periods: [],
        };
        expect(monthlyNetAsOf([source], endOfPeriodIso('2026-02'))).toBe(2_000_00);
        expect(monthlyNetAsOf([source], endOfPeriodIso('2026-03'))).toBe(0);
        // ... while an income that STARTS on the 15th counts in full for its first month.
        const starting: IncomeSourceForNet = {
            ...source,
            isActive: true,
            startedOn: '2026-03-15',
            endsOn: null,
        };
        expect(monthlyNetAsOf([starting], endOfPeriodIso('2026-03'))).toBe(2_000_00);
    });
});
