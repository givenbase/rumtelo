import { Collection } from '@mikro-orm/core';
import { Entity, ManyToMany, Property, Unique } from '@mikro-orm/decorators/legacy';

import { CatalogEntity } from '../../../../../../common/database/catalog.entity';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { JarTemplate } from '../jar/jar.entity';

/**
 * Category Template Entity
 *
 * Rumtelo-owned spending categories (Housing, Groceries, Travel, …).
 * A template may appear under one or more jar templates (shared types);
 * the first linked jar is primary for presets/merchants that need a home jar.
 * Households copy `name` into money.category on demand under the chosen jar.
 *
 * @see JarTemplate — linked jars in the money company catalog
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
export class CategoryTemplate extends CatalogEntity {
    // ? PROPERTIES
    /** Optional emoji for pickers / lists. */
    @Property({ length: 8, nullable: true })
    icon: string | null = null;

    // ? RELATIONSHIPS
    /**
     * Jars where this type is offered (N:M, owner side).
     * `fixedOrder` preserves seed order — index 0 is primary.
     */
    @ManyToMany(() => JarTemplate, undefined, {
        pivotTable: 'reference_money_category_template_jar_template',
        fixedOrder: true,
    })
    jarTemplates = new Collection<JarTemplate>(this);

    /** Primary jar (first in {@link jarTemplates}); for merchant/preset home placement. */
    get primaryJarTemplate(): JarTemplate {
        const first = this.jarTemplates.getItems()[0];
        if (!first) {
            throw new Error(`CategoryTemplate ${this.key} has no jarTemplates`);
        }
        return first;
    }
}
