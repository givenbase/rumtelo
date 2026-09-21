import { Entity, Enum, Index, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { FixedCostSettlementSource, FixedCostSettlementStatus } from '@rumtelo/contracts';

import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { MoneyType } from '../../../../../../common/database/money.type';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { Transaction } from '../../ledger/transaction/transaction.entity';
import { FixedCost } from './fixed-cost.entity';

/**
 * Fixed Cost Settlement Entity
 *
 * One bill’s status for one calendar month (`YYYY-MM`). Source of truth for
 * Taken / Skipped — transactions optionally link as evidence of payment.
 *
 * @see FixedCost — the recurring plan
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'fixed_cost_settlement' }))
@Unique({ properties: ['fixedCost', 'period'] })
@Index({ properties: ['period'] })
@Index({ properties: ['transaction'] })
export class FixedCostSettlement extends HouseholdEntity {
    // ? PROPERTIES
    /** Budget month this settlement closes (`YYYY-MM`). */
    @Property({ length: 7 })
    period!: string;

    /** Optional note (why skipped, partial explanation, …). */
    @Property({ type: 'text', nullable: true })
    note: string | null = null;

    /** Actual paid amount in minor units; null when skipped. */
    @Property({ type: MoneyType, nullable: true })
    amount: number | null = null;

    /** Instant marked paid; null when skipped. */
    @Property({ type: 'timestamptz', nullable: true })
    paidAt: Date | null = null;

    // ? ENUMS
    /** Paid vs intentionally skipped for the period. */
    @Enum(
        NativeEnum({
            FixedCostSettlementStatus,
            domain: 'money',
            defaultValue: FixedCostSettlementStatus.PAID,
        })
    )
    status: FixedCostSettlementStatus = FixedCostSettlementStatus.PAID;

    /** How the settlement was recorded. */
    @Enum(
        NativeEnum({
            FixedCostSettlementSource,
            domain: 'money',
            defaultValue: FixedCostSettlementSource.MARK_PAID,
        })
    )
    source: FixedCostSettlementSource = FixedCostSettlementSource.MARK_PAID;

    // ? RELATIONSHIPS
    /** Bill this period belongs to. Deleting the bill deletes settlements. */
    @ManyToOne(() => FixedCost, { deleteRule: 'cascade' })
    fixedCost!: FixedCost;

    /** Optional ledger row that proves payment. Cleared if the tx is deleted. */
    @ManyToOne(() => Transaction, { nullable: true, deleteRule: 'set null' })
    transaction: Transaction | null = null;
}
