import { Entity, Enum, Property } from '@mikro-orm/core';
import { AccountKind } from '@rumtelo/contracts';

import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';

/**
 * BankAccount Entity
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'bank_account' }))
export class BankAccount extends HouseholdEntity {
    // ? PROPERTIES
    @Property({ length: 120 })
    name!: string;

    @Property({ length: 34, nullable: true })
    iban: string | null = null;

    @Property({ type: 'bigint', default: 0 })
    balance = 0;

    /** Null for manual accounts; set when linked through the bank-sync port. */
    @Property({ type: 'uuid', nullable: true })
    connectionId: string | null = null;

    @Property({ type: 'timestamptz', nullable: true })
    lastSyncedAt: Date | null = null;

    // ? ENUMS
    @Enum(NativeEnum({ AccountKind, domain: 'money', defaultValue: AccountKind.CHECKING }))
    kind: AccountKind = AccountKind.CHECKING;
}
