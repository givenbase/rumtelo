import assert from 'node:assert/strict';
import { test } from 'node:test';

import { JarKey } from '@rumtelo/contracts';

import { NECESSITIES_TARGET_PCT, necessitiesPressureFromJars } from './necessities-pressure';

function jar(
    key: JarKey,
    percentage: number,
    figures: { allocated: number; committedOut: number; available: number }
) {
    return { key, percentage, ...figures };
}

test('the target is what the Basics group gets by default', () => {
    assert.equal(NECESSITIES_TARGET_PCT, 55);
});

test('three pots: Necessities alone carries the pressure', () => {
    const pressure = necessitiesPressureFromJars([
        jar(JarKey.NECESSITIES, 55, {
            allocated: 220_000,
            committedOut: 250_000,
            available: -30_000,
        }),
        jar(JarKey.PLAY, 25, { allocated: 100_000, committedOut: 0, available: 60_000 }),
    ]);
    assert.deepEqual(pressure, {
        active: true,
        necessitiesPct: 55,
        commitmentRatio: 0,
        envelopeCents: 220_000,
        shortfallCents: 30_000,
    });
});

test('Daily on: the Basics group is measured, Daily slack covers a Necessities overrun', () => {
    const pressure = necessitiesPressureFromJars([
        jar(JarKey.NECESSITIES, 35, {
            allocated: 140_000,
            committedOut: 150_000,
            available: -10_000,
        }),
        jar(JarKey.DAILY, 20, { allocated: 80_000, committedOut: 0, available: 50_000 }),
    ]);
    assert.equal(pressure?.necessitiesPct, 55);
    assert.equal(pressure?.envelopeCents, 220_000);
    // Group fixed costs (150 000) fit inside the group envelope (220 000) and nothing is overspent.
    assert.equal(pressure?.active, false);
    assert.equal(pressure?.shortfallCents, 0);
});

test('Daily on: an overspent Basics group still raises the line', () => {
    const pressure = necessitiesPressureFromJars([
        jar(JarKey.NECESSITIES, 35, {
            allocated: 140_000,
            committedOut: 150_000,
            available: -10_000,
        }),
        jar(JarKey.DAILY, 20, { allocated: 80_000, committedOut: 0, available: -5_000 }),
    ]);
    assert.equal(pressure?.active, true);
    assert.equal(pressure?.shortfallCents, 15_000);
});

test('no Necessities pot in the list means no line', () => {
    assert.equal(
        necessitiesPressureFromJars([
            jar(JarKey.PLAY, 25, { allocated: 1, committedOut: 0, available: 1 }),
        ]),
        null
    );
});
