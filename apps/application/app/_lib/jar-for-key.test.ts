import assert from 'node:assert/strict';
import { test } from 'node:test';

import { JarKey } from '@rumtelo/contracts';

import { jarForKey, jarKeysCoveredBy } from './jar-for-key';

const threePots = [
    { id: 'j-nec', key: JarKey.NECESSITIES },
    { id: 'j-lts', key: JarKey.LONG_TERM_SAVINGS },
    { id: 'j-play', key: JarKey.PLAY },
];

test('a pot the household has is returned as it is', () => {
    assert.equal(jarForKey(threePots, JarKey.PLAY)?.id, 'j-play');
    const withDaily = [...threePots, { id: 'j-daily', key: JarKey.DAILY }];
    assert.equal(jarForKey(withDaily, JarKey.DAILY)?.id, 'j-daily');
});

test('a pot that is off falls back to the main pot of its group', () => {
    assert.equal(jarForKey(threePots, JarKey.DAILY)?.id, 'j-nec');
    assert.equal(jarForKey(threePots, JarKey.GOALS)?.id, 'j-lts');
    assert.equal(jarForKey(threePots, JarKey.FINANCIAL_FREEDOM)?.id, 'j-lts');
    assert.equal(jarForKey(threePots, JarKey.EDUCATION)?.id, 'j-lts');
    assert.equal(jarForKey(threePots, JarKey.GIVE)?.id, 'j-play');
});

test('with Give on, the other Free pot does not take its giving', () => {
    const withGive = [...threePots, { id: 'j-give', key: JarKey.GIVE }];
    assert.equal(jarForKey(withGive, JarKey.GIVE)?.id, 'j-give');
    assert.equal(jarForKey(withGive, JarKey.PLAY)?.id, 'j-play');
});

test('no pot in the group means nothing, never the first pot of the list', () => {
    assert.equal(jarForKey([{ id: 'j-nec', key: JarKey.NECESSITIES }], JarKey.PLAY), undefined);
    assert.equal(jarForKey([], JarKey.NECESSITIES), undefined);
});

test('a lone main pot covers the categories of every key in its group', () => {
    assert.deepEqual(jarKeysCoveredBy(threePots, JarKey.NECESSITIES), [
        JarKey.NECESSITIES,
        JarKey.DAILY,
    ]);
    assert.deepEqual(jarKeysCoveredBy(threePots, JarKey.LONG_TERM_SAVINGS), [
        JarKey.LONG_TERM_SAVINGS,
        JarKey.GOALS,
        JarKey.FINANCIAL_FREEDOM,
        JarKey.EDUCATION,
    ]);
    assert.deepEqual(jarKeysCoveredBy(threePots, JarKey.PLAY), [JarKey.PLAY, JarKey.GIVE]);
});

test('a pot only covers what its group has no pot for', () => {
    const refined = [
        ...threePots,
        { id: 'j-daily', key: JarKey.DAILY },
        { id: 'j-edu', key: JarKey.EDUCATION },
    ];
    assert.deepEqual(jarKeysCoveredBy(refined, JarKey.NECESSITIES), [JarKey.NECESSITIES]);
    assert.deepEqual(jarKeysCoveredBy(refined, JarKey.DAILY), [JarKey.DAILY]);
    assert.deepEqual(jarKeysCoveredBy(refined, JarKey.EDUCATION), [JarKey.EDUCATION]);
    assert.deepEqual(jarKeysCoveredBy(refined, JarKey.LONG_TERM_SAVINGS), [
        JarKey.LONG_TERM_SAVINGS,
        JarKey.GOALS,
        JarKey.FINANCIAL_FREEDOM,
    ]);
});
