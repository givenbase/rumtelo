import { Entity, Property, Unique } from '@mikro-orm/core';

import { CatalogEntity } from '../../../../../../common/database/catalog.entity';
import { entityConfig } from '../../../../../../common/database/entity-config.util';

/**
 * Income Posture Entity
 *
 * How someone primarily earns (time trade, skill trade, system, assets).
 * Scalable rows (not a Postgres enum): add postures via seed/admin.
 *
 * @see LeverPreset.postures — levers relevant to a posture
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'growth',
        tableName: 'income_posture',
    })
)
@Unique({ properties: ['key'] })
export class IncomePosture extends CatalogEntity {
    // ? PROPERTIES
    /** One line under the name in pickers / coach copy. */
    @Property({ type: 'text', nullable: true })
    description: string | null = null;
}
