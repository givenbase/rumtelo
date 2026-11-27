import { describe, expect, it } from 'vitest';

import { JarKey } from '@rumtelo/contracts';

import {
    checkJarSplit,
    resolveJarSplit,
    splitIncomeByJar,
    type JarShare,
    type JarSplitTemplate,
} from './jar-split.util';

/** The seeded catalog, deliberately out of order to prove `sortOrder` wins. */
const TEMPLATES: JarSplitTemplate[] = [
    { key: JarKey.PLAY, sortOrder: 4, percentage: '10.00' },
    { key: JarKey.NECESSITIES, sortOrder: 0, percentage: '55.00' },
    { key: JarKey.GIVE, sortOrder: 5, percentage: '5.00' },
    { key: JarKey.FINANCIAL_FREEDOM, sortOrder: 1, percentage: '10.00' },
    { key: JarKey.EDUCATION, sortOrder: 2, percentage: '10.00' },
    { key: JarKey.LONG_TERM_SAVINGS, sortOrder: 3, percentage: '10.00' },
];

const ORDER = [
    JarKey.NECESSITIES,
    JarKey.FINANCIAL_FREEDOM,
    JarKey.EDUCATION,
    JarKey.LONG_TERM_SAVINGS,
    JarKey.PLAY,
    JarKey.GIVE,
];

function custom(percentages: number[]): JarShare[] {
    return ORDER.map((key, index) => ({ key, percentage: percentages[index]! }));
}

