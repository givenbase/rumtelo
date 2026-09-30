import { Check, Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { Cadence, IncomeKind } from '@rumtelo/contracts';

import { CatalogKey } from '../../../../../../common/database/catalog-key.util';
import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { MoneyType } from '../../../../../../common/database/money.type';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { IncomeSourcePreset } from '../../../../../backoffice/product/money/preset/income/income.entity';
import { MerchantPreset } from '../../../../../backoffice/product/money/preset/merchant/merchant.entity';
import { Asset } from '../../../growth/asset/asset.entity';
import { Party } from '../party/party.entity';

/**
 * Income Source Entity
 *
 * Money that arrives on a cadence (salary, benefits, freelance). `amount` is the
 * cached current figure; `IncomeAmountPeriod` keeps the dated history behind it.
 * `name` + optional `presetKey` = what income; counterparty triple = who pays.
 *
 * @see IncomeAmountPeriod
 * @see IncomeSourcePreset — backoffice starting points
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'income_source' }))
@Index({ properties: ['party'] })
@Index({ properties: ['asset'] })
@Check({
    name: 'money_income_source_merchant_xor_party',
    expression: '(merchant_key IS NULL) OR (party_id IS NULL)',
})
@Check({
    name: 'money_income_source_counterparty_when_linked',
    expression: '((merchant_key IS NULL) AND (party_id IS NULL)) OR (counterparty IS NOT NULL)',
})
export class IncomeSource extends HouseholdEntity {
    // ? PROPERTIES
    /** Household-facing label ("Salary", "Trading") — snapshot of the preset or typed name. */
    @Property({ length: 120 })
    name!: string;

    /**
     * Received from — display snapshot of the other side (DEGIRO, ACME BV).
     * Always set when `merchantKey` or `party` is; survives both being cleared.
     */
    @Property({ length: 160, nullable: true })
    counterparty: string | null = null;

    /** Current amount per cadence in minor units — mirror of the latest amount period. */
    @Property({ type: MoneyType })
    amount!: number;

    /** Inactive sources stay for history but leave the income total. */
    @Property({ default: true })
    isActive = true;

    /** Day of month the money lands (1–31); drives the auto-split trigger. */
    @Property({ type: 'smallint', nullable: true })
    expectedDay: number | null = null;

    /** First payout date; null = unknown. */
    @Property({ type: 'date', nullable: true })
    startedOn: string | null = null;

    /** Last day this source applies; null = open-ended. */
    @Property({ type: 'date', nullable: true })
    endsOn: string | null = null;

    // ? ENUMS
    /** Salary / benefit / freelance / … */
    @Enum(NativeEnum({ IncomeKind, domain: 'money', defaultValue: IncomeKind.SALARY }))
    kind: IncomeKind = IncomeKind.SALARY;

    /** How often it lands. */
    @Enum(NativeEnum({ Cadence, domain: 'money', defaultValue: Cadence.MONTHLY }))
    cadence: Cadence = Cadence.MONTHLY;

    // ? RELATIONSHIPS
    /**
     * Household party when Received from is one of their saved names (N:1, optional).
     * `mapToPk` keeps it a plain uuid; deleting the party nulls it (`counterparty`
     * keeps the name). Mutually exclusive with `merchantKey`.
     */
    @ManyToOne(() => Party, { mapToPk: true, nullable: true, deleteRule: 'set null' })
    party: string | null = null;

    /**
     * Holding this income comes from (the company's draw, rent from a property).
     * Attribution only — the split still runs on the jars. Cleared if the asset goes.
     */
    @ManyToOne(() => Asset, { mapToPk: true, nullable: true, deleteRule: 'set null' })
    asset: string | null = null;

    /**
     * Income-type catalog pick — natural-key FK on `IncomeSourcePreset.key`.
     * Null when the name was free-typed. Retiring the preset nulls this; `name` stays.
     */
    @ManyToOne(() => IncomeSourcePreset, CatalogKey('preset_key'))
    presetKey: string | null = null;

    /**
     * Catalog merchant when Received from was picked from the catalog (N:1, optional).
     * Natural-key FK on `MerchantPreset.key`; retiring the preset nulls it
     * (`counterparty` keeps the name). Null for free-typed employers / platforms.
     */
    @ManyToOne(() => MerchantPreset, CatalogKey('merchant_key'))
    merchantKey: string | null = null;
}
