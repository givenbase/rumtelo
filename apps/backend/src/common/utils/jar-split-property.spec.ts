import { describe, expect, it } from 'vitest';

import {
    DEFAULT_GROUP_SPLIT,
    JAR_GROUP_ORDER,
    JarKey,
    OPTIONAL_JAR_KEYS,
    OnboardingInput,
    OnboardingSplitPreviewInput,
    JarSplitShare,
    defaultJarSplitFor,
    jarGroupFor,
    sumPercentageByGroup,
    type OptionalJarKey,
} from '@rumtelo/contracts';
import { allocateByPercentage } from '@rumtelo/utils';

import {
    checkJarSplit,
    resolveJarSplit,
    splitIncomeByJar,
    type JarShare,
    type JarSplitTemplate,
} from './jar-split.util';

/** Small deterministic generator (mulberry32): a failing run can be replayed from its seed. */
function randomSource(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
        mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
    };
}

const ALL_KEYS = Object.values(JarKey);
const MAIN_KEYS = [JarKey.NECESSITIES, JarKey.LONG_TERM_SAVINGS, JarKey.PLAY];

/** A random valid split of `count` shares totalling exactly 10 000 basis points, each at least 1. */
function randomBasisPointSplit(random: () => number, count: number): number[] {
    // Random cut points in 1..9999 give `count` positive parts that add up to 10 000.
    const cuts = new Set<number>();
    while (cuts.size < count - 1) cuts.add(1 + Math.floor(random() * 9_999));
    const sorted = [...cuts].sort((left, right) => left - right);
    const parts: number[] = [];
    let previous = 0;
    for (const cut of sorted) {
        parts.push(cut - previous);
        previous = cut;
    }
    parts.push(10_000 - previous);
    return parts;
}

const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

describe('allocateByPercentage on random valid splits (3 to 8 pots)', () => {
    it.each([3, 4, 5, 6, 7, 8])(
        'with %i pots always allocates the full income to the cent, remainder to the largest share',
        count => {
            const random = randomSource(1_000 + count);
            const incomes = [0, 1, 2, 7, 99, 100, 101, 250_001, 1_234_567, 100_000_000];
            for (let round = 0; round < 250; round += 1) {
                incomes.push(Math.floor(random() * 100_000_000));
            }

            for (const income of incomes) {
                const basisPoints = randomBasisPointSplit(random, count);
                const shares = basisPoints.map((points, index) => ({
                    id: `pot-${index}`,
                    percentage: points / 100,
                }));

                const rows = allocateByPercentage(income, shares);

                // No cent lost or invented.
                expect(sum(rows.map(row => row.amount))).toBe(income);
                // Integer minor units, never negative.
                for (const row of rows) {
                    expect(Number.isInteger(row.amount)).toBe(true);
                    expect(row.amount).toBeGreaterThanOrEqual(0);
                }
                // Only the largest share (first on a tie) may differ from its floor, by < count cents.
                const largestIndex = basisPoints.indexOf(Math.max(...basisPoints));
                const overFloor = rows.map(
                    (row, index) => row.amount - Math.floor((income * basisPoints[index]!) / 10_000)
                );
                expect(overFloor.filter((_extra, index) => index !== largestIndex)).toEqual(
                    Array.from({ length: count - 1 }, () => 0)
                );
                expect(overFloor[largestIndex]).toBeGreaterThanOrEqual(0);
                expect(overFloor[largestIndex]).toBeLessThan(count);
            }
        }
    );

    it('keeps a 0.01 % share exact (no float drift) at the largest income', () => {
        const rows = allocateByPercentage(100_000_000, [
            { id: 'tiny', percentage: 0.01 },
            { id: 'rest', percentage: 99.99 },
        ]);
        expect(rows.map(row => row.amount)).toEqual([10_000, 99_990_000]);
    });
});

describe('default split for every combination of optional pots', () => {
    const subsets: OptionalJarKey[][] = Array.from(
        { length: 1 << OPTIONAL_JAR_KEYS.length },
        (_, mask) => OPTIONAL_JAR_KEYS.filter((_key, index) => (mask & (1 << index)) !== 0)
    );

    it('covers all 32 subsets', () => {
        expect(subsets).toHaveLength(32);
    });

    it.each(subsets.map(subset => [subset.join('+') || 'none', subset] as const))(
        'main pots plus [%s]: totals 10 000 bp, groups stay 55 / 20 / 25, every pot above 0',
        (_label, optional) => {
            const keys = [...MAIN_KEYS, ...optional];
            const split = defaultJarSplitFor(keys);

            // Exactly the pots asked for, none invented.
            expect(Object.keys(split).sort()).toEqual([...keys].sort());
            const basisPoints = keys.map(key => Math.round(split[key]! * 100));
            expect(sum(basisPoints)).toBe(10_000);
            for (const points of basisPoints) expect(points).toBeGreaterThan(0);

            const groups = sumPercentageByGroup(
                keys.map(key => ({ key, percentage: split[key]! }))
            );
            for (const group of JAR_GROUP_ORDER) {
                expect(groups[group]).toBe(DEFAULT_GROUP_SPLIT[group]);
            }
        }
    );

    it('is accepted by the shared split rule and allocates any income exactly', () => {
        for (const optional of subsets) {
            const keys = [...MAIN_KEYS, ...optional];
            const split = defaultJarSplitFor(keys);
            const templates: JarSplitTemplate[] = keys.map((key, sortOrder) => ({
                key,
                sortOrder,
                percentage: split[key]!.toFixed(2),
            }));
            const shares = resolveJarSplit(templates);
            for (const income of [0, 1, 3, 99_99, 250_001, 100_000_000]) {
                const rows = splitIncomeByJar(income, shares);
                expect(sum(rows.map(row => row.amount))).toBe(income);
            }
        }
    });

    it('a pot of another group never changes the group it is not in', () => {
        const withDaily = defaultJarSplitFor([...MAIN_KEYS, JarKey.DAILY]);
        expect(withDaily[JarKey.LONG_TERM_SAVINGS]).toBe(20);
        expect(withDaily[JarKey.PLAY]).toBe(25);
        expect(jarGroupFor(JarKey.DAILY)).toBe(jarGroupFor(JarKey.NECESSITIES));
    });
});

