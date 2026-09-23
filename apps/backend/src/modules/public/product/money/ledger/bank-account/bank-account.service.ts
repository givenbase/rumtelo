import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import { apiBadRequest, apiConflict } from '../../../../../../common/errors/api-user-error';

import { AccountKind } from '@rumtelo/contracts';
import { isValidIban, normalizeIban } from '@rumtelo/utils';

import { HouseholdScopedRepository } from '../../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../../common/household/household.context';
import { Bank } from '../../../../../backoffice/product/money/catalog/bank/bank.entity';

import { BankAccount } from './bank-account.entity';

@Injectable()
export class BankAccountService {
    private readonly repo: HouseholdScopedRepository<BankAccount>;
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {
        this.repo = new HouseholdScopedRepository(em, BankAccount);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async create(input: {
        name: string;
        iban?: string | null;
        kind: string;
        balance: number;
        bankId: string;
        settlementAccountId?: string | null;
        isPrimary?: boolean;
    }) {
        const name = input.name.trim();
        await this.assertNameAvailable(name);
        const iban = normalizeOptionalIban(input.iban);
        // UNIQUE(household, iban) backs this; the pre-check turns a 500 into a clear 409.
        if (iban && (await this.repo.findOne({ iban }))) {
            throw apiConflict('iban_already_linked');
        }
        const bank = await this.requireBank(input.bankId);
        const settlementAccount =
            input.kind === AccountKind.CREDIT
                ? await this.resolveSettlement(input.settlementAccountId)
                : null;
        const existing = await this.repo.find();
        const makePrimary = input.isPrimary === true || existing.length === 0;
        if (makePrimary) await this.clearPrimaries();
        const account = this.em.create(BankAccount, {
            household: currentHouseholdId(),
            name,
            iban,
            bank,
            settlementAccount,
            kind: input.kind as AccountKind,
            balance: input.balance,
            isPrimary: makePrimary,
        } as never);
        await this.em.persist(account).flush();
        return toDto(account);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async list() {
        const rows = await this.repo.find();
        await this.em.populate(rows, ['bank', 'settlementAccount']);
        return rows.map(toDto);
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    async update(input: {
        id: string;
        name?: string;
        iban?: string | null;
        kind?: string;
        bankId?: string;
        settlementAccountId?: string | null;
        isPrimary?: boolean;
    }) {
        const account = await this.repo.findOneOrFail({ id: input.id });
        await this.em.populate(account, ['bank', 'settlementAccount']);
        if (input.name !== undefined) {
            const name = input.name.trim();
            await this.assertNameAvailable(name, account.id);
            account.name = name;
        }
        if (input.kind !== undefined) {
            account.kind = input.kind as AccountKind;
            if (account.kind !== AccountKind.CREDIT) account.settlementAccount = null;
        }
        if (input.bankId !== undefined) account.bank = await this.requireBank(input.bankId);
        if (input.settlementAccountId !== undefined) {
            account.settlementAccount = await this.resolveSettlement(
                input.settlementAccountId,
                account.id
            );
        }
        if (input.iban !== undefined) {
            const iban = normalizeOptionalIban(input.iban);
            if (iban && iban !== account.iban) {
                const clash = await this.repo.findOne({ iban });
                if (clash && clash.id !== account.id) {
                    throw apiConflict('iban_already_linked');
                }
            }
            account.iban = iban;
        }
        if (input.isPrimary === true) {
            await this.clearPrimaries(account.id);
            account.isPrimary = true;
        } else if (input.isPrimary === false && account.isPrimary) {
            // Keep exactly one primary when possible — refuse clearing the only primary.
            const others = (await this.repo.find()).filter(row => row.id !== account.id);
            if (others.length === 0) {
                throw apiBadRequest('primary_account_required');
            }
            account.isPrimary = false;
            const next = pickNextPrimary(others);
            if (next) next.isPrimary = true;
        }
        await this.em.flush();
        return toDto(account);
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    async remove(id: string) {
        const account = await this.repo.findOneOrFail({ id });
        const wasPrimary = account.isPrimary;
        await this.em.remove(account).flush();
        if (wasPrimary) {
            const next = pickNextPrimary(await this.repo.find());
            if (next) {
                next.isPrimary = true;
                await this.em.flush();
            }
        }
        return { ok: true as const };
    }

    /** Case-insensitive unique account label within the household. */
    private async assertNameAvailable(name: string, exceptId?: string) {
        const needle = name.trim().toLowerCase();
        const clash = (await this.repo.find()).find(
            row => row.name.trim().toLowerCase() === needle && row.id !== exceptId
        );
        if (clash) throw apiConflict('account_name_taken');
    }

    private async clearPrimaries(exceptId?: string) {
        const rows = await this.repo.find({ isPrimary: true });
        for (const row of rows) {
            if (exceptId && row.id === exceptId) continue;
            row.isPrimary = false;
        }
    }

    private async requireBank(bankId: string): Promise<Bank> {
        const id = bankId?.trim();
        if (!id) throw apiBadRequest('bank_required');
        const bank = await this.em.findOne(Bank, { id, isActive: true });
        if (!bank) throw apiBadRequest('bank_not_found');
        return bank;
    }

    /** Same-household pay-from seat; cannot point at itself. */
    private async resolveSettlement(
        settlementAccountId: string | null | undefined,
        selfId?: string
    ): Promise<BankAccount | null> {
        if (settlementAccountId === null || settlementAccountId === undefined) return null;
        const id = settlementAccountId.trim();
        if (!id) return null;
        if (selfId && id === selfId) throw apiBadRequest('settlement_account_invalid');
        const seat = await this.repo.findOne({ id });
        if (!seat) throw apiBadRequest('settlement_account_invalid');
        if (seat.kind !== AccountKind.CHECKING && seat.kind !== AccountKind.SAVINGS) {
            throw apiBadRequest('settlement_account_invalid');
        }
        return seat;
    }
}

/** Prefer checking seats, then oldest — used when clearing or deleting the primary. */
function pickNextPrimary(rows: BankAccount[]): BankAccount | undefined {
    return [...rows].sort(
        (left, right) =>
            (left.kind === AccountKind.CHECKING ? 0 : 1) -
                (right.kind === AccountKind.CHECKING ? 0 : 1) ||
            left.createdAt.getTime() - right.createdAt.getTime()
    )[0];
}

function normalizeOptionalIban(value: string | null | undefined): string | null {
    if (value === null || value === undefined || !value.trim()) return null;
    if (!isValidIban(value)) {
        throw apiBadRequest('invalid_iban');
    }
    return normalizeIban(value);
}

export function toDto(account: BankAccount) {
    return {
        id: account.id,
        householdId: account.household,
        name: account.name,
        iban: account.iban,
        kind: account.kind,
        balance: account.balance,
        bankId: account.bank.id,
        settlementAccountId: account.settlementAccount?.id ?? null,
        connectionId: account.connectionId,
        lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
        isPrimary: account.isPrimary,
    };
}
