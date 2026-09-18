import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { IncomeMilestone } from './income-milestone.entity';

@Injectable()
export class IncomeMilestoneService {
    private readonly repo: HouseholdScopedRepository<IncomeMilestone>;
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {
        this.repo = new HouseholdScopedRepository(em, IncomeMilestone);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async list() {
        const rows = await this.repo.find();
        return rows.map(milestone => ({
            id: milestone.id,
            householdId: milestone.household,
            name: milestone.name,
            targetMonthly: milestone.targetMonthly,
            reachedOn: milestone.reachedOn,
        }));
    }
}
