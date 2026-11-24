import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { WorkSituation, YearIntention } from '../../../platform/enums';
import { AccountKind } from '../enums';
import { ArchiveAccountSettings, ArchiveBankAccount } from './archive.schema';

describe('ArchiveBankAccount', () => {
    it('round-trips a bankless Main account (null bankKey) without losing it', () => {
        const exported = {
            name: 'Main account',
            kind: AccountKind.CHECKING,
            bankKey: null,
            iban: null,
            balance: 0,
            isPrimary: true,
            wasConnected: false,
            settlementAccountName: null,
        };
        const restored = ArchiveBankAccount.parse(JSON.parse(JSON.stringify(exported)));
        assert.equal(restored.bankKey, null);
        assert.equal(restored.name, 'Main account');
        assert.equal(restored.isPrimary, true);
    });

    it('accepts an older export that has no bankKey field at all', () => {
        const restored = ArchiveBankAccount.parse({
            name: 'Main account',
            kind: AccountKind.CHECKING,
        });
        assert.equal(restored.bankKey ?? null, null);
    });

    it('still carries a catalog bankKey', () => {
        const restored = ArchiveBankAccount.parse({
            name: 'Joint',
            kind: AccountKind.CHECKING,
            bankKey: 'ing',
        });
        assert.equal(restored.bankKey, 'ing');
    });

    it('still rejects an empty-string bankKey', () => {
        assert.throws(() =>
            ArchiveBankAccount.parse({ name: 'Joint', kind: AccountKind.CHECKING, bankKey: '' })
        );
    });
});

describe('ArchiveAccountSettings', () => {
    it('accepts an older export without the person answers', () => {
        const restored = ArchiveAccountSettings.parse({ locale: 'NL', theme: 'LIGHT' });
        assert.equal(restored.direction, undefined);
        assert.equal(restored.workSituation, undefined);
    });

    it('accepts an export with the person answers', () => {
        const restored = ArchiveAccountSettings.parse({
            workSituation: WorkSituation.EMPLOYED,
            yearIntention: YearIntention.GROW,
            direction: '  Debt free  ',
            directionWhy: null,
        });
        assert.equal(restored.direction, 'Debt free');
        assert.equal(restored.directionWhy, null);
        assert.equal(restored.yearIntention, YearIntention.GROW);
    });

    it('rejects a direction over 280 characters', () => {
        assert.throws(() => ArchiveAccountSettings.parse({ direction: 'a'.repeat(281) }));
    });
});
