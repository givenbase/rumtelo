import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { IncomeLever } from './income-lever.entity';

/** Things that move earning power. A Growth surface, not a budget line. */
@Injectable()
export class IncomeLeverService {
    private readonly repo: HouseholdScopedRepository<IncomeLever>;
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {
        this.repo = new HouseholdScopedRepository(em, IncomeLever);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async list() {
        const rows = await this.repo.find();
        return rows.map(lever => ({
            id: lever.id,
            householdId: lever.household,
            name: lever.name,
            note: lever.note,
            potentialMonthly: lever.potentialMonthly,
            isDone: lever.isDone,
        }));
    }
}
