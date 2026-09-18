import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/core';

import { CatalogEntity } from '../../../../../../common/database/catalog.entity';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { CategoryTemplate } from '../../template/category/category.entity';
import { JarTemplate } from '../../template/jar/jar.entity';

/**
 * Goal Preset Entity
 *
 * Suggestion catalog for “New goal” — name + default jar template (+ icon).
 * Households copy into money.goal; jar is resolved by jarTemplate.key.
 *
 * @see JarTemplate — default savings / education jar
 * @see money.goal — household-owned instances
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'money',
        tableName: 'goal_preset',
    })
)
@Unique({ properties: ['key'] })
@Index({ properties: ['jarTemplate'] })
@Index({ properties: ['categoryTemplate'] })
export class GoalPreset extends CatalogEntity {
    // ? PROPERTIES
    /** Optional emoji / short icon for the goal create form. */
    @Property({ length: 8, nullable: true })
    icon: string | null = null;

    // ? RELATIONSHIPS
    /** Default jar template; app resolves household jar by jarTemplate.key. */
    @ManyToOne(() => JarTemplate, { deleteRule: 'restrict' })
    jarTemplate!: JarTemplate;

    /** Optional category hint under that jar (goals may stay uncategorised). */
    @ManyToOne(() => CategoryTemplate, { nullable: true, deleteRule: 'set null' })
    categoryTemplate: CategoryTemplate | null = null;
}
