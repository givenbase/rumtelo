import { Entity, Property } from '@mikro-orm/core';

import { HouseholdEntity } from '../../../../../common/database/household.entity';
import { entityConfig } from '../../../../../common/database/entity-config.util';
import { MoneyType } from '../../../../../common/database/money.type';

/**
 * Asset Entity
 *
 * Something this household owns. The class is a catalog key copied onto the
 * row, so a renamed preset does not move their number.
 *
 * @see AssetKind — the class (portfolio, property, …)
 * @see AssetPreset — the suggested name, when they picked one
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'growth', tableName: 'asset' }))
export class Asset extends HouseholdEntity {
    // ? PROPERTIES
    /** Household-facing label ("The company", "Home"). */
    @Property({ length: 120 })
    name!: string;

    /** AssetKind.key at the time they filed it. Not a foreign key. */
    @Property({ length: 64 })
    kindKey!: string;

    /** AssetPreset.key when the name came from the catalog. Null if they typed it. */
    @Property({ length: 64, nullable: true })
    presetKey: string | null = null;

    /** Worth in minor units. */
    @Property({ type: MoneyType })
    value!: number;

    /** Pays the household each month, in minor units. Zero when it only sits there. */
    @Property({ type: MoneyType, default: 0 })
    flow = 0;
}
