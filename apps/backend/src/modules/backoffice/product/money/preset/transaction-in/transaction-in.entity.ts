import { Entity, Enum, Property, Unique } from '@mikro-orm/core';
import { JarKey } from '@rumtelo/contracts';

import { BaseEntity } from '../../../../../../common/database/base.entity';
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
export class TransactionInPreset extends BaseEntity {
    // ? PROPERTIES
    /** Stable catalog key (e.g. TAX_RETURN) — never rename in place. */
    @Property({ length: 64 })
    key!: string;

    /** English name filled into the create form when picked. */
    @Property({ length: 120 })
    name!: string;

    /** Picker group label (People, Official, …). */
    @Property({ length: 64 })
    groupLabel!: string;

    /** Optional emoji for the picker. */
    @Property({ length: 8, nullable: true })
    icon: string | null = null;

    /** Display / seed order within the catalog. */
    @Property({ default: 0 })
    sortOrder = 0;

    /** Soft-disable without deleting historical inflow_key references. */
    @Property({ default: true })
    isActive = true;

    // ? ENUMS
    /** Soft jar hint when the user picks this preset; null = leave jar alone. */
    @Enum(NativeEnum({ JarKey, domain: 'money', nullable: true }))
    jarKey: JarKey | null = null;
}
