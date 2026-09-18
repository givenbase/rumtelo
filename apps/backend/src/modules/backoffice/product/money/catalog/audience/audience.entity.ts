import { Entity, Property, Unique } from '@mikro-orm/core';

import { CatalogEntity } from '../../../../../../common/database/catalog.entity';
import { entityConfig } from '../../../../../../common/database/entity-config.util';

/**
 * Audience Entity
 *
 * Lifestyle vocabulary for the fixed-cost bill picker (student, homeowner, …).
 * New options are seed rows — not a contracts enum — so the list can grow
 * without a code change in the picker.
 *
 * @see FixedCostPreset.audiences
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'money',
        tableName: 'audience',
    })
)
@Unique({ properties: ['key'] })
export class Audience extends CatalogEntity {
    // ? PROPERTIES
    /** One line under the chip / for tooltips. */
    @Property({ type: 'text', nullable: true })
    description: string | null = null;

    /**
     * Baseline audiences are not chips: their bills stay listed when any other
     * audience is selected (everyone’s rent, energy, …).
     */
    @Property({ default: false })
    isBaseline = false;

    // ? UI METADATA
    /** CSS color token for chip text / border (e.g. var(--color-accent)). */
    @Property({ length: 64, nullable: true })
    accentColor: string | null = null;

    /** CSS color token for chip fill (e.g. soft surface / color-mix). */
    @Property({ length: 64, nullable: true })
    softColor: string | null = null;

    /** Optional emoji for the picker chip. */
    @Property({ length: 8, nullable: true })
    icon: string | null = null;
}
