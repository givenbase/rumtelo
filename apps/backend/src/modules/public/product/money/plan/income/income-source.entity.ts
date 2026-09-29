import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { Cadence, IncomeKind } from '@rumtelo/contracts';

import { CatalogKey } from '../../../../../../common/database/catalog-key.util';
import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { MoneyType } from '../../../../../../common/database/money.type';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { MerchantPreset } from '../../../../../backoffice/product/money/preset/merchant/merchant.entity';

/**
 * Income Source Entity
 *
 * Money that arrives on a cadence (salary, benefits, freelance). `amount` is the
 * cached current figure; `IncomeAmountPeriod` keeps the dated history behind it.
 *
 * @see IncomeAmountPeriod
 * @see IncomeSourcePreset — backoffice starting points
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'income_source' }))
export class IncomeSource extends HouseholdEntity {
    // ? PROPERTIES
    /** Household-facing label ("Salary", "Trading"). */
    @Property({ length: 120 })
    name!: string;

    /** Employer, client, or platform (DEGIRO, ACME BV). Mirrors Transaction.counterparty. */
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
     * Catalog merchant when Received from was picked from the catalog (N:1, optional).
     * Natural-key FK on `MerchantPreset.key`; retiring the preset nulls it
     * (`counterparty` keeps the name). Null for free-typed employers / platforms.
     */
    @ManyToOne(() => MerchantPreset, CatalogKey('merchant_key'))
    merchantKey: string | null = null;
}
