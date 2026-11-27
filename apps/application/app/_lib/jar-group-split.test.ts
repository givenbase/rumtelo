import assert from 'node:assert/strict';
import { test } from 'node:test';

import { JarGroup, JarKey } from '@rumtelo/contracts';

import {
    groupSavedShares,
    groupSplitPayload,
    groupSplitStatus,
    parseShareInput,
    sameShares,
    toBasisPoints,
} from './jar-group-split';

const jars = [
    { id: 'n', key: JarKey.NECESSITIES, percentage: 40 },
    { id: 'd', key: JarKey.DAILY, percentage: 15 },
    { id: 'l', key: JarKey.LONG_TERM_SAVINGS, percentage: 20 },
    { id: 'p', key: JarKey.PLAY, percentage: 25 },
];

test('share input is clamped to 0..100 with two decimals; unreadable is 0', () => {
    assert.equal(parseShareInput('12.5'), 12.5);
    assert.equal(parseShareInput('12.345'), 12.35);
    assert.equal(parseShareInput(''), 0);
    assert.equal(parseShareInput('abc'), 0);
    assert.equal(parseShareInput('-4'), 0);
    assert.equal(parseShareInput('140'), 100);
});

test('basis points round the way the server compares them', () => {
    assert.equal(toBasisPoints(33.33), 3333);
    assert.equal(toBasisPoints(0.1 + 0.2), 30);
});

test('moving share between two pots of a group keeps the group total', () => {
    const status = groupSplitStatus(jars, JarGroup.BASIS, { n: 35, d: 20 });
    assert.equal(status.savedBasisPoints, 5500);
    assert.equal(status.editedBasisPoints, 5500);
    assert.equal(status.differenceBasisPoints, 0);
    assert.equal(status.changed, true);
    assert.equal(status.balanced, true);
});

test('untouched pots are unchanged and balanced', () => {
    const status = groupSplitStatus(jars, JarGroup.BASIS, groupSavedShares(jars, JarGroup.BASIS));
    assert.equal(status.changed, false);
    assert.equal(status.balanced, true);
});

test('too much and too little show as a signed difference and block saving', () => {
    const over = groupSplitStatus(jars, JarGroup.BASIS, { d: 20 });
    assert.equal(over.differenceBasisPoints, 500);
    assert.equal(over.balanced, false);
    const short = groupSplitStatus(jars, JarGroup.BASIS, { n: 30 });
    assert.equal(short.differenceBasisPoints, -1000);
    assert.equal(short.balanced, false);
});

test('a difference of a hundredth of a percent is still not balanced', () => {
    const status = groupSplitStatus(jars, JarGroup.BASIS, { n: 39.99 });
    assert.equal(status.differenceBasisPoints, -1);
    assert.equal(status.balanced, false);
});

test('edits to another group do not count', () => {
    const status = groupSplitStatus(jars, JarGroup.BASIS, { p: 10 });
    assert.equal(status.changed, false);
    assert.equal(status.balanced, true);
});

test('the payload lists every pot once and keeps pots outside the group as saved', () => {
    const payload = groupSplitPayload(jars, JarGroup.BASIS, { n: 35, d: 20, p: 99 });
    assert.deepEqual(payload, [
        { jarId: 'n', percentage: 35 },
        { jarId: 'd', percentage: 20 },
        { jarId: 'l', percentage: 20 },
        { jarId: 'p', percentage: 25 },
    ]);
    const total = payload.reduce((sum, row) => sum + toBasisPoints(row.percentage), 0);
    assert.equal(total, 10_000);
});

test('shares compare to the basis point; a missing pot is a difference', () => {
    assert.equal(sameShares({ a: 12.5 }, { a: 12.5 }), true);
    assert.equal(sameShares({ a: 12.501 }, { a: 12.5 }), true);
    assert.equal(sameShares({ a: 12.5 }, { a: 12.51 }), false);
    assert.equal(sameShares({ a: 1 }, { a: 1, b: 2 }), false);
});
