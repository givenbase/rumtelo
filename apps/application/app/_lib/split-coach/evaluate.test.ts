import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { JarKey } from '@rumtelo/contracts';

import { evaluateSplitCoach, pctByJarKey } from './evaluate';

const ids = (pct: Parameters<typeof evaluateSplitCoach>[0]) =>
    evaluateSplitCoach(pct).map(tip => tip.id);

describe('evaluateSplitCoach (group level)', () => {
    it('stays quiet on the default three pots', () => {
        assert.deepEqual(
            ids({ [JarKey.NECESSITIES]: 55, [JarKey.LONG_TERM_SAVINGS]: 20, [JarKey.PLAY]: 25 }),
            []
        );
    });

    it('adds the optional pots of a group before comparing it with its limit', () => {
        // Basics = 45 + 20 = 65 > 60 even though no single pot is over.
        assert.deepEqual(
            ids({
                [JarKey.NECESSITIES]: 45,
                [JarKey.DAILY]: 20,
                [JarKey.LONG_TERM_SAVINGS]: 15,
                [JarKey.PLAY]: 20,
            }),
            ['basics-high']
        );
        // Future = 4 + 3 + 3 = 10 is at the floor, not below it.
        assert.deepEqual(
            ids({
                [JarKey.NECESSITIES]: 55,
                [JarKey.LONG_TERM_SAVINGS]: 4,
                [JarKey.GOALS]: 3,
                [JarKey.FINANCIAL_FREEDOM]: 3,
                [JarKey.PLAY]: 35,
            }),
            []
        );
    });

    it('counts an absent pot as 0 %, never as a default', () => {
        // No Future pots at all: 0 % Future is below the floor.
        assert.deepEqual(ids({ [JarKey.NECESSITIES]: 55, [JarKey.PLAY]: 45 }), ['future-low']);
        // No Basics pot: nothing is assumed to fill the gap.
        assert.deepEqual(ids({ [JarKey.LONG_TERM_SAVINGS]: 50, [JarKey.PLAY]: 50 }), []);
    });

    it('fires both group rules, warning first after ordering', () => {
        assert.deepEqual(
            ids({ [JarKey.NECESSITIES]: 85, [JarKey.LONG_TERM_SAVINGS]: 5, [JarKey.PLAY]: 10 }),
            ['basics-high', 'future-low']
        );
    });

    it('has nothing to say while no pot is loaded', () => {
        assert.deepEqual(ids({}), []);
    });

    it('maps jar rows to shares by key, preferring the edited value', () => {
        const jars = [
            { id: 'a', key: JarKey.NECESSITIES, percentage: 55 },
            { id: 'b', key: JarKey.PLAY, percentage: 25 },
        ];
        assert.deepEqual(pctByJarKey(jars, { a: 70 }), {
            [JarKey.NECESSITIES]: 70,
            [JarKey.PLAY]: 25,
        });
    });
});