describe('onboarding split count and totals', () => {
    const three: JarShare[] = [
        { key: JarKey.NECESSITIES, percentage: 55 },
        { key: JarKey.LONG_TERM_SAVINGS, percentage: 20 },
        { key: JarKey.PLAY, percentage: 25 },
    ];
    const templates: JarSplitTemplate[] = three.map((share, sortOrder) => ({
        key: share.key,
        sortOrder,
        percentage: share.percentage,
    }));
    const base = { currency: 'EUR', monthlyNetIncome: 250_000 };

    it('the default three-pot split totals exactly 10 000 basis points', () => {
        const shares = resolveJarSplit(templates);
        expect(sum(shares.map(share => Math.round(share.percentage * 100)))).toBe(10_000);
        expect(shares.map(share => share.percentage)).toEqual([55, 20, 25]);
    });

    it('rejects three entries that swap a main pot for an optional one with jar_split_keys', () => {
        const swapped: JarShare[] = [
            { key: JarKey.NECESSITIES, percentage: 55 },
            { key: JarKey.DAILY, percentage: 20 },
            { key: JarKey.PLAY, percentage: 25 },
        ];
        expect(checkJarSplit(templates, swapped)).toEqual({ ok: false, reason: 'jar_split_keys' });
        expect(() => resolveJarSplit(templates, swapped)).toThrow('jar_split_keys');
    });

    it('rejects a duplicated main pot with jar_split_keys', () => {
        const duplicated: JarShare[] = [
            { key: JarKey.NECESSITIES, percentage: 55 },
            { key: JarKey.NECESSITIES, percentage: 20 },
            { key: JarKey.PLAY, percentage: 25 },
        ];
        expect(checkJarSplit(templates, duplicated)).toEqual({
            ok: false,
            reason: 'jar_split_keys',
        });
    });

    it.each([
        ['one hundredth short', 24.99],
        ['one hundredth over', 25.01],
        ['half over', 25.5],
    ])('rejects a total that is %s with jar_split_total', (_label, play) => {
        const custom: JarShare[] = [
            { key: JarKey.NECESSITIES, percentage: 55 },
            { key: JarKey.LONG_TERM_SAVINGS, percentage: 20 },
            { key: JarKey.PLAY, percentage: play },
        ];
        expect(checkJarSplit(templates, custom)).toMatchObject({
            ok: false,
            reason: 'jar_split_total',
        });
    });

    it('accepts a 0.1 + 0.2 style split that only a float sum would reject', () => {
        // 33.3 + 33.3 + 33.4 is 100 in basis points, 99.99999999999999 in floats.
        const custom: JarShare[] = [
            { key: JarKey.NECESSITIES, percentage: 33.3 },
            { key: JarKey.LONG_TERM_SAVINGS, percentage: 33.3 },
            { key: JarKey.PLAY, percentage: 33.4 },
        ];
        expect(checkJarSplit(templates, custom)).toMatchObject({ ok: true });
    });

    it('the contract refuses fewer than 3 and more than 8 entries', () => {
        const entry = (key: JarKey) => ({ key, percentage: 10 });
        const two = [entry(JarKey.NECESSITIES), entry(JarKey.PLAY)];
        const nine = Array.from({ length: 9 }, (_, index) =>
            entry(ALL_KEYS[index % ALL_KEYS.length]!)
        );
        for (const schema of [OnboardingInput, OnboardingSplitPreviewInput]) {
            expect(schema.safeParse({ ...base, split: two }).success).toBe(false);
            expect(schema.safeParse({ ...base, split: nine }).success).toBe(false);
            expect(schema.safeParse({ ...base, split: three }).success).toBe(true);
            expect(
                schema.safeParse({ ...base, split: ALL_KEYS.map(key => entry(key)) }).success
            ).toBe(true);
        }
    });

    it('a share with more than two decimals or outside 0..100 is refused by the contract', () => {
        for (const percentage of [33.333, -1, 100.01, Number.NaN]) {
            expect(JarSplitShare.safeParse({ key: JarKey.PLAY, percentage }).success).toBe(false);
        }
        expect(JarSplitShare.safeParse({ key: JarKey.PLAY, percentage: 12.5 }).success).toBe(true);
    });
});
