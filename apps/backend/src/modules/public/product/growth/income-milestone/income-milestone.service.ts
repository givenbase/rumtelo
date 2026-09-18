import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { IncomeMilestone } from './milestone.entity';

@Injectable()
export class MilestoneService {
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
            label: milestone.label,
            targetMonthly: Number(milestone.targetMonthly),
            reachedOn: milestone.reachedOn,
        }));
    }
}
