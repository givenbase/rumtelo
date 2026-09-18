import { Entity, Unique } from '@mikro-orm/core';

import { CatalogEntity } from '../../../../../../common/database/catalog.entity';
import { entityConfig } from '../../../../../../common/database/entity-config.util';

/**
 * Market Entity
 *
 * Countries Rumtelo lists merchants for. `key` is the ISO 3166-1 alpha-2 code
 * (NL, BE, …); `name` the English country name. Adding a market is a seed row,
 * not a code change — presets link to it via a join table.
 *
 * @see MerchantPreset.markets
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'money',
        tableName: 'market',
    })
)
@Unique({ properties: ['key'] })
export class Market extends CatalogEntity {}
