import {
    Collection,
    Entity,
    Enum,
    Index,
    ManyToOne,
    OneToMany,
    Property,
    Unique,
} from '@mikro-orm/core';
import { CapabilityKind } from '@rumtelo/contracts';

import { CatalogEntity } from '../../../../common/database/catalog.entity';
import { NativeEnum } from '../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../common/database/entity-config.util';
import type { PlanCapabilityGrant } from '../plan-capability-grant/plan-capability-grant.entity';
import { PlanFeature } from '../plan-feature/plan-feature.entity';

/**
 * Plan Capability Entity
 *
 * Capability catalog — one row per featureKey (`{product}-{feature}`).
 * Source of truth: contracts CAPABILITIES + CAPABILITY_CATALOG; this is the DB mirror.
 *
 * @see PlanFeature — parent segment
 * @see PlanCapabilityGrant — which plans grant this key
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'backoffice', tableName: 'plan_capability' }))
@Unique({ properties: ['key'] })
@Index({ properties: ['feature'] })
export class PlanCapability extends CatalogEntity {
    // ? PROPERTIES
    /** Short explanation for Settings / upgrade copy. */
    @Property({ type: 'text' })
    description!: string;

    // ? ENUMS
    /** screen = route area; action = discrete verb (invite, import, …). */
    @Enum(NativeEnum({ CapabilityKind, domain: 'backoffice' }))
    kind!: CapabilityKind;

    // ? RELATIONSHIPS
    /** Owning feature segment (N:1). */
    @ManyToOne(() => PlanFeature, { deleteRule: 'cascade' })
    feature!: PlanFeature;

    /** Plans that grant this capability (1:N to the grant rows). */
    @OneToMany('PlanCapabilityGrant', 'capability')
    grants = new Collection<PlanCapabilityGrant>(this);
}
