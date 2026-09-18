import { Entity, Enum, Index, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { TransactionSource, TransactionStatus } from '@rumtelo/contracts';

import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { MoneyType } from '../../../../../../common/database/money.type';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { Category } from '../../plan/jar/category.entity';
import { Jar } from '../../plan/jar/jar.entity';
import { Debt } from '../../targets/debt/debt.entity';
import { BankAccount } from '../bank-account/bank-account.entity';
import { SortRule } from '../sort-rule/sort-rule.entity';

/**
 * Transaction Entity
 *
 * One movement of money on a household account.
 *
 *   INBOX   — arrived, no jar yet. The only state that demands user attention.
 *   SORTED  — has a jar, and usually a category.
 *   IGNORED — deliberately outside budget maths (internal transfers, corrections).
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'transaction' }))
// The dashboard reads by period and the inbox reads by status; cover both.
@Index({ properties: ['household', 'bookedOn'] })
@Index({ properties: ['household', 'status'] })
// FK columns — Postgres does not index these automatically.
@Index({ properties: ['account'] })
@Index({ properties: ['jar'] })
@Index({ properties: ['category'] })
@Index({ properties: ['debt'] })
@Index({ properties: ['appliedRule'] })
// Idempotent imports: the same statement line can never land twice in one household.
@Unique({ properties: ['household', 'dedupeKey'] })
export class Transaction extends HouseholdEntity {
    // ? PROPERTIES
    /** Bank / user description as booked. */
    @Property({ length: 280 })
    description!: string;

    /** Free-text note added by the household. */
    @Property({ type: 'text', nullable: true })
    note: string | null = null;

    /** Other party (merchant, employer, landlord). Mirrors FixedCost.counterparty. */
    @Property({ length: 160, nullable: true })
    counterparty: string | null = null;

    /** Negative = money out, positive = money in. Integer minor units, never floats. */
    @Property({ type: MoneyType })
    amount!: number;

    /**
     * Stable Transaction In preset key (GIFT, REFUND, …) copied at creation.
     * Snapshot, not an FK — household rows never depend on mutable catalog rows.
     * Null for Out, custom In labels, and bank/CSV imports.
     */
    @Property({ length: 64, nullable: true })
    inflowKey: string | null = null;

    /**
     * MerchantPreset.key that auto-sorted this row, when no household rule matched.
     * Snapshot, not an FK — retiring a merchant must not rewrite history.
     * Cleared when a rule or the user sorts the row themselves.
     */
    @Property({ length: 64, nullable: true })
    appliedMerchantKey: string | null = null;

    /**
     * Stable hash of (account, date, amount, description) — see class-level UNIQUE.
     * Null for manual entries, which are never de-duplicated.
     */
    @Property({ length: 64, nullable: true })
    dedupeKey: string | null = null;

    /** Booking date on the statement (calendar date, no time). */
    @Property({ type: 'date' })
    bookedOn!: string;

    // ? ENUMS
    /** Inbox / sorted / ignored — see class JSDoc. */
    @Enum(NativeEnum({ TransactionStatus, domain: 'money', defaultValue: TransactionStatus.INBOX }))
    status: TransactionStatus = TransactionStatus.INBOX;

    /** Where the row came from (manual, CSV import, bank sync). */
    @Enum(
        NativeEnum({ TransactionSource, domain: 'money', defaultValue: TransactionSource.MANUAL })
    )
    source: TransactionSource = TransactionSource.MANUAL;

    // ? RELATIONSHIPS
    /** Account it was booked on. Cleared (not deleted) when the account goes. */
    @ManyToOne(() => BankAccount, { nullable: true, deleteRule: 'set null' })
    account: BankAccount | null = null;

    /** Jar it was sorted into. Null while in the inbox; cleared if the jar goes. */
    @ManyToOne(() => Jar, { nullable: true, deleteRule: 'set null' })
    jar: Jar | null = null;

    /** Category under that jar. Cleared if the category goes. */
    @ManyToOne(() => Category, { nullable: true, deleteRule: 'set null' })
    category: Category | null = null;

    /** Outflow linked as a payment toward this debt. */
    @ManyToOne(() => Debt, { nullable: true, deleteRule: 'set null' })
    debt: Debt | null = null;

    /**
     * Rule that auto-sorted this row — keeps the automation visible and undoable.
     * `mapToPk` keeps it a plain uuid string in app code; deleting the rule clears it.
     */
    @ManyToOne(() => SortRule, { mapToPk: true, nullable: true, deleteRule: 'set null' })
    appliedRule: string | null = null;
}
