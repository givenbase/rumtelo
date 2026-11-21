import assert from 'node:assert/strict';
import { test } from 'node:test';

import { jarsMonthSummary, jarTileFigures } from './jar-tile';

test('available is envelope minus spent and committed; the meter shows what is left', () => {
    const figures = jarTileFigures({
        allocated: 100_000,
        credited: 0,
        spent: 20_000,
        committedOut: 30_000,
    });
    assert.equal(figures.available, 50_000);
    assert.equal(figures.envelope, 100_000);
    assert.equal(figures.overspent, false);
    assert.equal(figures.meterPct, 50);
});

test('credited money joins the envelope', () => {
    const figures = jarTileFigures({
        allocated: 50_000,
        credited: 10_000,
        spent: 0,
        committedOut: 0,
    });
    assert.equal(figures.envelope, 60_000);
    assert.equal(figures.available, 60_000);
    assert.equal(figures.meterPct, 100);
});

test('an overspent jar is a full meter, not an empty one', () => {
    const figures = jarTileFigures({
        allocated: 100_000,
        credited: 0,
        spent: 144_650,
        committedOut: 0,
    });
    assert.equal(figures.available, -44_650);
    assert.equal(figures.overspent, true);
    assert.equal(figures.meterPct, 100);
});

test('committed fixed costs alone can overspend a jar', () => {
    const figures = jarTileFigures({
        allocated: 10_000,
        credited: 0,
        spent: 0,
        committedOut: 12_000,
    });
    assert.equal(figures.overspent, true);
    assert.equal(figures.meterPct, 100);
});

test('an empty envelope with nothing owed is an empty meter', () => {
    const figures = jarTileFigures({ allocated: 0, credited: 0, spent: 0, committedOut: 0 });
    assert.equal(figures.available, 0);
    assert.equal(figures.overspent, false);
    assert.equal(figures.meterPct, 0);
});

test('summary adds integer cents across jars, an overspent jar included', () => {
    const summary = jarsMonthSummary([
        { allocated: 100_001, credited: 0, spent: 20_000, committedOut: 0 },
        { allocated: 50_000, credited: 5_000, spent: 0, committedOut: 0 },
        { allocated: 10_000, credited: 0, spent: 14_450, committedOut: 0 },
    ]);
    assert.equal(summary.envelope, 165_001);
    assert.equal(summary.available, 80_001 + 55_000 - 4_450);
});

test('summary of no jars is zero', () => {
    assert.deepEqual(jarsMonthSummary([]), { available: 0, envelope: 0 });
});
