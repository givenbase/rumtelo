import { Entity, Property, Unique } from '@mikro-orm/core';

import { CatalogEntity } from '../../../../../../../common/database/catalog.entity';
import { entityConfig } from '../../../../../../../common/database/entity-config.util';

/**
 * Asset Kind Entity
 *
 * A class of what a household can own. Rows, not a Postgres enum, so the
 * next class (a boat, a receivable) is a seed, not a migration of a type.
 *
 * @see AssetPreset — suggested names inside a class, for the add-asset field
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'growth',
        tableName: 'asset_kind',
    })
)
@Unique({ properties: ['key'] })
export class AssetKind extends CatalogEntity {
    // ? PROPERTIES
    /** One line under the name on the add-asset chips. */
    @Property({ type: 'text', nullable: true })
    description: string | null = null;

    /** The class can pay the household each month. A pension and a car do not. */
    @Property({ type: 'boolean' })
    canPay = false;

    // ? UI METADATA
    /** Emoji on the type card. Same idea as a goal preset icon. */
    @Property({ length: 8, nullable: true })
    icon: string | null = null;
}
