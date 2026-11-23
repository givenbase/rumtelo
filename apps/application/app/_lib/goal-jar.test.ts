import assert from 'node:assert/strict';
import { test } from 'node:test';

import { GoalKind, JarKey } from '@rumtelo/contracts';

import { giveNeedsPot, goalJarFor, goalPresetJarFor } from './goal-jar';

const threePots = [
    { id: 'j-nec', key: JarKey.NECESSITIES },
    { id: 'j-lts', key: JarKey.LONG_TERM_SAVINGS },
    { id: 'j-play', key: JarKey.PLAY },
];
const withGive = [...threePots, { id: 'j-give', key: JarKey.GIVE }];

test('a Give goal goes to the Give pot, or to none — never to Play', () => {
    assert.equal(goalJarFor(withGive, GoalKind.GIVE)?.id, 'j-give');
    assert.equal(goalJarFor(threePots, GoalKind.GIVE), null);
    assert.equal(goalJarFor([], GoalKind.GIVE), null);
});

test('a Give pledge needs the pot turned on first', () => {
    assert.equal(giveNeedsPot(threePots, GoalKind.GIVE), true);
    assert.equal(giveNeedsPot(withGive, GoalKind.GIVE), false);
    assert.equal(giveNeedsPot(threePots, GoalKind.SAVE), false);
    assert.equal(giveNeedsPot(threePots, GoalKind.EARN), false);
});

test('a save goal defaults to Future main pot, an earn goal to no pot', () => {
    assert.equal(goalJarFor(threePots, GoalKind.SAVE)?.id, 'j-lts');
    assert.equal(goalJarFor(withGive, GoalKind.SAVE)?.id, 'j-lts');
    assert.equal(goalJarFor(threePots, GoalKind.EARN), null);
});

test('a preset pot that is off falls back to the group main pot, except Give', () => {
    assert.equal(goalPresetJarFor(threePots, JarKey.EDUCATION)?.id, 'j-lts');
    assert.equal(goalPresetJarFor(threePots, JarKey.GIVE), null);
    assert.equal(goalPresetJarFor(withGive, JarKey.GIVE)?.id, 'j-give');
});
