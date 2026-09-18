import { Collection, Entity, ManyToOne, OneToMany, Property, Unique } from '@mikro-orm/core';

import { BaseEntity } from '../../../../common/database/base.entity';
import { entityConfig } from '../../../../common/database/entity-config.util';

import type { Capability } from '../capability/capability.entity';
import { PlanProduct } from '../product/product.entity';

/**
 * PlanFeature — feature segment under a product (e.g. goals under growth).
 * Capability key = `{product.key}-{feature.key}`.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'backoffice', tableName: 'plan_feature' }))
@Unique({ properties: ['product', 'key'] })
export class PlanFeature extends BaseEntity {
    // ? PROPERTIES
    /** URL / key segment — goals | debt | fixed-costs | …. */
    @Property({ length: 64 })
    key!: string;

    /** Label shown in catalog. */
    @Property({ length: 120 })
    name!: string;

    /** Short explanation. */
    @Property({ type: 'text' })
    description!: string;

    /** Display / seed order within product. */
    @Property({ default: 0 })
    sortOrder = 0;

    /** Soft-disable without breaking capability FKs. */
    @Property({ default: true })
    isActive = true;

    // ? RELATIONSHIPS
    @ManyToOne(() => PlanProduct, { deleteRule: 'cascade' })
    product!: PlanProduct;

    @OneToMany('Capability', 'feature')
    capabilities = new Collection<Capability>(this);
}
