import { describe, expect, it, vi } from 'vitest';

import { AccountKind, HouseholdAccessSource } from '@rumtelo/contracts';

import { householdStorage } from '../../../../../../common/household/household.context';
import { BankAccountService } from './bank-account.service';

type Row = Record<string, unknown>;

function setup(account: Row) {
    const em = {
        find: vi.fn<() => Promise<Row[]>>(async () => [account]),
        findOne: vi.fn<(entity: unknown, where: Row) => Promise<Row | null>>(
            async (_entity, where) =>
                where.id === account.id && where.household === 'household-a'
                    ? account
                    : where.key !== undefined || where.isActive !== undefined
                      ? { id: 'bank-new' }
                      : null
        ),
        populate: vi.fn<() => Promise<void>>(async () => {}),
        flush: vi.fn<() => Promise<void>>(async () => {}),
    };
    const service = new BankAccountService(em as never, {} as never, {} as never);
    const update = (input: { bankId?: string | null }) =>
        householdStorage.run(
            {
                userId: 'user-1',
                householdId: 'household-a',
                role: 'MEMBER',
                source: HouseholdAccessSource.SEAT,
                relation: null,
            },
            () => service.update({ id: 'account-1', ...input })
        );
    return { update, em };
}

function accountRow(overrides: Row = {}): Row {
    return {
        id: 'account-1',
        household: 'household-a',
        name: 'Account',
        iban: null,
        kind: AccountKind.CHECKING,
        balance: 0,
        bank: null,
        settlementAccount: null,
        connectionId: null,
        lastSyncedAt: null,
        isPrimary: true,
        ...overrides,
    };
}

describe('BankAccountService.update: clearing the bank', () => {
    it('refuses bankId null on an account that has a bank', async () => {
        const { update } = setup(accountRow({ bank: { id: 'bank-ing', key: 'ing' } }));
        await expect(update({ bankId: null })).rejects.toThrow('bank_required');
    });

    it('refuses bankId null on a linked account (connectionId set)', async () => {
        const { update } = setup(accountRow({ connectionId: 'session::uid' }));
        await expect(update({ bankId: null })).rejects.toThrow('bank_required');
    });

    it('allows null as a no-op on the bankless Main account', async () => {
        const { update } = setup(accountRow());
        const result = await update({ bankId: null });
        expect(result.bankId).toBeNull();
    });

    it('lets the Main account pick its bank later', async () => {
        const { update } = setup(accountRow());
        const result = await update({ bankId: 'bank-new' });
        expect(result.bankId).toBe('bank-new');
    });
});
