import assert from 'node:assert/strict';
import { test } from 'node:test';

import { JarKey } from '@rumtelo/contracts';

import { neededPercent, planBasicsFit, type BasicsFit } from './basics-fit';

const threePots = [
    { id: 'nec', key: JarKey.NECESSITIES },
    { id: 'lts', key: JarKey.LONG_TERM_SAVINGS },
    { id: 'play', key: JarKey.PLAY },
];

const fourPots = [...threePots, { id: 'daily', key: JarKey.DAILY }];

const sixPots = [
    { id: 'nec', key: JarKey.NECESSITIES },
    { id: 'daily', key: JarKey.DAILY },
    { id: 'lts', key: JarKey.LONG_TERM_SAVINGS },
    { id: 'goals', key: JarKey.GOALS },
    { id: 'play', key: JarKey.PLAY },
    { id: 'give', key: JarKey.GIVE },
];

const sixShares = { nec: 35, daily: 20, lts: 14, goals: 6, play: 20, give: 5 };
const fourShares = { nec: 40, daily: 15, lts: 20, play: 25 };

/** Every pot's new share, in basis points: what the server checks adds up to 10 000. */
function totalBasisPoints(shares: Record<string, number>): number {
    return Object.values(shares).reduce((running, value) => running + Math.round(value * 100), 0);
}

function move(fit: BasicsFit) {
    assert.ok(fit.kind === 'over' || fit.kind === 'room', `expected a move, got ${fit.kind}`);
    return fit;
}

test('needed rounds UP to a whole percent in integer arithmetic', () => {
    assert.equal(neededPercent(5401, 10_000), 55);
    assert.equal(neededPercent(5400, 10_000), 54);
    assert.equal(neededPercent(1, 10_000), 1);
    assert.equal(neededPercent(0, 10_000), 0);
    assert.equal(neededPercent(100, 300), 34);
});

test('needed is null without income', () => {
    assert.equal(neededPercent(5000, 0), null);
    assert.equal(neededPercent(5000, -1), null);
});

test('no income shows no_income and nothing else', () => {
    const fit = planBasicsFit({
        jars: threePots,
        shares: { nec: 55, lts: 20, play: 25 },
        incomeMinor: 0,
        basicsCostsMinor: 120_000,
    });
    assert.deepEqual(fit, { kind: 'no_income' });
});

test('over: Free covers the increase, Basics bills pot takes it', () => {
    // 54.01 % of 100 000 = 54 010 → needs 55 %; Basics has 50.
    const fit = move(
        planBasicsFit({
            jars: threePots,
            shares: { nec: 50, lts: 25, play: 25 },
            incomeMinor: 100_000,
            basicsCostsMinor: 54_010,
        })
    );
    assert.equal(fit.kind, 'over');
    assert.equal(fit.neededPercent, 55);
    assert.equal(fit.currentPercent, 50);
    assert.equal(fit.deltaPercent, 5);
    assert.deepEqual(fit.shares, { nec: 55, lts: 25, play: 20 });
    if (fit.kind === 'over') {
        assert.equal(fit.fromFuturePercent, 0);
        assert.equal(fit.applicable, true);
    }
    assert.equal(totalBasisPoints(fit.shares), 10_000);
});

test('over: Free too small, the rest comes out of Future', () => {
    // Needs 70 %; Basics 55 → +15; Free only has 10 → Future gives 5.
    const fit = move(
        planBasicsFit({
            jars: threePots,
            shares: { nec: 55, lts: 35, play: 10 },
            incomeMinor: 200_000,
            basicsCostsMinor: 140_000,
        })
    );
    assert.equal(fit.kind, 'over');
    assert.equal(fit.neededPercent, 70);
    assert.equal(fit.deltaPercent, 15);
    assert.deepEqual(fit.shares, { nec: 70, lts: 30, play: 0 });
    if (fit.kind === 'over') assert.equal(fit.fromFuturePercent, 5);
    assert.equal(totalBasisPoints(fit.shares), 10_000);
});

test('over: costs above the whole income only move what exists, total stays 100', () => {
    const fit = move(
        planBasicsFit({
            jars: threePots,
            shares: { nec: 55, lts: 20, play: 25 },
            incomeMinor: 100_000,
            basicsCostsMinor: 130_000,
        })
    );
    assert.equal(fit.neededPercent, 130);
    assert.deepEqual(fit.shares, { nec: 100, lts: 0, play: 0 });
    assert.equal(totalBasisPoints(fit.shares), 10_000);
});

