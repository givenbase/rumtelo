import { Entity, Enum, ManyToOne, Unique } from '@mikro-orm/core';
import { PlanKey } from '@rumtelo/contracts';

import { BaseEntity } from '../../../../common/database/base.entity';
import { NativeEnum } from '../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../common/database/entity-config.util';

import { Capability } from '../capability/capability.entity';
import { Plan } from '../plan.entity';

/**
 * Plan ↔ Capability grant — which tier unlocks which capability key.
 * Mirrors contracts PLAN_CAPABILITY_GRANTS. Runtime gating still uses contracts.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'backoffice', tableName: 'plan_capability' }))
@Unique({ properties: ['planKey', 'capability'] })
export class PlanCapability extends BaseEntity {
    // ? ENUMS
    /** Denormalized plan key for simple queries (matches Plan.key). */
    @Enum(NativeEnum({ PlanKey, domain: 'backoffice' }))
    planKey!: PlanKey;

    // ? RELATIONSHIPS
    @ManyToOne(() => Plan, { deleteRule: 'cascade' })
    plan!: Plan;

    @ManyToOne(() => Capability, { deleteRule: 'cascade' })
    capability!: Capability;
}
