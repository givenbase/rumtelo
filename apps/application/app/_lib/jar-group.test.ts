import assert from 'node:assert/strict';
import { test } from 'node:test';

import { JarGroup, JarKey } from '@rumtelo/contracts';

import {
    defaultSharesById,
    formatShare,
    groupBlocks,
    groupSlug,
    groupViews,
    isAloneInGroup,
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

const threeJars = [
    { key: JarKey.NECESSITIES, id: 'n', percentage: 55 },
    { key: JarKey.LONG_TERM_SAVINGS, id: 'l', percentage: 20 },
    { key: JarKey.PLAY, id: 'p', percentage: 25 },
];

test('a main pot is alone only while no other pot of its group is present', () => {
    const keys = threeJars.map(jar => jar.key);
    assert.equal(isAloneInGroup(JarKey.NECESSITIES, keys), true);
    assert.equal(isAloneInGroup(JarKey.NECESSITIES, [...keys, JarKey.DAILY]), false);
    // An optional pot of another group does not refine this one.
    assert.equal(isAloneInGroup(JarKey.NECESSITIES, [...keys, JarKey.GIVE]), true);
    // Optional pots and unknown keys are never "alone".
    assert.equal(isAloneInGroup(JarKey.GIVE, [...keys, JarKey.GIVE]), false);
    assert.equal(isAloneInGroup('OTHER', keys), false);
});

test('three unrefined groups collapse to one row of three tiles', () => {
    const views = groupViews(threeJars);
    assert.deepEqual(
        views.map(view => [view.group, view.position, view.single]),
        [
            [JarGroup.BASIS, 1, true],
            [JarGroup.FUTURE, 2, true],
            [JarGroup.FREE, 3, true],
        ]
    );
    const blocks = groupBlocks(views);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0]?.kind, 'tiles');
});

test('a refined group keeps its heading and splits the tile rows around it', () => {
    const jars = [...threeJars, { key: JarKey.GOALS, id: 'g', percentage: 6 }];
    const views = groupViews(jars);
    assert.deepEqual(
        views.map(view => view.single),
        [true, false, true]
    );
    const blocks = groupBlocks(views);
    assert.deepEqual(
        blocks.map(block => block.kind),
        ['tiles', 'group', 'tiles']
    );
    // Order never follows the API: pots in the Future group come out in group order.
    assert.deepEqual(
        views[1]?.jars.map(jar => jar.key),
        [JarKey.LONG_TERM_SAVINGS, JarKey.GOALS]
    );
});

test('an old six-pot household counts as refined in Future and Free, not in Basics', () => {
    const six = allJars.map(jar => ({ ...jar, id: jar.key, percentage: 0 }));
    const views = groupViews(six);
    assert.deepEqual(
        views.map(view => view.single),
        [true, false, false]
    );
});

test('reset to default adds up to 100 for 3, 6 and 8 pots', () => {
    const six = [
        ...threeJars,
        { key: JarKey.FINANCIAL_FREEDOM, id: 'f', percentage: 0 },
        { key: JarKey.EDUCATION, id: 'e', percentage: 0 },
        { key: JarKey.GIVE, id: 'v', percentage: 0 },
    ];
    const eight = [
        ...six,
        { key: JarKey.DAILY, id: 'd', percentage: 0 },
        { key: JarKey.GOALS, id: 'g', percentage: 0 },
    ];
    for (const jars of [threeJars, six, eight]) {
        const shares = defaultSharesById(jars);
        assert.equal(Object.keys(shares).length, jars.length);
        const basisPoints = Object.values(shares).reduce(
            (sum, value) => sum + Math.round(value * 100),
            0
        );
        assert.equal(basisPoints, 10_000, `${jars.length} pots`);
    }
    // The group totals never move, whatever is refined.
    const sharesEight = defaultSharesById(eight);
    assert.equal(sharesEight.n! + sharesEight.d!, 55);
});