test('over: nothing left to take means no applicable move', () => {
    const fit = planBasicsFit({
        jars: threePots,
        shares: { nec: 100, lts: 0, play: 0 },
        incomeMinor: 100_000,
        basicsCostsMinor: 130_000,
    });
    // Basics already has everything: still over, but there is nothing to move, so no button.
    assert.equal(fit.kind, 'over');
    if (fit.kind === 'over') {
        assert.equal(fit.applicable, false);
        assert.equal(fit.deltaPercent, 0);
        assert.equal(totalBasisPoints(fit.shares), 10_000);
    }
});

test('over with decimal shares keeps basis-point totals', () => {
    const fit = move(
        planBasicsFit({
            jars: threePots,
            shares: { nec: 45.5, lts: 20.25, play: 34.25 },
            incomeMinor: 100_000,
            basicsCostsMinor: 50_000,
        })
    );
    assert.equal(fit.neededPercent, 50);
    assert.equal(fit.deltaPercent, 4.5);
    assert.deepEqual(fit.shares, { nec: 50, lts: 20.25, play: 29.75 });
    assert.equal(totalBasisPoints(fit.shares), 10_000);
});

test('Daily off: low fixed costs are NOT room (groceries and transport come from Basics too)', () => {
    // Needs 40 %; Basics has 55 and nothing else pays everyday spending: no hint at all.
    const fit = planBasicsFit({
        jars: threePots,
        shares: { nec: 55, lts: 20, play: 25 },
        incomeMinor: 250_000,
        basicsCostsMinor: 100_000,
    });
    assert.equal(fit.kind, 'fits');
});

test('Daily off: over is still said, against the whole Basics group', () => {
    const fit = move(
        planBasicsFit({
            jars: threePots,
            shares: { nec: 40, lts: 30, play: 30 },
            incomeMinor: 100_000,
            basicsCostsMinor: 45_000,
        })
    );
    assert.equal(fit.kind, 'over');
    assert.equal(fit.currentPercent, 40);
    assert.deepEqual(fit.shares, { nec: 45, lts: 30, play: 25 });
});

test('Daily on: low fixed costs are room, the bills pot gives to Future, Daily is untouched', () => {
    // Bills pot 40, needs 30 → 10 points to Future's main pot.
    const fit = move(
        planBasicsFit({
            jars: fourPots,
            shares: fourShares,
            incomeMinor: 100_000,
            basicsCostsMinor: 30_000,
        })
    );
    assert.equal(fit.kind, 'room');
    assert.equal(fit.neededPercent, 30);
    assert.equal(fit.currentPercent, 40);
    assert.equal(fit.deltaPercent, 10);
    assert.deepEqual(fit.shares, { nec: 30, daily: 15, lts: 30, play: 25 });
    assert.equal(totalBasisPoints(fit.shares), 10_000);
});

test('Daily on: over is judged against the bills pot, not the whole Basics group', () => {
    // Basics group is 55 but the bills pot is only 40; fixed costs need 50 → over by 10.
    const fit = move(
        planBasicsFit({
            jars: fourPots,
            shares: fourShares,
            incomeMinor: 100_000,
            basicsCostsMinor: 50_000,
        })
    );
    assert.equal(fit.kind, 'over');
    assert.equal(fit.currentPercent, 40);
    assert.equal(fit.deltaPercent, 10);
    assert.deepEqual(fit.shares, { nec: 50, daily: 15, lts: 20, play: 15 });
    assert.equal(totalBasisPoints(fit.shares), 10_000);
});

test('threshold (Daily on): 5 points of room is mentioned, 4 points is not', () => {
    const atFive = planBasicsFit({
        jars: fourPots,
        shares: fourShares,
        incomeMinor: 100_000,
        basicsCostsMinor: 35_000,
    });
    assert.equal(atFive.kind, 'room');
    const atFour = planBasicsFit({
        jars: fourPots,
        shares: fourShares,
        incomeMinor: 100_000,
        basicsCostsMinor: 36_000,
    });
    assert.equal(atFour.kind, 'fits');
});

test('exactly enough shows nothing', () => {
    const fit = planBasicsFit({
        jars: fourPots,
        shares: fourShares,
        incomeMinor: 100_000,
        basicsCostsMinor: 40_000,
    });
    assert.equal(fit.kind, 'fits');
});

test('no fixed costs on Basics: no advice, never Basics to 0', () => {
    const fit = planBasicsFit({
        jars: fourPots,
        shares: fourShares,
        incomeMinor: 100_000,
        basicsCostsMinor: 0,
    });
    assert.equal(fit.kind, 'fits');
});

