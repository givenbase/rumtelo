import { Entity, Index, ManyToOne, Unique } from '@mikro-orm/core';

import { BaseEntity } from '../../../../common/database/base.entity';
import { entityConfig } from '../../../../common/database/entity-config.util';
import { PlanCapability } from '../plan-capability/plan-capability.entity';
import { Plan } from '../plan.entity';

/**
 * Plan Capability Grant Entity
 *
 * Plan ↔ PlanCapability link — which tier unlocks which capability key.
 * Mirrors contracts PLAN_CAPABILITY_GRANTS; runtime gating still reads contracts.
 *
 * @see Plan.grants / PlanCapability.grants
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'backoffice', tableName: 'plan_capability_grant' }))
@Unique({ properties: ['plan', 'capability'] })
@Index({ properties: ['capability'] })
export class PlanCapabilityGrant extends BaseEntity {
    // ? RELATIONSHIPS
    /** Granting plan (N:1). Deleting the plan deletes its grants. */
    @ManyToOne(() => Plan, { deleteRule: 'cascade' })
    plan!: Plan;

    /** Granted capability (N:1). Deleting the capability deletes its grants. */
    @ManyToOne(() => PlanCapability, { deleteRule: 'cascade' })
    capability!: PlanCapability;
}
