import {
    Check,
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
    Unique,
} from '@mikro-orm/decorators/legacy';
import { Cadence, FlowDirection } from '@rumtelo/contracts';

import { CatalogKey } from '../../../../../../common/database/catalog-key.util';
import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { MoneyType } from '../../../../../../common/database/money.type';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { FixedCostPreset } from '../../../../../backoffice/product/money/preset/fixed-cost/fixed-cost.entity';
import { MerchantPreset } from '../../../../../backoffice/product/money/preset/merchant/merchant.entity';
import { Debt } from '../../targets/debt/debt.entity';
import { Category } from '../jar/category.entity';
import { Jar } from '../jar/jar.entity';
import { Party } from '../party/party.entity';

/**
 * Fixed Cost Entity
 *
 * Recurring obligations. They draw from a jar so they are visible before they hit.
 * `name` + optional `presetKey` = what bill; counterparty triple = who is paid.
 *
 * @see FixedCostPreset — backoffice starting points the household picks from
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'fixed_cost' }))
// At most one planned payment per debt.
@Unique({ properties: ['debt'] })
@Index({ properties: ['jar'] })
@Index({ properties: ['category'] })
@Index({ properties: ['party'] })
@Check({
    name: 'money_fixed_cost_merchant_xor_party',
    expression: '(merchant_key IS NULL) OR (party_id IS NULL)',
})
@Check({
    name: 'money_fixed_cost_counterparty_when_linked',
    expression: '((merchant_key IS NULL) AND (party_id IS NULL)) OR (counterparty IS NOT NULL)',
})
export class FixedCost extends HouseholdEntity {
    // ? PROPERTIES
    /** Household-facing label ("Rent", "Netflix") — snapshot of the preset or typed name. */
    @Property({ length: 120 })
    name!: string;

    /** Free-text note. */
    @Property({ type: 'text', nullable: true })
    note: string | null = null;

    /**
     * Who receives it — display snapshot (landlord, insurer, organization).
     * Always set when `merchantKey` or `party` is; survives both being cleared.
     */
    @Property({ length: 160, nullable: true })
    counterparty: string | null = null;

    /** Amount per cadence in minor units. */
    @Property({ type: MoneyType })
    amount!: number;

    /** Paused costs stay on the list but leave the budget maths. */
    @Property({ default: true })
    isActive = true;

    /**
     * When in the period: QUARTERLY → 1–3 (month of quarter); YEARLY → 1–12
     * (calendar month). Null for WEEKLY / MONTHLY.
     */
    @Property({ type: 'smallint', nullable: true })
    dueMonth: number | null = null;

    /** Day of month (1–31) or ISO weekday (1=Mon…7=Sun) when cadence is WEEKLY. */
    @Property({ type: 'smallint', nullable: true })
    dueDay: number | null = null;

    /** First day this bill applies; null = unknown. */
    @Property({ type: 'date', nullable: true })
    startedOn: string | null = null;

    /** Last charge date for fixed-term contracts; null = open-ended. */
    @Property({ type: 'date', nullable: true })
    endsOn: string | null = null;

    // ? ENUMS
    /** How often it recurs. */
    @Enum(NativeEnum({ Cadence, domain: 'money', defaultValue: Cadence.MONTHLY }))
    cadence: Cadence = Cadence.MONTHLY;

    /** OUT for costs, IN for recurring inflows that are not an income source. */
    @Enum(NativeEnum({ FlowDirection, domain: 'money', defaultValue: FlowDirection.OUT }))
    direction: FlowDirection = FlowDirection.OUT;

    // ? RELATIONSHIPS
    /** Jar it draws from (N:1, required). Deleting the jar deletes its fixed costs. */
    @ManyToOne(() => Jar, { deleteRule: 'cascade' })
    jar!: Jar;

    /** Optional category under that jar. Cleared if the category goes. */
    @ManyToOne(() => Category, { nullable: true, deleteRule: 'set null' })
    category: Category | null = null;

    /** Planned payment for a debt — see class-level UNIQUE. Cleared if the debt goes. */
    @ManyToOne(() => Debt, { nullable: true, deleteRule: 'set null' })
    debt: Debt | null = null;

    /**
     * Household party when the payee is one of their saved names (N:1, optional).
     * Mutually exclusive with `merchantKey`.
     */
    @ManyToOne(() => Party, { mapToPk: true, nullable: true, deleteRule: 'set null' })
    party: string | null = null;

    /**
     * Bill-type catalog pick — natural-key FK on `FixedCostPreset.key`.
     * Null when the name was free-typed. Retiring the preset nulls this; `name` stays.
     */
    @ManyToOne(() => FixedCostPreset, CatalogKey('preset_key'))
    presetKey: string | null = null;

    /**
     * Catalog merchant when the payee was picked from the catalog (N:1, optional).
     * Natural-key FK on `MerchantPreset.key`.
     */
    @ManyToOne(() => MerchantPreset, CatalogKey('merchant_key'))
    merchantKey: string | null = null;
}
