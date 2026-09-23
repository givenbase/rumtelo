import { Entity, Enum, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { AccountKind } from '@rumtelo/contracts';

import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { MoneyType } from '../../../../../../common/database/money.type';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { Bank } from '../../../../../backoffice/product/money/catalog/bank/bank.entity';

/**
 * Bank Account Entity
 *
 * A household's real-world account (checking, savings, …) that transactions land
 * on. Every account picks a catalog {@link Bank}. Open Banking sync is optional:
 * `connectionId` null = manual entry; set = linked to a provider. Connecting
 * later upgrades the same row (no duplicate IBAN / bank seat).
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

    /**
     * Open Banking / sync connection handle. Null = manual account at this bank;
     * set when linked (`sessionId::accountUid` for Enable Banking). Connecting
     * later upgrades the same row (no duplicate IBAN / bank seat).
     */
    @Property({ length: 120, nullable: true })
    connectionId: string | null = null;

    /** Last successful bank-sync pull. Null until the account is linked. */
    @Property({ type: 'timestamptz', nullable: true })
    lastSyncedAt: Date | null = null;

    // ? ENUMS
    /** Checking / savings / … — drives which balances count as spendable. */
    @Enum(NativeEnum({ AccountKind, domain: 'money', defaultValue: AccountKind.CHECKING }))
    kind: AccountKind = AccountKind.CHECKING;

    // ? RELATIONSHIPS
    /**
     * Catalog institution — always set (manual or synced). Soft-disable banks
     * in the catalog; hard delete is blocked while accounts reference them.
     */
    @ManyToOne(() => Bank, { deleteRule: 'restrict' })
    bank!: Bank;

    /**
     * Optional checking/savings seat that pays this account’s bill (credit cards).
     * Null until the household picks one. Same household only — enforced in service.
     */
    @ManyToOne(() => BankAccount, { nullable: true, deleteRule: 'set null' })
    settlementAccount: BankAccount | null = null;
}
