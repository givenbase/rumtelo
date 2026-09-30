import { type EntityManager } from '@mikro-orm/postgresql';
import { AccountKind } from '@rumtelo/contracts';

import { apiBadRequest, apiNotFound } from '../../../../common/errors/api-user-error';
import { currentHouseholdId } from '../../../../common/household/household.context';
import { Bank } from '../../../backoffice/product/money/catalog/bank/bank.entity';
import { BankAccount } from './ledger/bank-account/bank-account.entity';

const DEPOSIT_KINDS = new Set<AccountKind>([
    AccountKind.CHECKING,
    AccountKind.SAVINGS,
    AccountKind.CASH,
]);

export type DepositLinkIds = {
    bankId: string | null;
    accountId: string | null;
};

/**
 * Resolve optional deposit bank / account on an income source.
 *
 * Rules:
 * - account set → bank synced from that account (seat wins)
 * - account cleared → bank left as provided / previous (caller decides)
 * - bank alone → must exist in catalog
 * - credit seats are not valid deposit targets
 */
export async function resolveDepositLinks(
    em: EntityManager,
    input: { bankId?: string | null; accountId?: string | null },
    previous: DepositLinkIds = { bankId: null, accountId: null }
): Promise<DepositLinkIds> {
    let accountId = input.accountId !== undefined ? input.accountId : previous.accountId;
    let bankId = input.bankId !== undefined ? input.bankId : previous.bankId;

    if (accountId) {
        const account = await loadDepositAccount(em, accountId);
        accountId = account.id;
        bankId = bankIdOf(account);
        return { bankId, accountId };
    }

    if (bankId) {
        await assertBankExists(em, bankId);
        return { bankId, accountId: null };
    }

    return { bankId: null, accountId: null };
}

async function loadDepositAccount(em: EntityManager, accountId: string): Promise<BankAccount> {
    const account = await em.findOne(
        BankAccount,
        { id: accountId, household: currentHouseholdId() },
        { populate: ['bank'] }
    );
    if (!account) throw apiNotFound('bank_account_not_found');
    if (!DEPOSIT_KINDS.has(account.kind)) {
        throw apiBadRequest('settlement_account_invalid');
    }
    return account;
}

async function assertBankExists(em: EntityManager, bankId: string): Promise<void> {
    const bank = await em.findOne(Bank, { id: bankId, isActive: true });
    if (!bank) throw apiNotFound('bank_not_found');
}

function bankIdOf(account: BankAccount): string {
    const bank = account.bank;
    return typeof bank === 'string' ? bank : bank.id;
}
