import { Collection, Entity, OneToMany, Property, Unique } from '@mikro-orm/core';

import { BaseEntity } from '../../../../common/database/base.entity';
import { entityConfig } from '../../../../common/database/entity-config.util';

import type { PlanFeature } from '../feature/feature.entity';

/**
 * PlanProduct — catalog product prefix (home | money | growth | energy | soul | platform).
 * Named PlanProduct to avoid clashing with backoffice/product domain modules.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'backoffice', tableName: 'plan_product' }))
@Unique({ properties: ['key'] })
export class PlanProduct extends BaseEntity {
    // ? PROPERTIES
    /** Stable product key — money | growth | … (never rename in place). */
    @Property({ length: 32 })
    key!: string;

    /** Label for catalog / admin. */
    @Property({ length: 120 })
    name!: string;

    /** Display / seed order. */
    @Property({ default: 0 })
    sortOrder = 0;

    /** Soft-disable without breaking feature FKs. */
    @Property({ default: true })
    isActive = true;

    // ? RELATIONSHIPS
    @OneToMany('PlanFeature', 'product')
    features = new Collection<PlanFeature>(this);
}
