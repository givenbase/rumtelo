import { Collection, Entity, Index, ManyToOne, OneToMany, Property, Unique } from '@mikro-orm/core';

import { CatalogEntity } from '../../../../common/database/catalog.entity';
import { entityConfig } from '../../../../common/database/entity-config.util';
import type { PlanCapability } from '../plan-capability/plan-capability.entity';
import { PlanProduct } from '../plan-product/plan-product.entity';

/**
 * Plan Feature Entity
 *
 * Feature segment under a product (e.g. goals under growth).
 * Capability key = `{product.key}-{feature.key}`.
 *
 * @see PlanProduct — parent prefix
 * @see PlanCapability — gated keys under this feature
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'backoffice', tableName: 'plan_feature' }))
@Unique({ properties: ['product', 'key'] })
@Index({ properties: ['product'] })
export class PlanFeature extends CatalogEntity {
    // ? PROPERTIES
    /** Short explanation for catalog / Settings copy. */
    @Property({ type: 'text' })
    description!: string;

    // ? RELATIONSHIPS
    /** Owning product prefix (N:1). */
    @ManyToOne(() => PlanProduct, { deleteRule: 'cascade' })
    product!: PlanProduct;

    /** Capability keys under this feature (1:N). */
    @OneToMany('PlanCapability', 'feature')
    capabilities = new Collection<PlanCapability>(this);
}