test('six pots, Daily on: over raises the bills pot and takes from the Free main pot', () => {
    // Bills pot 35; needs 60 → +25: Play has 20, Future main (14) gives the other 5. Give stays.
    const fit = move(
        planBasicsFit({
            jars: sixPots,
            shares: sixShares,
            incomeMinor: 100_000,
            basicsCostsMinor: 60_000,
        })
    );
    assert.equal(fit.kind, 'over');
    assert.equal(fit.currentPercent, 35);
    assert.deepEqual(fit.shares, { ...sixShares, nec: 60, play: 0, lts: 9 });
    if (fit.kind === 'over') assert.equal(fit.fromFuturePercent, 5);
    assert.equal(totalBasisPoints(fit.shares), 10_000);
});

test('six pots, Daily on: room moves into the Future MAIN pot, not Goals, and leaves Daily alone', () => {
    const fit = move(
        planBasicsFit({
            jars: sixPots,
            shares: { nec: 35, daily: 20, lts: 14, goals: 6, play: 20, give: 5 },
            incomeMinor: 100_000,
            basicsCostsMinor: 10_000,
        })
    );
    assert.equal(fit.kind, 'room');
    // Bills pot 35 → needs 10 → 25 points move.
    assert.equal(fit.deltaPercent, 25);
    assert.deepEqual(fit.shares, { ...sixShares, nec: 10, lts: 39 });
    assert.equal(totalBasisPoints(fit.shares), 10_000);
});

// -- Property-style checks -------------------------------------------------------------------
// Deterministic (seeded) so a failure is reproducible: random valid splits of 3 to 8 pots,
// random income and fixed costs. The invariants below hold for every one of them.

/** mulberry32: a tiny seeded generator, so the same seed always draws the same board. */
function seededRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let mixed = state;
        mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
        mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
    };
}

const OPTIONAL_POTS = [
    JarKey.DAILY,
    JarKey.GOALS,
    JarKey.FINANCIAL_FREEDOM,
    JarKey.EDUCATION,
    JarKey.GIVE,
];

/** A valid board: the three main pots plus a random 0 to 5 optional ones, shares in whole basis points adding up to exactly 10 000. */
function randomBoard(random: () => number) {
    const optional = OPTIONAL_POTS.filter(() => random() < 0.5);
    const keys = [JarKey.NECESSITIES, JarKey.LONG_TERM_SAVINGS, JarKey.PLAY, ...optional];
    const jars = keys.map(key => ({ id: `pot-${key}`, key }));
    // Cut 10 000 bp at random points: every pot gets a whole number of basis points, some 0.
    const cuts = Array.from({ length: keys.length - 1 }, () => Math.floor(random() * 10_001)).sort(
        (left, right) => left - right
    );
    const bounds = [0, ...cuts, 10_000];
    const basisPoints = jars.map((_jar, index) => bounds[index + 1]! - bounds[index]!);
    const shares = Object.fromEntries(
        jars.map((jar, index) => [jar.id, basisPoints[index]! / 100])
    );
    return { jars, shares, basisPoints };
}

const bp = (percent: number) => Math.round(percent * 100);

test('property: over and room keep the total at 10 000 bp, never go negative and never touch other pots', () => {
    const random = seededRandom(20_261_123);
    let overMoves = 0;
    let roomMoves = 0;

    for (let round = 0; round < 2_000; round += 1) {
        const { jars, shares } = randomBoard(random);
        const incomeMinor = 1 + Math.floor(random() * 10_000_000);
        const basicsCostsMinor = Math.floor(random() * incomeMinor * 1.3);
        const fit = planBasicsFit({ jars, shares, incomeMinor, basicsCostsMinor });
        if (fit.kind !== 'over' && fit.kind !== 'room') continue;

        const bills = jars.find(jar => jar.key === JarKey.NECESSITIES)!;
        const free = jars.find(jar => jar.key === JarKey.PLAY)!;
        const future = jars.find(jar => jar.key === JarKey.LONG_TERM_SAVINGS)!;
        const context = `round ${round}`;

        assert.equal(totalBasisPoints(fit.shares), 10_000, `${context}: total`);
        for (const jar of jars) {
            assert.ok(bp(fit.shares[jar.id]!) >= 0, `${context}: ${jar.key} is negative`);
            if (jar.id !== bills.id && jar.id !== free.id && jar.id !== future.id) {
                // Daily, Goals, Freedom, Education and Give are never touched.
                assert.equal(fit.shares[jar.id], shares[jar.id], `${context}: ${jar.key} moved`);
            }
        }

        if (fit.kind === 'over') {
            overMoves += 1;
            assert.ok(fit.deltaPercent >= 0);
            assert.equal(
                bp(fit.shares[bills.id]!),
                bp(shares[bills.id]!) + bp(fit.deltaPercent),
                `${context}: bills pot gains exactly what moved`
            );
            // Free is emptied before Future is asked for anything.
            if (fit.fromFuturePercent > 0) {
                assert.equal(fit.shares[free.id], 0, `${context}: Future gave before Free ran out`);
            }
            assert.equal(fit.applicable, fit.deltaPercent > 0);
            if (fit.applicable) {
                // The move covers what fixed costs need, or everything that could be taken.
                const reachedNeed = bp(fit.shares[bills.id]!) === fit.neededPercent * 100;
                const nothingLeft = fit.shares[free.id] === 0 && fit.shares[future.id] === 0;
                assert.ok(reachedNeed || nothingLeft, `${context}: stopped short`);
            }
        } else {
            roomMoves += 1;
            assert.ok(
                jars.some(jar => jar.key === JarKey.DAILY),
                `${context}: room without Daily`
            );
            assert.equal(bp(fit.shares[bills.id]!), fit.neededPercent * 100);
            assert.equal(fit.shares[free.id], shares[free.id], `${context}: Free moved on room`);
        }
    }

    // The generator must actually exercise both branches, or the loop proves nothing.
    assert.ok(overMoves > 100, `only ${overMoves} over moves drawn`);
    assert.ok(roomMoves > 50, `only ${roomMoves} room moves drawn`);
});

