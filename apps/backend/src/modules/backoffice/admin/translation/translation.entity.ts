import { Entity, Index, Property, Unique } from '@mikro-orm/core';

import { BaseEntity } from '../../../../common/database/base.entity';
import { entityConfig } from '../../../../common/database/entity-config.util';

/**
 * Catalog field translations (jars, categories, presets, …).
 *
 * Rows are keyed by stable catalog `entityKey` (JarKey / HOUSING / …), not row UUID,
 * so household copies can resolve the same locale text via key after onboard.
 *
 * Canonical English stays on the template/preset row; this table holds overrides
 * per locale code (`nl`, later `es`, `fr`, …). Locale is an open string matching
 * next-intl primary tags — add languages by seeding rows, not by altering schema.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        tableName: 'translation',
    })
)
@Unique({ properties: ['entityType', 'entityKey', 'fieldName', 'locale'] })
@Index({ properties: ['entityType', 'locale'] })
@Index({ properties: ['entityKey'] })
export class Translation extends BaseEntity {
    // ? PROPERTIES
    /** Catalog family — e.g. `jar_template`, `category_template`. */
    @Property({ length: 50 })
    entityType!: string;

    /** Field on the catalog row — e.g. `name`, `subtitle`. */
    @Property({ length: 50 })
    fieldName!: string;

    /** Stable catalog key — e.g. `NECESSITIES`, `HOUSING`. */
    @Property({ length: 80 })
    entityKey!: string;

    /** next-intl primary locale tag (`nl`, `es`, `fr`, …) — never `en` (source row). */
    @Property({ length: 8 })
    locale!: string;

    /** Translated value for that field. */
    @Property({ type: 'text' })
    text!: string;
}
