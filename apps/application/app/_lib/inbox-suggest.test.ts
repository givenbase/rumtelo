import assert from 'node:assert/strict';
import { test } from 'node:test';

import { JarKey, type Jar, type MerchantPreset, type Transaction } from '@rumtelo/contracts';

import { suggestInboxJar } from './inbox-suggest';

const threePots = [
    { id: 'j-nec', key: JarKey.NECESSITIES },
    { id: 'j-lts', key: JarKey.LONG_TERM_SAVINGS },
    { id: 'j-play', key: JarKey.PLAY },
] as Pick<Jar, 'id' | 'key'>[];

function merchant(name: string, jarKey: JarKey): MerchantPreset {
    return { name, matchValue: name, aliases: [], jarKey } as unknown as MerchantPreset;
}

function outflow(counterparty: string, amount = -4_500): Transaction {
    return { id: 't-1', counterparty, description: counterparty, amount } as Transaction;
}

function suggest(transaction: Transaction, merchants: MerchantPreset[], jars = threePots) {
    return suggestInboxJar({
        transaction,
        jars,
        merchants,
        rules: [],
        payeeMemory: new Map(),
    });
}

test('a merchant of a pot that is off lands in the main pot of its group, with high confidence', () => {
    const hit = suggest(outflow('Albert Heijn'), [merchant('Albert Heijn', JarKey.DAILY)]);
    assert.deepEqual(hit, { jarId: 'j-nec', jarKey: JarKey.NECESSITIES, confidence: 'high' });

    const giving = suggest(outflow('Rode Kruis'), [merchant('Rode Kruis', JarKey.GIVE)]);
    assert.deepEqual(giving, { jarId: 'j-play', jarKey: JarKey.PLAY, confidence: 'high' });
});

test('a merchant of a pot the household has keeps that pot', () => {
    const withDaily = [...threePots, { id: 'j-daily', key: JarKey.DAILY }] as typeof threePots;
    const hit = suggest(
        outflow('Albert Heijn'),
        [merchant('Albert Heijn', JarKey.DAILY)],
        withDaily
    );
    assert.equal(hit.jarId, 'j-daily');
});

test('the amount fallback stays a low-confidence guess in a main pot', () => {
    assert.deepEqual(suggest(outflow('Unknown', -500), []), {
        jarId: 'j-play',
        jarKey: JarKey.PLAY,
        confidence: 'low',
    });
    assert.deepEqual(suggest(outflow('Unknown', -9_000), []), {
        jarId: 'j-nec',
        jarKey: JarKey.NECESSITIES,
        confidence: 'low',
    });
});
