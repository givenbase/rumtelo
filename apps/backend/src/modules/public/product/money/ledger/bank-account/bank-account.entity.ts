import { Entity, Enum, Property, Unique } from '@mikro-orm/core';
import { AccountKind } from '@rumtelo/contracts';

import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { MoneyType } from '../../../../../../common/database/money.type';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';

/**
 * Bank Account Entity
 *
 * A household's real-world account (checking, savings, …) that transactions land
 * on. Manual until bank sync links it; `balance` is the household's own figure,
 * not a live bank feed.
 *
 * Not to be confused with `auth.account` — that is a person profile.
 *
 * @see Transaction.account
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'bank_account' }))
// One IBAN per household; NULL (manual account without IBAN) is allowed many times.
@Unique({ properties: ['household', 'iban'] })
export class BankAccount extends HouseholdEntity {
    // ? PROPERTIES
    /** Household-facing label ("ING Joint", "Savings"). */
    @Property({ length: 120 })
    name!: string;

    /** Normalised IBAN (no spaces, upper-case). Null for cash-style manual accounts. */
    @Property({ length: 34, nullable: true })
    iban: string | null = null;

    /** Current balance in minor units. */
    @Property({ type: MoneyType, default: 0 })
    balance = 0;

    /** Bank-sync connection handle (external provider id). Null for manual accounts. */
    @Property({ type: 'uuid', nullable: true })
    connectionId: string | null = null;

    /** Last successful bank-sync pull. Null until the account is linked. */
    @Property({ type: 'timestamptz', nullable: true })
    lastSyncedAt: Date | null = null;

    // ? ENUMS
    /** Checking / savings / … — drives which balances count as spendable. */
    @Enum(NativeEnum({ AccountKind, domain: 'money', defaultValue: AccountKind.CHECKING }))
    kind: AccountKind = AccountKind.CHECKING;
}
