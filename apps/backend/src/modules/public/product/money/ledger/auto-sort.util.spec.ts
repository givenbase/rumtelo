import { describe, expect, it } from 'vitest';

import { JarKey, TransactionStatus } from '@rumtelo/contracts';

import type { MerchantPreset } from '../../../../backoffice/product/money/preset/merchant/merchant.entity';
import type { Jar } from '../plan/jar/jar.entity';
import { type AutoSortRow, autoSortRows } from './auto-sort.util';

function jar(key: JarKey): Jar {
    return { id: `jar-${key}`, key } as unknown as Jar;
}

/** A catalog merchant that points at `key`, matching the word `needle`. */
function merchant(needle: string, key: JarKey): MerchantPreset {
    return {
        key: `merchant-${needle}`,
        sortOrder: 0,
        jarTemplate: { key },
        categoryTemplate: { name: 'Anything' },
        matching: { matchValue: needle, aliases: [], matchPriority: 1, mcc: null },
    } as unknown as MerchantPreset;
}

function inboxRow(description: string): AutoSortRow {
    return {
        amount: -12_00,
        description,
        counterparty: null,
        status: TransactionStatus.INBOX,
        jar: null,
        category: null,
        appliedRule: null,
        appliedMerchantKey: null,
    };
}

function context(keys: JarKey[], merchants: MerchantPreset[]) {
    return {
        rules: [],
        merchants,
        jarsByKey: new Map(keys.map(key => [key, jar(key)])),
        categoryByJarAndName: new Map(),
    };
}

const THREE_POTS = [JarKey.NECESSITIES, JarKey.LONG_TERM_SAVINGS, JarKey.PLAY];

describe('autoSortRows merchant fallback to the main pot', () => {
    it('sorts a merchant that points at a pot the household has not turned on into the group main pot', () => {
        const rows = [inboxRow('Albert Heijn 1234'), inboxRow('Spotify'), inboxRow('Donation')];
        const sorted = autoSortRows(
            rows,
            context(THREE_POTS, [
                merchant('albert heijn', JarKey.DAILY),
                merchant('spotify', JarKey.PLAY),
                merchant('donation', JarKey.GIVE),
            ])
        );

        expect(sorted).toBe(3);
        expect(rows.map(row => row.jar?.key)).toEqual([
            JarKey.NECESSITIES,
            JarKey.PLAY,
            JarKey.PLAY,
        ]);
        expect(rows.every(row => row.status === TransactionStatus.SORTED)).toBe(true);
    });

    it('uses the pot itself when the household has turned it on', () => {
        const rows = [inboxRow('Albert Heijn 1234')];
        autoSortRows(
            rows,
            context([...THREE_POTS, JarKey.DAILY], [merchant('albert heijn', JarKey.DAILY)])
        );

        expect(rows[0]!.jar?.key).toBe(JarKey.DAILY);
    });

    it('still leaves a merchant in the inbox when its pot cannot take an outflow', () => {
        const rows = [inboxRow('Brokerage fee')];
        const sorted = autoSortRows(
            rows,
            context(
                [...THREE_POTS, JarKey.FINANCIAL_FREEDOM],
                [merchant('brokerage', JarKey.FINANCIAL_FREEDOM)]
            )
        );

        expect(sorted).toBe(0);
        expect(rows[0]!.status).toBe(TransactionStatus.INBOX);
    });

    it('leaves the row in the inbox when the group main pot is missing too (never a null jar)', () => {
        const rows = [inboxRow('Donation')];
        const sorted = autoSortRows(
            rows,
            context([JarKey.NECESSITIES], [merchant('donation', JarKey.GIVE)])
        );

        expect(sorted).toBe(0);
        expect(rows[0]!.jar).toBeNull();
    });
});
