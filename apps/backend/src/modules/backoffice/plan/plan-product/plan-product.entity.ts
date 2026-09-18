import { Collection, Entity, OneToMany, Unique } from '@mikro-orm/core';

import { CatalogEntity } from '../../../../common/database/catalog.entity';
import { entityConfig } from '../../../../common/database/entity-config.util';
import type { PlanFeature } from '../plan-feature/plan-feature.entity';

/**
 * Plan Product Entity
 *
 * Catalog product prefix (home | money | growth | energy | soul | platform).
 * Named PlanProduct to avoid clashing with backoffice/product domain modules.
 *
 * @see PlanFeature — segments under this product
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'backoffice', tableName: 'plan_product' }))
@Unique({ properties: ['key'] })
export class PlanProduct extends CatalogEntity {
    // ? RELATIONSHIPS
    /** Feature segments under this product (1:N). */
    @OneToMany('PlanFeature', 'product')
    features = new Collection<PlanFeature>(this);
}
