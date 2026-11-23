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

const threePots = [
    { id: 'j-nec', key: JarKey.NECESSITIES },
    { id: 'j-lts', key: JarKey.LONG_TERM_SAVINGS },
    { id: 'j-play', key: JarKey.PLAY },
];

test('three pots, one account: every pot sits on it', () => {
    assert.deepEqual(jarPlacementForAccounts(threePots, ['acc-1']), {
        'j-nec': 'acc-1',
        'j-lts': 'acc-1',
        'j-play': 'acc-1',
    });
});

test('three pots, several accounts: Basics (Necessities) is pre-mapped, the rest stays open', () => {
    assert.deepEqual(jarPlacementForAccounts(threePots, ['acc-1', 'acc-2']), {
        'j-nec': 'acc-1',
    });
});
