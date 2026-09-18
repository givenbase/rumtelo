import { Collection, Entity, Enum, OneToMany, Property, Unique } from '@mikro-orm/core';
import { PlanKey } from '@rumtelo/contracts';

import { BaseEntity } from '../../../common/database/base.entity';
import { MoneyType } from '../../../common/database/money.type';
import { NativeEnum } from '../../../common/database/native-enum.util';
import { entityConfig } from '../../../common/database/entity-config.util';
import type { PlanCapabilityGrant } from './plan-capability-grant/plan-capability-grant.entity';

/**
 * Plan Entity
 *
 * Rumtelo-owned product tiers (Basic / Plus / Max).
 * We write these rows; households only *subscribe* (later) or read for gating.
 * Runtime checks use PLAN_CAPABILITY_GRANTS from contracts; the grant rows are
 * the DB mirror of that graph. Display / tier order is `sortOrder` only (0 = Basic …).
 *
 * Stays on BaseEntity (not CatalogEntity) because its key is the `PlanKey` enum.
 *
 * @see PlanCapability / PlanCapabilityGrant — normalized grant graph
 * @see product/money/plan — household money split (jars), unrelated
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'backoffice', tableName: 'plan' }))
@Unique({ properties: ['key'] })
export class Plan extends BaseEntity {
    // ? PROPERTIES
    /** Product name shown in UI (Basic, Plus, Max). */
    @Property({ length: 40 })
    name!: string;

    /** List price per month in eurocents. Free tier is 0. */
    @Property({ type: MoneyType, default: 0 })
    priceMonthly = 0;

    /** Ascending tier order — Basic = 0, Plus = 1, Max = 2. */
    @Property({ default: 0 })
    sortOrder = 0;

    /** Soft-disable without breaking historical subscriptions that used this key. */
    @Property({ default: true })
    isActive = true;

    // ? ENUMS
    /** Stable tier key — used in gating and billing mapping. */
    @Enum(NativeEnum({ PlanKey, domain: 'backoffice' }))
    key!: PlanKey;

    // ? RELATIONSHIPS
    /** Capabilities this tier unlocks (1:N to the grant rows). */
    @OneToMany('PlanCapabilityGrant', 'plan')
    grants = new Collection<PlanCapabilityGrant>(this);
}
