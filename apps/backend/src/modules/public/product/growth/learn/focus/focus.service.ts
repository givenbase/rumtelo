import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import { type LearnSkillKey } from '@rumtelo/contracts';

import { HouseholdScopedRepository } from '../../../../../../common/household/household-scoped.repository';
import { AccountService } from '../../../../../auth/user/account/account.service';
import { LearnSkillFocus } from './focus.entity';

@Injectable()
export class FocusService {
    private readonly rows: HouseholdScopedRepository<LearnSkillFocus>;

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(AccountService) private readonly accounts: AccountService
    ) {
        this.rows = new HouseholdScopedRepository(em, LearnSkillFocus);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** Skill keys the signed-in person has in focus. */
    async list(): Promise<string[]> {
        const accountId = await this.accountId();
        const rows = await this.rows.find({ account: accountId });
        return rows.map(row => row.skill);
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    async focus(skill: LearnSkillKey, on: boolean): Promise<{ skill: LearnSkillKey; on: boolean }> {
        const accountId = await this.accountId();
        const existing = await this.rows.findOne({ account: accountId, skill });
        if (on && !existing) {
            const row = this.rows.create({ account: accountId, skill });
            await this.em.persist(row).flush();
        }
        if (!on && existing) {
            this.rows.remove(existing);
            await this.em.flush();
        }
        return { skill, on };
    }

    private async accountId(): Promise<string> {
        const { account } = await this.accounts.ensureCurrentAccount();
        return account.id;
    }
}
