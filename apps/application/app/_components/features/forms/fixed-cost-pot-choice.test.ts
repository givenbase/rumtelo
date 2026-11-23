import assert from 'node:assert/strict';
import { test } from 'node:test';

import { JarKey } from '@rumtelo/contracts';

import { potChoiceFor } from './fixed-cost-pot-choice';

test('the Basics bills pot answers "must", the Free main pot answers "choose"', () => {
    assert.equal(potChoiceFor(JarKey.NECESSITIES), 'must');
    assert.equal(potChoiceFor(JarKey.PLAY), 'choose');
});

test('every other pot was picked by hand and answers neither', () => {
    const others = Object.values(JarKey).filter(
        key => key !== JarKey.NECESSITIES && key !== JarKey.PLAY
    );
    assert.equal(others.length, 6);
    for (const key of others) assert.equal(potChoiceFor(key), null, key);
});

test('no pot selected yet highlights nothing', () => {
    assert.equal(potChoiceFor(null), null);
    assert.equal(potChoiceFor(undefined), null);
});
