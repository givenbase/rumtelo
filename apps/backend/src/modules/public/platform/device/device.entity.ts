import { Entity, Enum, Index, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';
import { DeviceConnection } from '@rumtelo/contracts';

import { CatalogKey } from '../../../../common/database/catalog-key.util';
import { HouseholdEntity } from '../../../../common/database/household.entity';
import { entityConfig } from '../../../../common/database/entity-config.util';
import { Jsonb } from '../../../../common/database/jsonb.util';
import { NativeEnum } from '../../../../common/database/native-enum.util';
import { Account } from '../../../auth/user/account/account.entity';
import { DeviceKindCatalog } from '../../../backoffice/reference/device-kind/device-kind.entity';

/**
 * Device Entity
 *
 * Household-owned hardware registry. Wearables are assigned to a member
 * ({@link Account}); shared gear (scale, alarm hub) leaves `account` null.
 * `kindKey` is a natural-key FK on the backoffice device-kind catalog.
 *
 * Phase 1 is registry only; readings land in a later `device_reading` table.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'platform', tableName: 'device' }))
@Index({ properties: ['household', 'account'] })
@Unique({ properties: ['household', 'externalId'] })
export class Device extends HouseholdEntity {
    // ? PROPERTIES
    /** Household-facing label ("Given's band"). */
    @Property({ length: 60 })
    name!: string;

    /** Maker when known (fitbit, rumtelo, …). */
    @Property({ length: 60, nullable: true })
    vendor: string | null = null;

    /** Model string when known. */
    @Property({ length: 60, nullable: true })
    model: string | null = null;

    /** BLE device id, MAC, or cloud provider user/device id. */
    @Property({ length: 120, nullable: true })
    externalId: string | null = null;

    /** Live capability set — may diverge from catalog defaults after edit. */
    @Property(Jsonb())
    capabilities!: string[];

    /** When the device was first registered with this household. */
    @Property({ type: 'timestamptz' })
    pairedAt: Date = new Date();

    /** Last successful sync / Web Bluetooth sighting. */
    @Property({ type: 'timestamptz', nullable: true })
    lastSeenAt: Date | null = null;

    // ? ENUMS
    /** How the device connects (BLE, Wi‑Fi, or cloud OAuth). */
    @Enum(NativeEnum({ DeviceConnection, domain: 'platform' }))
    connection!: DeviceConnection;

    // ? RELATIONSHIPS
    /**
     * Wearing member (`auth.account`). Null = shared household device.
     * mapToPk keeps `account: string | null` in app code.
     */
    @ManyToOne(() => Account, { mapToPk: true, nullable: true, deleteRule: 'set null' })
    account: string | null = null;

    /** Device kind — natural-key FK on `DeviceKindCatalog.key`; a kind in use cannot be removed. */
    @ManyToOne(() => DeviceKindCatalog, CatalogKey('kind_key', { required: true }))
    kindKey!: string;
}
