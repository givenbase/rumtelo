import { Check, Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { Cadence, DebtKind, DebtScheduleKind } from '@rumtelo/contracts';

import { CatalogKey } from '../../../../../../common/database/catalog-key.util';
import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { MoneyType } from '../../../../../../common/database/money.type';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { DebtPreset } from '../../../../../backoffice/product/money/preset/debt/debt.entity';
import { MerchantPreset } from '../../../../../backoffice/product/money/preset/merchant/merchant.entity';
import { Party } from '../../plan/party/party.entity';

/**
 * Debt Entity
 *
 * Money owed. Payments arrive as linked transactions; the planned payment is a
 * linked fixed cost. Payoff order follows `HouseholdSettings.money.payoffStrategy`.
 *
 * `name` + optional `presetKey` = what debt (type label); counterparty triple =
 * who the lender is (catalog merchant, saved party, or free text).
 *
 * @see Transaction.debt
 * @see FixedCost.debt
 * @see DebtPreset — backoffice starting points
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'debt' }))
@Index({ properties: ['party'] })
@Check({
    name: 'money_debt_merchant_xor_party',
    expression: '(merchant_key IS NULL) OR (party_id IS NULL)',
})
@Check({
    name: 'money_debt_counterparty_when_linked',
    expression: '((merchant_key IS NULL) AND (party_id IS NULL)) OR (counterparty IS NOT NULL)',
})
export class Debt extends HouseholdEntity {
    // ? PROPERTIES
    /** Type label ("Student loan", "Mortgage") — snapshot of the preset or typed name. */
    @Property({ length: 120 })
    name!: string;

    /**
     * Lender display snapshot. Always set when `merchantKey` or `party` is;
     * survives both being cleared.
     */
    @Property({ length: 160, nullable: true })
    counterparty: string | null = null;

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

    /**
     * When in the period: QUARTERLY → 1–3; YEARLY → 1–12. Null for WEEKLY / MONTHLY.
     */
    @Property({ type: 'smallint', nullable: true })
    dueMonth: number | null = null;

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

    // ? RELATIONSHIPS
    /**
     * Household party when the lender is a saved name (N:1, optional).
     * Mutually exclusive with `merchantKey`.
     */
    @ManyToOne(() => Party, { mapToPk: true, nullable: true, deleteRule: 'set null' })
    party: string | null = null;

    /**
     * Debt-type catalog pick — natural-key FK on `DebtPreset.key`.
     * Null when the name was free-typed. Retiring the preset nulls this; `name` stays.
     */
    @ManyToOne(() => DebtPreset, CatalogKey('preset_key'))
    presetKey: string | null = null;

    /**
     * Catalog merchant when the lender was picked from the catalog (N:1, optional).
     * Natural-key FK on `MerchantPreset.key`.
     */
    @ManyToOne(() => MerchantPreset, CatalogKey('merchant_key'))
    merchantKey: string | null = null;
}
