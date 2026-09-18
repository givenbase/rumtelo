import { Entity, Enum, Property } from '@mikro-orm/core';
import { Cadence, IncomeKind } from '@rumtelo/contracts';

import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { MoneyType } from '../../../../../../common/database/money.type';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';

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
    /** Household-facing label ("Salary Anna"). */
    @Property({ length: 120 })
    name!: string;

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

    // ? ENUMS
    /** Salary / benefit / freelance / … */
    @Enum(NativeEnum({ IncomeKind, domain: 'money', defaultValue: IncomeKind.SALARY }))
    kind: IncomeKind = IncomeKind.SALARY;

    /** How often it lands. */
    @Enum(NativeEnum({ Cadence, domain: 'money', defaultValue: Cadence.MONTHLY }))
    cadence: Cadence = Cadence.MONTHLY;
}
