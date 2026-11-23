import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { JarKey } from '@rumtelo/contracts';

import { evaluateSplitCoach, type SplitPctByKey } from './index';
import { defaultSharesById } from '../jar-group';

const ids = (pct: SplitPctByKey) => evaluateSplitCoach(pct).map(tip => tip.id);

describe('split coach thresholds are exact, in basis points', () => {
    it('Basics at exactly 60 % is quiet, one hundredth above fires basics-high', () => {
        assert.deepEqual(
            ids({ [JarKey.NECESSITIES]: 60, [JarKey.LONG_TERM_SAVINGS]: 15, [JarKey.PLAY]: 25 }),
            []
        );
        assert.deepEqual(
            ids({
                [JarKey.NECESSITIES]: 60.01,
                [JarKey.LONG_TERM_SAVINGS]: 14.99,
                [JarKey.PLAY]: 25,
            }),
            ['basics-high']
        );
    });

    it('Future at exactly 10 % is quiet, one hundredth below fires future-low', () => {
        assert.deepEqual(
            ids({ [JarKey.NECESSITIES]: 55, [JarKey.LONG_TERM_SAVINGS]: 10, [JarKey.PLAY]: 35 }),
            []
        );
        assert.deepEqual(
            ids({
                [JarKey.NECESSITIES]: 55,
                [JarKey.LONG_TERM_SAVINGS]: 9.99,
                [JarKey.PLAY]: 35.01,
            }),
            ['future-low']
        );
    });

    it('does not fire on float drift: Future pots that add to 10 in basis points but not in floats', () => {
        // 3.09 + 4.97 + 1.94 is 9.999999999999998 in IEEE floats; in basis points it is exactly 10,
        // which is at the floor, not below it.
        assert.ok(3.09 + 4.97 + 1.94 < 10);
        assert.deepEqual(
            ids({
                [JarKey.NECESSITIES]: 55,
                [JarKey.LONG_TERM_SAVINGS]: 3.09,
                [JarKey.GOALS]: 4.97,
                [JarKey.FINANCIAL_FREEDOM]: 1.94,
                [JarKey.PLAY]: 35,
            }),
            []
        );
    });

    it('an old six-pot household reads by group too (Future = Freedom + Education + Savings)', () => {
        // Old default: Necessities 55, Freedom 10, Education 10, Savings 10, Play 10, Give 5.
        assert.deepEqual(
            ids({
                [JarKey.NECESSITIES]: 55,
                [JarKey.FINANCIAL_FREEDOM]: 10,
                [JarKey.EDUCATION]: 10,
                [JarKey.LONG_TERM_SAVINGS]: 10,
                [JarKey.PLAY]: 10,
                [JarKey.GIVE]: 5,
            }),
            []
        );
    });

    it('every tip carries an id the copy has, and never names a pot', () => {
        const tips = evaluateSplitCoach({
            [JarKey.NECESSITIES]: 90,
            [JarKey.LONG_TERM_SAVINGS]: 5,
            [JarKey.PLAY]: 5,
        });
        assert.deepEqual(tips.map(tip => tip.id).sort(), ['basics-high', 'future-low']);
    });
});

describe('reset to default keeps the group shares for any mix of pots', () => {
    const jar = (key: JarKey) => ({ id: `id-${key}`, key, percentage: 1 });
    const total = (shares: Record<string, number>) =>
        Object.values(shares).reduce((sum, share) => sum + Math.round(share * 100), 0);

    it('three pots: 55 / 20 / 25', () => {
        const shares = defaultSharesById(
            [JarKey.NECESSITIES, JarKey.LONG_TERM_SAVINGS, JarKey.PLAY].map(jar)
        );
        assert.deepEqual(shares, {
            [`id-${JarKey.NECESSITIES}`]: 55,
            [`id-${JarKey.LONG_TERM_SAVINGS}`]: 20,
            [`id-${JarKey.PLAY}`]: 25,
        });
    });

    it('every subset of optional pots adds to exactly 10 000 basis points', () => {
        const optional = [
            JarKey.DAILY,
            JarKey.GOALS,
            JarKey.FINANCIAL_FREEDOM,
            JarKey.EDUCATION,
            JarKey.GIVE,
        ];
        for (let mask = 0; mask < 1 << optional.length; mask += 1) {
            const keys = [
                JarKey.NECESSITIES,
                JarKey.LONG_TERM_SAVINGS,
                JarKey.PLAY,
                ...optional.filter((_key, index) => (mask & (1 << index)) !== 0),
            ];
            assert.equal(total(defaultSharesById(keys.map(jar))), 10_000, `mask ${mask}`);
        }
    });
});
