import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/core';

import { CatalogEntity } from '../../../../../../common/database/catalog.entity';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { JarTemplate } from '../jar/jar.entity';

/**
 * Category Template Entity
 *
 * Rumtelo-owned spending categories under a jar template (Housing, Groceries, …).
 * Presets point at it by FK; households copy `name` into money.category on demand.
 *
 * @see JarTemplate — parent jar in the money company catalog
 * @see money.category — household-owned instances
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'money',
        tableName: 'category_template',
    })
)
@Unique({ properties: ['key'] })
@Index({ properties: ['jarTemplate'] })
export class CategoryTemplate extends CatalogEntity {
    // ? PROPERTIES
    /** Optional emoji for pickers / lists. */
    @Property({ length: 8, nullable: true })
    icon: string | null = null;

    // ? RELATIONSHIPS
    /** Parent jar in the money company catalog (not a household money.jar row). */
    @ManyToOne(() => JarTemplate, { deleteRule: 'restrict' })
    jarTemplate!: JarTemplate;
}
