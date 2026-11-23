import { describe, expect, it } from 'vitest';

import {
    DEFAULT_JAR_SPLIT,
    JAR_GROUP_BY_KEY,
    JAR_GROUP_ORDER,
    JAR_ORDER_IN_GROUP,
    JarGroup,
    JarKey,
    jarGroupFor,
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
        expect(Object.keys(JAR_GROUP_BY_KEY).sort()).toEqual(Object.values(JarKey).sort());
    });

    it('shows groups as Basis, Future, Free', () => {
        expect(JAR_GROUP_ORDER).toEqual([JarGroup.BASIS, JarGroup.FUTURE, JarGroup.FREE]);
    });

    it('lists each jar exactly once, inside its own group, in display order', () => {
        const listed = JAR_GROUP_ORDER.flatMap(group => JAR_ORDER_IN_GROUP[group]);
        expect(listed).toEqual([
            JarKey.NECESSITIES,
            JarKey.LONG_TERM_SAVINGS,
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

    it('sums the default split to 55 / 30 / 15', () => {
        const shares = Object.values(JarKey).map(key => ({
            key,
            percentage: DEFAULT_JAR_SPLIT[key],
        }));
        expect(sumPercentageByGroup(shares)).toEqual({
            [JarGroup.BASIS]: 55,
            [JarGroup.FUTURE]: 30,
            [JarGroup.FREE]: 15,
        });
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
