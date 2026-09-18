import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/core';

import { CatalogEntity } from '../../../../../../common/database/catalog.entity';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { AssetKind } from './kind/asset-kind.entity';

/**
 * Asset Preset Entity
 *
 * A suggested name for “New asset”, the way a fixed-cost preset suggests a bill.
 * Picking one sets the class. The household can still type their own.
 *
 * @see AssetKind — the class this name belongs to
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'growth',
        tableName: 'asset_preset',
    })
)
@Unique({ properties: ['key'] })
@Index({ properties: ['kind'] })
export class AssetPreset extends CatalogEntity {
    // ? PROPERTIES
    /** One line in the suggestion, when the name is not enough. */
    @Property({ type: 'text', nullable: true })
    description: string | null = null;

    // ? RELATIONSHIPS
    /** Class this suggestion files under. */
    @ManyToOne(() => AssetKind, { deleteRule: 'restrict' })
    kind!: AssetKind;
}
