import { EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';

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
            throw new ConflictException('This IBAN is already linked to an account.');
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
}

function normalizeOptionalIban(value: string | null | undefined): string | null {
    if (value === null || value === undefined || !value.trim()) return null;
    if (!isValidIban(value)) {
        throw new BadRequestException('Invalid IBAN — check the number and try again.');
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
