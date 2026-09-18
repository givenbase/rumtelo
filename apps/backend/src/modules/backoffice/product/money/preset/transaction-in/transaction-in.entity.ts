import { Entity, Enum, Property, Unique } from '@mikro-orm/core';
import { JarKey } from '@rumtelo/contracts';

import { CatalogEntity } from '../../../../../../common/database/catalog.entity';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';

/**
 * Transaction In Preset Entity
 *
 * Suggestion catalog for one-off Transaction In (gift, refund, tax return…).
 * Households store the chosen key on money.transaction.inflow_key.
 *
 * @see money.transaction.inflowKey
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'money',
        tableName: 'transaction_in_preset',
    })
)
@Unique({ properties: ['key'] })
export class TransactionInPreset extends CatalogEntity {
    // ? PROPERTIES
    /** Picker group heading (People, Official, …). `groupName` — `group` is a SQL keyword. */
    @Property({ length: 64 })
    groupName!: string;

    /** Optional emoji for the picker. */
    @Property({ length: 8, nullable: true })
    icon: string | null = null;

    // ? ENUMS
    /** Soft jar hint when the user picks this preset; null = leave jar alone. */
    @Enum(NativeEnum({ JarKey, domain: 'money', nullable: true }))
    jarKey: JarKey | null = null;
}
