import { Entity, Enum, Property } from '@mikro-orm/core';
import { Cadence, DebtKind, DebtScheduleKind } from '@rumtelo/contracts';

import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { MoneyType } from '../../../../../../common/database/money.type';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';

/**
 * Debt Entity
 *
 * Money owed. Payments arrive as linked transactions; the planned payment is a
 * linked fixed cost. Payoff order follows `HouseholdSettings.money.payoffStrategy`.
 *
 * @see Transaction.debt
 * @see FixedCost.debt
 * @see DebtPreset — backoffice starting points
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'debt' }))
export class Debt extends HouseholdEntity {
    // ? PROPERTIES
    /** Household-facing label ("Student loan DUO"). */
    @Property({ length: 120 })
    name!: string;

    /** Outstanding balance in minor units. */
    @Property({ type: MoneyType })
    balance!: number;

    /** Balance when the debt was added — progress bars measure against this. */
    @Property({ type: MoneyType })
    originalBalance!: number;

    /** APR as decimal, e.g. 12.90 — it drives projections, so never a float. */
    @Property({ type: 'decimal', precision: 5, scale: 2, defaultRaw: '0.00' })
    interestRate!: string;

    /** Contractual minimum per payment cadence, in minor units. */
    @Property({ type: MoneyType, default: 0 })
    minimumPayment = 0;

    /** Voluntary extra per payment cadence, in minor units. */
    @Property({ type: MoneyType, default: 0 })
    extraPayment = 0;

    /** TERM schedules: total number of payments; null for open-ended debts. */
    @Property({ type: 'smallint', nullable: true })
    termPayments: number | null = null;

    /** Day of month the payment is due (1–31); null = unknown. */
    @Property({ type: 'smallint', nullable: true })
    dueDay: number | null = null;

    /** Date the debt started; null = unknown. */
    @Property({ type: 'date', nullable: true })
    startedOn: string | null = null;

    /** TERM schedules: contractual final payment date. */
    @Property({ type: 'date', nullable: true })
    maturityOn: string | null = null;

    /** Date the balance reached zero; null while open. */
    @Property({ type: 'date', nullable: true })
    closedOn: string | null = null;

    // ? ENUMS
    /** Loan / credit card / … */
    @Enum(NativeEnum({ DebtKind, domain: 'money', defaultValue: DebtKind.LOAN }))
    kind: DebtKind = DebtKind.LOAN;

    /** OPEN (revolving) or TERM (fixed number of payments). */
    @Enum(
        NativeEnum({
            DebtScheduleKind,
            domain: 'money',
            defaultValue: DebtScheduleKind.OPEN,
        })
    )
    scheduleKind: DebtScheduleKind = DebtScheduleKind.OPEN;

    /** How often a payment is due. */
    @Enum(NativeEnum({ Cadence, domain: 'money', defaultValue: Cadence.MONTHLY }))
    paymentCadence: Cadence = Cadence.MONTHLY;
}
