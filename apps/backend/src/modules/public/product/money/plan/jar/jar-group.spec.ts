import { describe, expect, it } from 'vitest';

import {
    DEFAULT_GROUP_SPLIT,
    JAR_CAPABILITIES,
    JAR_GROUP_BY_KEY,
    JAR_GROUP_ORDER,
    JAR_MAIN_KEY_BY_GROUP,
    JAR_ORDER_IN_GROUP,
    JarGroup,
    JarKey,
    OPTIONAL_JAR_KEYS,
    OPTIONAL_JAR_SHARE,
    defaultJarSplitFor,
    isMainJarKey,
    jarGroupFor,
    mainJarKeyFor,
    resolveJarKeyForHousehold,
    sumPercentageByGroup,
} from '@rumtelo/contracts';

/** Contracts has no test runner of its own; its jar group helpers are pinned here. */
describe('jar groups', () => {
    it('maps every jar to one group', () => {
        expect(jarGroupFor(JarKey.NECESSITIES)).toBe(JarGroup.BASIS);
        expect(jarGroupFor(JarKey.LONG_TERM_SAVINGS)).toBe(JarGroup.FUTURE);
        expect(jarGroupFor(JarKey.FINANCIAL_FREEDOM)).toBe(JarGroup.FUTURE);
        expect(jarGroupFor(JarKey.EDUCATION)).toBe(JarGroup.FUTURE);
        expect(jarGroupFor(JarKey.PLAY)).toBe(JarGroup.FREE);
        expect(jarGroupFor(JarKey.GIVE)).toBe(JarGroup.FREE);
        expect(jarGroupFor(JarKey.DAILY)).toBe(JarGroup.BASIS);
        expect(jarGroupFor(JarKey.GOALS)).toBe(JarGroup.FUTURE);
        expect(Object.keys(JAR_GROUP_BY_KEY).sort()).toEqual(Object.values(JarKey).sort());
    });

    it('shows groups as Basis, Future, Free', () => {
        expect(JAR_GROUP_ORDER).toEqual([JarGroup.BASIS, JarGroup.FUTURE, JarGroup.FREE]);
    });

    it('lists each jar exactly once, inside its own group, in display order', () => {
        const listed = JAR_GROUP_ORDER.flatMap(group => JAR_ORDER_IN_GROUP[group]);
        expect(listed).toEqual([
            JarKey.NECESSITIES,
            JarKey.DAILY,
            JarKey.LONG_TERM_SAVINGS,
            JarKey.GOALS,
            JarKey.FINANCIAL_FREEDOM,
            JarKey.EDUCATION,
            JarKey.PLAY,
            JarKey.GIVE,
        ]);
        expect([...listed].sort()).toEqual(Object.values(JarKey).sort());
        for (const group of JAR_GROUP_ORDER) {
            for (const key of JAR_ORDER_IN_GROUP[group]) expect(jarGroupFor(key)).toBe(group);
        }
    });

    it('sums the default split to 55 / 20 / 25', () => {
        // A new household starts with the three main pots only.
        const split = defaultJarSplitFor(
            JAR_GROUP_ORDER.map(group => JAR_MAIN_KEY_BY_GROUP[group])
        );
        const shares = Object.entries(split).map(([key, percentage]) => ({
            key: key as JarKey,
            percentage: percentage ?? 0,
        }));
        const expected = {
            [JarGroup.BASIS]: 55,
            [JarGroup.FUTURE]: 20,
            [JarGroup.FREE]: 25,
        };
        expect(sumPercentageByGroup(shares)).toEqual(expected);
        expect(DEFAULT_GROUP_SPLIT).toEqual(expected);
    });

    it('adds without float drift and reports empty groups as 0', () => {
        expect(
            sumPercentageByGroup([
                { key: JarKey.PLAY, percentage: 0.1 },
                { key: JarKey.GIVE, percentage: 0.2 },
            ])
        ).toEqual({ [JarGroup.BASIS]: 0, [JarGroup.FUTURE]: 0, [JarGroup.FREE]: 0.3 });
    });
    it('is basis-point safe for thirds and half-percent steps', () => {
        const thirds = sumPercentageByGroup([
            { key: JarKey.NECESSITIES, percentage: 33.33 },
            { key: JarKey.LONG_TERM_SAVINGS, percentage: 33.33 },
            { key: JarKey.PLAY, percentage: 33.34 },
        ]);
        expect(thirds).toEqual({
            [JarGroup.BASIS]: 33.33,
            [JarGroup.FUTURE]: 33.33,
            [JarGroup.FREE]: 33.34,
        });

        const halves = sumPercentageByGroup([
            { key: JarKey.LONG_TERM_SAVINGS, percentage: 12.5 },
            { key: JarKey.FINANCIAL_FREEDOM, percentage: 7.5 },
            { key: JarKey.EDUCATION, percentage: 0.5 },
            { key: JarKey.PLAY, percentage: 0.5 },
        ]);
        expect(halves[JarGroup.FUTURE]).toBe(20.5);
        expect(halves[JarGroup.FREE]).toBe(0.5);
    });

    it('always returns all three groups, 0 for an empty input', () => {
        expect(sumPercentageByGroup([])).toEqual({
            [JarGroup.BASIS]: 0,
            [JarGroup.FUTURE]: 0,
            [JarGroup.FREE]: 0,
        });
    });

    it('group shares add up to exactly the sum of the inputs, in basis points', () => {
        // Deterministic LCG so a failure reproduces; shares are arbitrary 0.01 steps.
        let seed = 20261123;
        const next = () => {
            seed = (seed * 1664525 + 1013904223) % 4294967296;
            return seed / 4294967296;
        };
        const keys = Object.values(JarKey);
        for (let round = 0; round < 500; round += 1) {
            const shares = keys.map(key => ({
                key,
                percentage: Math.round(next() * 10000) / 100,
            }));
            const groups = sumPercentageByGroup(shares);
            const groupBasisPoints = Object.values(groups).reduce(
                (sum, value) => sum + Math.round(value * 100),
                0
            );
            const inputBasisPoints = shares.reduce(
                (sum, share) => sum + Math.round(share.percentage * 100),
                0
            );
            expect(groupBasisPoints).toBe(inputBasisPoints);
        }
    });
});

