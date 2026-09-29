import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { CatalogKey } from '../../../../../common/database/catalog-key.util';
import { HouseholdEntity } from '../../../../../common/database/household.entity';
import { entityConfig } from '../../../../../common/database/entity-config.util';
import { MoneyType } from '../../../../../common/database/money.type';
import { AssetPreset } from '../../../../backoffice/product/growth/preset/asset/asset.entity';
import { AssetKind } from '../../../../backoffice/product/growth/preset/asset/kind/asset-kind.entity';

/**
 * Asset Entity
 *
 * Something this household owns. The class is a natural-key FK on the catalog
 * (`kindKey`), so a renamed key follows and a kind in use cannot be removed.
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

    /** Worth in minor units. */
    @Property({ type: MoneyType })
    value!: number;

    /** Pays the household each month, in minor units. Zero when it only sits there. */
    @Property({ type: MoneyType, default: 0 })
    flow = 0;

    // ? RELATIONSHIPS
    /** The class (portfolio, property, …) — natural-key FK on `AssetKind.key`; a kind in use cannot be removed. */
    @ManyToOne(() => AssetKind, CatalogKey('kind_key', { required: true }))
    kindKey!: string;

    /** Catalog suggestion the name came from — natural-key FK on `AssetPreset.key`. Null if they typed it. */
    @ManyToOne(() => AssetPreset, CatalogKey('preset_key'))
    presetKey: string | null = null;
}