function amounts(income: number, shares = resolveJarSplit(TEMPLATES)) {
    return splitIncomeByJar(income, shares).map(row => row.amount);
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

describe('resolveJarSplit', () => {
    it('uses the template defaults in sortOrder when no split is given', () => {
        expect(resolveJarSplit(TEMPLATES).map(share => [share.key, share.percentage])).toEqual([
            [JarKey.NECESSITIES, 55],
            [JarKey.FINANCIAL_FREEDOM, 10],
            [JarKey.EDUCATION, 10],
            [JarKey.LONG_TERM_SAVINGS, 10],
            [JarKey.PLAY, 10],
            [JarKey.GIVE, 5],
        ]);
    });

    it('applies a custom split that totals exactly 100, in template order', () => {
        const shares = resolveJarSplit(TEMPLATES, [...custom([50, 15, 10, 10, 10, 5])].reverse());
        expect(shares.map(share => share.key)).toEqual(ORDER);
        expect(shares.map(share => share.percentage)).toEqual([50, 15, 10, 10, 10, 5]);
    });

    it('accepts two-decimal percentages that sum to 100 despite float noise', () => {
        // 0.1 + 0.2 style noise: 12.34 + 43.21 + … must still compare equal in basis points.
        expect(() =>
            resolveJarSplit(TEMPLATES, custom([12.34, 43.21, 10.1, 10.1, 14.25, 10]))
        ).not.toThrow();
    });

    it.each([
        ['99.99', [55, 10, 10, 10, 10, 4.99]],
        ['100.01', [55, 10, 10, 10, 10, 5.01]],
    ])('rejects a total of %s with jar_split_total', (_label, percentages) => {
        expect(() => resolveJarSplit(TEMPLATES, custom(percentages))).toThrow(
            expect.objectContaining({
                response: expect.objectContaining({ message: 'jar_split_total' }),
            })
        );
    });

    it.each([
        ['negative', [105, -5, 0, 0, 0, 0]],
        ['over 100', [110, 0, 0, 0, 0, -10]],
        ['NaN', [Number.NaN, 25, 25, 25, 25, 0]],
    ])('rejects a share that is %s even when the total reaches 100', (_label, percentages) => {
        expect(() => resolveJarSplit(TEMPLATES, custom(percentages))).toThrow(
            expect.objectContaining({
                response: expect.objectContaining({ message: 'jar_split_total' }),
            })
        );
    });

    it('rejects a duplicate key with jar_split_keys', () => {
        const duplicated = custom([55, 10, 10, 10, 10, 5]);
        duplicated[5] = { key: JarKey.PLAY, percentage: 5 };
        expect(() => resolveJarSplit(TEMPLATES, duplicated)).toThrow('jar_split_keys');
    });

    it('rejects a missing key with jar_split_keys', () => {
        expect(() =>
            resolveJarSplit(TEMPLATES, custom([55, 10, 10, 10, 10, 5]).slice(0, 5))
        ).toThrow('jar_split_keys');
    });
});

describe('checkJarSplit', () => {
    it('returns the shares in template order for a valid split', () => {
        const checked = checkJarSplit(TEMPLATES, custom([50, 15, 10, 10, 10, 5]).reverse());
        expect(checked).toEqual({ ok: true, shares: custom([50, 15, 10, 10, 10, 5]) });
    });

    it('reports the failure as a value, not a throw', () => {
        expect(checkJarSplit(TEMPLATES, custom([55, 10, 10, 10, 10, 4.994]))).toEqual({
            ok: false,
            reason: 'jar_split_total',
            total: 99.99,
        });
        expect(checkJarSplit(TEMPLATES, custom([100, 0, 0, 0, 0, 0]).slice(0, 3))).toEqual({
            ok: false,
            reason: 'jar_split_keys',
        });
    });
});

describe('splitIncomeByJar', () => {
    it('splits 100 minor units at the default split: 55 / 10 / 10 / 10 / 10 / 5', () => {
        expect(amounts(100)).toEqual([55, 10, 10, 10, 10, 5]);
    });

    it('gives a single minor unit to NECESSITIES and nothing to the others', () => {
        expect(amounts(1)).toEqual([1, 0, 0, 0, 0, 0]);
    });

    it('splits zero income into six zeros', () => {
        expect(amounts(0)).toEqual([0, 0, 0, 0, 0, 0]);
    });

    it('splits 2,500.00 into 1,375 / 250 / 250 / 250 / 250 / 125 euros', () => {
        expect(amounts(250_000)).toEqual([137_500, 25_000, 25_000, 25_000, 25_000, 12_500]);
    });

    it('puts the remainder of 250,001 on the largest share and keeps the sum', () => {
        const result = amounts(250_001);
        expect(result[0]).toBe(137_501);
        expect(sum(result)).toBe(250_001);
    });

    it('breaks a tie for the largest share by sortOrder (first jar wins)', () => {
        const even = resolveJarSplit(TEMPLATES, custom([20, 20, 20, 20, 10, 10]));
        const result = amounts(101, even);
        expect(sum(result)).toBe(101);
        // 20 % of 101 floors to 20 each, 10 % to 10; the 1-unit remainder goes to NECESSITIES.
        expect(result).toEqual([21, 20, 20, 20, 10, 10]);
    });

    it('is exact on a 2-decimal percentage that floats would floor one unit low', () => {
        const odd = resolveJarSplit(TEMPLATES, custom([97.43, 0.57, 0.5, 0.5, 0.5, 0.5]));
        const result = amounts(10_000, odd);
        expect(result[1]).toBe(57);
        expect(sum(result)).toBe(10_000);
    });

    it('always sums to the income, up to the 1,000,000.00 cap', () => {
        for (const income of [1, 7, 99, 12_345, 99_999_999, 100_000_000]) {
            expect(sum(amounts(income))).toBe(income);
        }
    });
});

/** A new household has only the three main pots; its templates are those three. */
describe('three default pots', () => {
    const DEFAULTS: JarSplitTemplate[] = [
        { key: JarKey.PLAY, sortOrder: 2, percentage: '25.00' },
        { key: JarKey.NECESSITIES, sortOrder: 0, percentage: '55.00' },
        { key: JarKey.LONG_TERM_SAVINGS, sortOrder: 1, percentage: '20.00' },
    ];

    it('defaults to 55 / 20 / 25 in sortOrder', () => {
        expect(resolveJarSplit(DEFAULTS).map(share => [share.key, share.percentage])).toEqual([
            [JarKey.NECESSITIES, 55],
            [JarKey.LONG_TERM_SAVINGS, 20],
            [JarKey.PLAY, 25],
        ]);
    });

    it('accepts a three-entry split and rejects one that names an optional pot', () => {
        expect(() =>
            resolveJarSplit(DEFAULTS, [
                { key: JarKey.NECESSITIES, percentage: 50 },
                { key: JarKey.LONG_TERM_SAVINGS, percentage: 25 },
                { key: JarKey.PLAY, percentage: 25 },
            ])
        ).not.toThrow();
        expect(() =>
            resolveJarSplit(DEFAULTS, [
                { key: JarKey.NECESSITIES, percentage: 35 },
                { key: JarKey.DAILY, percentage: 20 },
                { key: JarKey.LONG_TERM_SAVINGS, percentage: 20 },
                { key: JarKey.PLAY, percentage: 25 },
            ])
        ).toThrow('jar_split_keys');
    });

    it('splits the income 55 / 20 / 25 to the cent, remainder to the largest pot', () => {
        expect(splitIncomeByJar(100, resolveJarSplit(DEFAULTS)).map(row => row.amount)).toEqual([
            55, 20, 25,
        ]);
        const odd = splitIncomeByJar(250_001, resolveJarSplit(DEFAULTS)).map(row => row.amount);
        expect(odd).toEqual([137_501, 50_000, 62_500]);
        expect(sum(odd)).toBe(250_001);
    });
});

describe('resolveJarSplit on the default path fails closed on a bad catalog', () => {
    it('throws when the template percentages total 141, not 100', () => {
        const bad: JarSplitTemplate[] = [
            { key: JarKey.NECESSITIES, sortOrder: 0, percentage: '55.00' },
            { key: JarKey.LONG_TERM_SAVINGS, sortOrder: 1, percentage: '31.00' },
            { key: JarKey.PLAY, sortOrder: 2, percentage: '55.00' },
        ];
        expect(() => resolveJarSplit(bad)).toThrow(/total 141%/);
    });

    it('throws on a catalog that totals a hundredth short, or has a non-number', () => {
        const short: JarSplitTemplate[] = [
            { key: JarKey.NECESSITIES, sortOrder: 0, percentage: '55.00' },
            { key: JarKey.LONG_TERM_SAVINGS, sortOrder: 1, percentage: '20.00' },
            { key: JarKey.PLAY, sortOrder: 2, percentage: '24.99' },
        ];
        expect(() => resolveJarSplit(short)).toThrow('not 100%');
        expect(() =>
            resolveJarSplit([{ key: JarKey.PLAY, sortOrder: 0, percentage: 'abc' }])
        ).toThrow('not 100%');
    });

    it('does not apply to a custom split, which has its own jar_split_total rule', () => {
        const bad: JarSplitTemplate[] = [
            { key: JarKey.NECESSITIES, sortOrder: 0, percentage: '55.00' },
            { key: JarKey.LONG_TERM_SAVINGS, sortOrder: 1, percentage: '31.00' },
            { key: JarKey.PLAY, sortOrder: 2, percentage: '55.00' },
        ];
        expect(
            resolveJarSplit(bad, [
                { key: JarKey.NECESSITIES, percentage: 55 },
                { key: JarKey.LONG_TERM_SAVINGS, percentage: 20 },
                { key: JarKey.PLAY, percentage: 25 },
            ]).map(share => share.percentage)
        ).toEqual([55, 20, 25]);
    });
});