const MAIN_KEYS = [JarKey.NECESSITIES, JarKey.LONG_TERM_SAVINGS, JarKey.PLAY];

function total(split: Partial<Record<JarKey, number>>): number {
    return (
        Object.values(split).reduce((sum, value) => sum + Math.round((value ?? 0) * 100), 0) / 100
    );
}

describe('main and optional pots', () => {
    it('has one main pot per group and five optional pots in group order', () => {
        expect(JAR_MAIN_KEY_BY_GROUP).toEqual({
            [JarGroup.BASIS]: JarKey.NECESSITIES,
            [JarGroup.FUTURE]: JarKey.LONG_TERM_SAVINGS,
            [JarGroup.FREE]: JarKey.PLAY,
        });
        expect(OPTIONAL_JAR_KEYS).toEqual([
            JarKey.DAILY,
            JarKey.GOALS,
            JarKey.FINANCIAL_FREEDOM,
            JarKey.EDUCATION,
            JarKey.GIVE,
        ]);
        for (const key of MAIN_KEYS) expect(isMainJarKey(key)).toBe(true);
        for (const key of OPTIONAL_JAR_KEYS) {
            expect(isMainJarKey(key)).toBe(false);
            expect(mainJarKeyFor(key)).toBe(JAR_MAIN_KEY_BY_GROUP[jarGroupFor(key)]);
        }
        expect(mainJarKeyFor(JarKey.PLAY)).toBe(JarKey.PLAY);
    });

    it('gives DAILY spend rights without fixed costs and GOALS the savings pot rights', () => {
        expect(JAR_CAPABILITIES[JarKey.DAILY]).toMatchObject({
            canSpend: true,
            canSave: false,
            countsTowardSafeToSpend: true,
            allowsFixedCosts: false,
        });
        expect(JAR_CAPABILITIES[JarKey.GOALS]).toEqual(JAR_CAPABILITIES[JarKey.LONG_TERM_SAVINGS]);
    });

    it('defaults the three main pots to 55 / 20 / 25', () => {
        expect(defaultJarSplitFor(MAIN_KEYS)).toEqual({
            [JarKey.NECESSITIES]: 55,
            [JarKey.LONG_TERM_SAVINGS]: 20,
            [JarKey.PLAY]: 25,
        });
    });

    it('sums to 100 with all eight pots and keeps every group total', () => {
        const split = defaultJarSplitFor(Object.values(JarKey));
        expect(Object.keys(split)).toHaveLength(8);
        expect(total(split)).toBe(100);
        const groups = sumPercentageByGroup(
            Object.entries(split).map(([key, percentage]) => ({
                key: key as JarKey,
                percentage: percentage ?? 0,
            }))
        );
        expect(groups).toEqual(DEFAULT_GROUP_SPLIT);
        expect(split[JarKey.NECESSITIES]).toBe(55 - OPTIONAL_JAR_SHARE[JarKey.DAILY]);
        expect(split[JarKey.LONG_TERM_SAVINGS]).toBe(
            20 -
                OPTIONAL_JAR_SHARE[JarKey.GOALS] -
                OPTIONAL_JAR_SHARE[JarKey.FINANCIAL_FREEDOM] -
                OPTIONAL_JAR_SHARE[JarKey.EDUCATION]
        );
        expect(split[JarKey.PLAY]).toBe(25 - OPTIONAL_JAR_SHARE[JarKey.GIVE]);
    });

    it.each(OPTIONAL_JAR_KEYS)('sums to 100 with the main pots plus %s', optionalKey => {
        const split = defaultJarSplitFor([...MAIN_KEYS, optionalKey]);
        expect(total(split)).toBe(100);
        expect(split[optionalKey]).toBe(OPTIONAL_JAR_SHARE[optionalKey]);
        const main = JAR_MAIN_KEY_BY_GROUP[jarGroupFor(optionalKey)];
        expect(split[main]).toBe(
            DEFAULT_GROUP_SPLIT[jarGroupFor(optionalKey)] - OPTIONAL_JAR_SHARE[optionalKey]
        );
    });

    it('falls back to the main pot of the group when the pot is not turned on', () => {
        expect(resolveJarKeyForHousehold(JarKey.DAILY, MAIN_KEYS)).toBe(JarKey.NECESSITIES);
        expect(resolveJarKeyForHousehold(JarKey.GOALS, MAIN_KEYS)).toBe(JarKey.LONG_TERM_SAVINGS);
        expect(resolveJarKeyForHousehold(JarKey.EDUCATION, MAIN_KEYS)).toBe(
            JarKey.LONG_TERM_SAVINGS
        );
        expect(resolveJarKeyForHousehold(JarKey.GIVE, MAIN_KEYS)).toBe(JarKey.PLAY);
        expect(resolveJarKeyForHousehold(JarKey.GIVE, [...MAIN_KEYS, JarKey.GIVE])).toBe(
            JarKey.GIVE
        );
        expect(resolveJarKeyForHousehold(JarKey.PLAY, new Set(MAIN_KEYS))).toBe(JarKey.PLAY);
    });
});
