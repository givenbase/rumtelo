import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import type { PlanKey } from '@rumtelo/contracts';

import { Plan } from './plan.entity';

/**
 * Plan Service
 *
 * Catalog of product tiers we publish. Households never write these rows.
 * Runtime gating uses PLAN_CAPABILITY_GRANTS from contracts; this service serves the catalog.
 */
@Injectable()
export class PlanService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    /** Active tiers in sortOrder / display order. */
    async listActive(): Promise<Plan[]> {
        return this.em.find(Plan, { isActive: true }, { orderBy: { sortOrder: 'ASC' } });
    }

    async findByKey(key: PlanKey): Promise<Plan | null> {
        return this.em.findOne(Plan, { key, isActive: true });
    }
}
