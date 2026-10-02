import assert from 'node:assert/strict';
import { test } from 'node:test';

import { JarKey } from '@rumtelo/contracts';

import { jarPlacementForAccounts } from './jar-bank-plan';

const jars = [
    { id: 'j-nec', key: JarKey.NECESSITIES },
    { id: 'j-play', key: JarKey.PLAY },
];

test('one account maps every jar', () => {
    assert.deepEqual(jarPlacementForAccounts(jars, ['acc-1']), {
        'j-nec': 'acc-1',
        'j-play': 'acc-1',
    });
});

test('several accounts pre-map Necessity only', () => {
    assert.deepEqual(jarPlacementForAccounts(jars, ['acc-1', 'acc-2']), {
        'j-nec': 'acc-1',
    });
});

test('no accounts yields empty placement', () => {
    assert.deepEqual(jarPlacementForAccounts(jars, []), {});
});
