import { Collection, Entity, Enum, ManyToOne, OneToMany, Property, Unique } from '@mikro-orm/core';
import { CapabilityKind } from '@rumtelo/contracts';

import { BaseEntity } from '../../../../common/database/base.entity';
import { NativeEnum } from '../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../common/database/entity-config.util';

import type { PlanCapability } from '../plan-capability/plan-capability.entity';
import { PlanFeature } from '../feature/feature.entity';

/**
 * Capability catalog — one row per featureKey (`{product}-{feature}`).
 * Source of truth: contracts CAPABILITIES + CAPABILITY_CATALOG.
 *
 * @see PlanCapability — which plans grant this key
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'backoffice', tableName: 'capability' }))
@Unique({ properties: ['key'] })
export class Capability extends BaseEntity {
    // ? PROPERTIES
    /** Full featureKey — e.g. money-debt, growth-goals (stable after launch). */
    @Property({ length: 64 })
    key!: string;

    /** Label shown in catalog / plan comparison. */
    @Property({ length: 120 })
    name!: string;

    /** Short explanation for Settings / upgrade copy. */
    @Property({ type: 'text' })
    description!: string;

    /** Display / seed order. */
    @Property({ default: 0 })
    sortOrder = 0;

    /** Soft-disable without breaking historical grant rows. */
    @Property({ default: true })
    isActive = true;

    // ? ENUMS
    /** screen = route area; action = discrete verb (invite, import, …). */
    @Enum(NativeEnum({ CapabilityKind, domain: 'backoffice' }))
    kind!: CapabilityKind;

    // ? RELATIONSHIPS
    @ManyToOne(() => PlanFeature, { deleteRule: 'cascade' })
    feature!: PlanFeature;

    @OneToMany('PlanCapability', 'capability')
    planGrants = new Collection<PlanCapability>(this);
}
