import assert from 'node:assert/strict';
import { test } from 'node:test';

import { JarKey } from '@rumtelo/contracts';

import { assignFixedCostsToPots, fixedCostPots } from './fixed-cost-pots';

const threePots = [
    { key: JarKey.PLAY, name: 'Free', icon: null },
    { key: JarKey.NECESSITIES, name: 'Basics', icon: null },
    { key: JarKey.LONG_TERM_SAVINGS, name: 'Future', icon: null },
];

test('the pots follow the household, in group order', () => {
    assert.deepEqual(
        fixedCostPots(threePots, []).map(pot => pot.key),
        [JarKey.NECESSITIES, JarKey.LONG_TERM_SAVINGS, JarKey.PLAY]
    );
});

test('a bill under a pot that is off is listed under the main pot of its group', () => {
    const pots = fixedCostPots(threePots, []);
    const bills = [
        { id: 'rent', jarKey: JarKey.NECESSITIES },
        { id: 'club', jarKey: JarKey.EDUCATION },
        { id: 'charity', jarKey: JarKey.GIVE },
    ];
    assert.deepEqual(
        assignFixedCostsToPots(pots, bills).map(bill => [bill.id, bill.jarKey]),
        [
            ['rent', JarKey.NECESSITIES],
            ['club', JarKey.LONG_TERM_SAVINGS],
            ['charity', JarKey.PLAY],
        ]
    );
});

test('a bill under a pot the household turned on stays there', () => {
    const pots = fixedCostPots(
        [...threePots, { key: JarKey.GIVE, name: 'Giving', icon: null }],
        []
    );
    const [charity] = assignFixedCostsToPots(pots, [{ id: 'charity', jarKey: JarKey.GIVE }]);
    assert.equal(charity?.jarKey, JarKey.GIVE);
});

test('before the pots load, the list shows the pots the bills sit under, never empty', () => {
    assert.deepEqual(
        fixedCostPots([], [JarKey.PLAY, JarKey.NECESSITIES]).map(pot => pot.key),
        [JarKey.NECESSITIES, JarKey.PLAY]
    );
});