test('property: applying a move leaves nothing more to say (or nothing left to take)', () => {
    const random = seededRandom(7);
    for (let round = 0; round < 1_000; round += 1) {
        const { jars, shares } = randomBoard(random);
        const incomeMinor = 1 + Math.floor(random() * 10_000_000);
        const basicsCostsMinor = 1 + Math.floor(random() * incomeMinor * 1.3);
        const first = planBasicsFit({ jars, shares, incomeMinor, basicsCostsMinor });
        if (first.kind !== 'over' && first.kind !== 'room') continue;
        if (first.kind === 'over' && !first.applicable) continue;

        const second = planBasicsFit({ jars, shares: first.shares, incomeMinor, basicsCostsMinor });
        if (second.kind === 'over') {
            // Only possible when Free and Future ran dry before the need was met.
            assert.equal(second.applicable, false, `round ${round}: a second move is possible`);
        } else {
            assert.equal(second.kind, 'fits', `round ${round}: ${second.kind} after applying`);
        }
    }
});

test('property: needed is the smallest whole percent that covers the costs', () => {
    const random = seededRandom(99);
    for (let round = 0; round < 5_000; round += 1) {
        const incomeMinor = 1 + Math.floor(random() * 50_000_000);
        const costsMinor = Math.floor(random() * incomeMinor * 1.5);
        const needed = neededPercent(costsMinor, incomeMinor)!;
        assert.ok(Number.isInteger(needed));
        // needed % of income covers the costs, one point less does not (integer cross-multiply).
        assert.ok(needed * incomeMinor >= costsMinor * 100, `round ${round}: too low`);
        assert.ok((needed - 1) * incomeMinor < costsMinor * 100 || needed === 0, `round ${round}`);
    }
});

test('over is judged on the exact need: 54.2 % of income against a pot at 54.5 % fits', () => {
    // The rounded-up target would be 55, but the pot already covers the real 54.2 %.
    const fit = planBasicsFit({
        jars: threePots,
        shares: { nec: 54.5, lts: 20.5, play: 25 },
        incomeMinor: 100_000,
        basicsCostsMinor: 54_200,
    });
    assert.equal(fit.kind, 'fits');
});

test('over: the pot one basis point short of the exact need is over, target is the whole percent', () => {
    // 54.2 % needed, pot at 54.19: short; the move goes to the rounded-up target 55.
    const fit = move(
        planBasicsFit({
            jars: threePots,
            shares: { nec: 54.19, lts: 20.81, play: 25 },
            incomeMinor: 100_000,
            basicsCostsMinor: 54_200,
        })
    );
    assert.equal(fit.kind, 'over');
    assert.equal(fit.neededPercent, 55);
    assert.equal(fit.shares.nec, 55);
    assert.equal(totalBasisPoints(fit.shares), 10_000);
});

test('room needs 500 bp above the exact need, not above the rounded-up one', () => {
    // Bills pot 40 (Daily on): 34.9 % needed leaves 5.1 points of exact room → room, to target 35.
    const roomy = move(
        planBasicsFit({
            jars: fourPots,
            shares: fourShares,
            incomeMinor: 100_000,
            basicsCostsMinor: 34_900,
        })
    );
    assert.equal(roomy.kind, 'room');
    assert.equal(roomy.shares.nec, 35);
    // 35.1 % needed leaves only 4.9 points of exact room (the rounded target 36 would too).
    const tight = planBasicsFit({
        jars: fourPots,
        shares: fourShares,
        incomeMinor: 100_000,
        basicsCostsMinor: 35_100,
    });
    assert.equal(tight.kind, 'fits');
});
