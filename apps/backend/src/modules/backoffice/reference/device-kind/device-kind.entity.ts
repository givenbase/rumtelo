import { Entity, Enum, Property, Unique } from '@mikro-orm/core';
import { DeviceConnection } from '@rumtelo/contracts';

import { CatalogEntity } from '../../../../common/database/catalog.entity';
import { entityConfig } from '../../../../common/database/entity-config.util';
import { Jsonb } from '../../../../common/database/jsonb.util';
import { NativeEnum } from '../../../../common/database/native-enum.util';

/**
 * Device Kind Catalog
 *
 * Company-authored classes of hardware a household can register. Rows, not a
 * Postgres enum — adding WRISTBAND_V2 or SLEEP_PAD is a seed, not a migration.
 * Household {@link Device} rows snapshot `key` as `kindKey` (not a FK).
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'platform',
        tableName: 'device_kind',
    })
)
@Unique({ properties: ['key'] })
export class DeviceKindCatalog extends CatalogEntity {
    // ? PROPERTIES
    /** Lucide / UI icon key for the pair dialog (e.g. watch, watch-off). */
    @Property({ length: 40 })
    icon!: string;

    /** Suggested capabilities for the pair form — stored as JSON string[]. */
    @Property(Jsonb())
    defaultCapabilities!: string[];

    // ? ENUMS
    /** Suggested connection when the user picks this kind. */
    @Enum(NativeEnum({ DeviceConnection, domain: 'platform' }))
    defaultConnection!: DeviceConnection;
}
