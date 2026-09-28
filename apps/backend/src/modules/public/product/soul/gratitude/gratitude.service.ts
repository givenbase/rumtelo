import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { AccountService } from '../../../../auth/user/account/account.service';
import { Gratitude } from './gratitude.entity';

@Injectable()
export class GratitudeService {
    private readonly repo: HouseholdScopedRepository<Gratitude>;
    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(AccountService) private readonly accounts: AccountService
    ) {
        this.repo = new HouseholdScopedRepository(em, Gratitude);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async create(input: { householdId: string; week: string; text: string }) {
        const { account } = await this.accounts.ensureCurrentAccount();
        const row = this.repo.create({
            account: account.id,
            week: input.week,
            text: input.text,
        });
        await this.em.persist(row).flush();
        return {
            id: row.id,
            householdId: row.household,
            accountId: row.account,
            week: row.week,
            text: row.text,
            createdAt: row.createdAt.toISOString(),
        };
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async forWeek(week: string) {
        const rows = await this.repo.find({ week }, { orderBy: { createdAt: 'DESC' } });
        return rows.map(gratitude => ({
            id: gratitude.id,
            householdId: gratitude.household,
            accountId: gratitude.account,
            week: gratitude.week,
            text: gratitude.text,
            createdAt: gratitude.createdAt.toISOString(),
        }));
    }
}
