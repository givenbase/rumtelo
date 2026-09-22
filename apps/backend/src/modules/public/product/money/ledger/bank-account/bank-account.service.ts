import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import { apiBadRequest, apiConflict } from '../../../../../../common/errors/api-user-error';

import { type AccountKind } from '@rumtelo/contracts';
import { isValidIban, normalizeIban } from '@rumtelo/utils';

import { HouseholdScopedRepository } from '../../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../../common/household/household.context';

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

    async create(input: { name: string; iban?: string | null; kind: string; balance: number }) {
        const iban = normalizeOptionalIban(input.iban);
        // UNIQUE(household, iban) backs this; the pre-check turns a 500 into a clear 409.
        if (iban && (await this.repo.findOne({ iban }))) {
            throw apiConflict('iban_already_linked');
        }
        const account = this.em.create(BankAccount, {
            household: currentHouseholdId(),
            name: input.name,
            iban,
            kind: input.kind as AccountKind,
            balance: input.balance,
        } as never);
        await this.em.persist(account).flush();
        return toDto(account);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async list() {
        const rows = await this.repo.find();
        return rows.map(toDto);
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    async update(input: { id: string; name?: string; iban?: string | null; kind?: string }) {
        const account = await this.repo.findOneOrFail({ id: input.id });
        if (input.name !== undefined) account.name = input.name.trim();
        if (input.kind !== undefined) account.kind = input.kind as AccountKind;
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
        await this.em.flush();
        return toDto(account);
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    async remove(id: string) {
        const account = await this.repo.findOneOrFail({ id });
        await this.em.remove(account).flush();
        return { ok: true as const };
    }
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
        connectionId: account.connectionId,
        lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
    };
}
