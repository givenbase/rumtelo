import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/core';
import { TransactionSource, TransactionStatus } from '@rumtelo/contracts';

import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { Category } from '../../plan/jar/category.entity';
import { Jar } from '../../plan/jar/jar.entity';
import { Debt } from '../../targets/debt/debt.entity';
import { BankAccount } from '../account/bank-account.entity';

/**
 * INBOX   — arrived, no jar yet. The only state that demands user attention.
 * SORTED  — has a jar, and usually a category.
 * IGNORED — deliberately outside budget maths (internal transfers, corrections).
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'transaction' }))
// The dashboard reads by period and the inbox reads by status; cover both.
@Index({ properties: ['household', 'bookedOn'] })
@Index({ properties: ['household', 'status'] })
@Index({ properties: ['dedupeKey'] })
export class Transaction extends HouseholdEntity {
    // ? PROPERTIES
    @Property({ length: 280 })
    description!: string;

    @Property({ length: 160, nullable: true })
    counterparty: string | null = null;

    /**
     * Stable Transaction In source tag (GIFT, REFUND, …).
     * Null for Out, custom In labels, and bank/CSV imports.
     */
    @Property({ length: 64, nullable: true })
    inflowKey: string | null = null;

    /** Negative = money out, positive = money in. Integer minor units, never floats. */
    @Property({ type: 'bigint' })
    amount!: number;

    @Property({ type: 'date' })
    bookedOn!: string;

    /** Set when a rule auto-sorted this, keeping the automation visible and undoable. */
    @Property({ type: 'uuid', nullable: true })
    appliedRuleId: string | null = null;

    /**
     * Stable hash of (account, date, amount, description) making imports idempotent:
     * re-importing the same statement must never duplicate rows.
     */
    @Property({ length: 64, nullable: true })
    dedupeKey: string | null = null;

    @Property({ type: 'text', nullable: true })
    note: string | null = null;

    // ? ENUMS
    @Enum(NativeEnum({ TransactionStatus, domain: 'money', defaultValue: TransactionStatus.INBOX }))
    status: TransactionStatus = TransactionStatus.INBOX;

    @Enum(
        NativeEnum({ TransactionSource, domain: 'money', defaultValue: TransactionSource.MANUAL })
    )
    source: TransactionSource = TransactionSource.MANUAL;

    // ? RELATIONSHIPS
    @ManyToOne(() => BankAccount, { nullable: true })
    account: BankAccount | null = null;

    @ManyToOne(() => Jar, { nullable: true })
    jar: Jar | null = null;

    @ManyToOne(() => Category, { nullable: true })
    category: Category | null = null;

    /** Outflow linked as a payment toward this debt. */
    @ManyToOne(() => Debt, { nullable: true, deleteRule: 'set null' })
    debt: Debt | null = null;
}
