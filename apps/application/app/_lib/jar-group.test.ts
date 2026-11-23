import assert from 'node:assert/strict';
import { test } from 'node:test';

import { JarGroup, JarKey } from '@rumtelo/contracts';

import {
    formatShare,
    groupSlug,
    jarsInGroup,
    orderJarsByGroup,
    parseGroupParam,
    sumGroupAmount,
} from './jar-group';

const allJars = [
    { key: JarKey.NECESSITIES, amount: 5500 },
    { key: JarKey.FINANCIAL_FREEDOM, amount: 1000 },
    { key: JarKey.EDUCATION, amount: 1000 },
    { key: JarKey.LONG_TERM_SAVINGS, amount: 1000 },
    { key: JarKey.PLAY, amount: 1000 },
    { key: JarKey.GIVE, amount: 500 },
];

test('the group param round-trips and anything else means all', () => {
    for (const group of Object.values(JarGroup)) {
        assert.equal(parseGroupParam(groupSlug(group)), group);
    }
    assert.equal(parseGroupParam(null), null);
    assert.equal(parseGroupParam(undefined), null);
    assert.equal(parseGroupParam('BASIS'), null);
    assert.equal(parseGroupParam('all'), null);
});

test('pots are listed in group order, not in the order the API sent them', () => {
    assert.deepEqual(
        orderJarsByGroup(allJars).map(jar => jar.key),
        [
            JarKey.NECESSITIES,
            JarKey.LONG_TERM_SAVINGS,
            JarKey.FINANCIAL_FREEDOM,
            JarKey.EDUCATION,
            JarKey.PLAY,
            JarKey.GIVE,
        ]
    );
    assert.deepEqual(
        jarsInGroup(allJars, JarGroup.FREE).map(jar => jar.key),
        [JarKey.PLAY, JarKey.GIVE]
    );
});

test('a missing pot is skipped and its group sums to zero', () => {
    const withoutGive = allJars.filter(jar => jar.key !== JarKey.GIVE);
    assert.equal(jarsInGroup(withoutGive, JarGroup.FREE).length, 1);
    assert.equal(
        sumGroupAmount([] as typeof allJars, JarGroup.BASIS, jar => jar.amount),
        0
    );
});

test('group amounts add integer minor units', () => {
    const amountOf = (jar: { amount: number }) => jar.amount;
    assert.equal(sumGroupAmount(allJars, JarGroup.BASIS, amountOf), 5500);
    assert.equal(sumGroupAmount(allJars, JarGroup.FUTURE, amountOf), 3000);
    assert.equal(sumGroupAmount(allJars, JarGroup.FREE, amountOf), 1500);
});

test('a share keeps at most two decimals', () => {
    assert.equal(formatShare(55, 'en-IE'), '55');
    assert.equal(formatShare(12.5, 'en-IE'), '12.5');
    assert.equal(formatShare(33.333, 'en-IE'), '33.33');
});
