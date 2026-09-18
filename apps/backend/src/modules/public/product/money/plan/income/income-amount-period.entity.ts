import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/core';

import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { MoneyType } from '../../../../../../common/database/money.type';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { IncomeSource } from './income-source.entity';

/**
 * Income Amount Period Entity
 *
 * Dated amount for an income source — raises / cuts without overwriting history.
 *
 * @see IncomeSource.amount — cached current (latest period)
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'income_amount_period' }))
// One figure per source per day; a same-day change overwrites the day's row.
@Unique({ properties: ['incomeSource', 'effectiveOn'] })
export class IncomeAmountPeriod extends HouseholdEntity {
    // ? PROPERTIES
    /** Amount per cadence in minor units from `effectiveOn` onwards. */
    @Property({ type: MoneyType })
    amount!: number;

    /** First day this amount applies. */
    @Property({ type: 'date' })
    effectiveOn!: string;

    // ? RELATIONSHIPS
    /** Owning source (N:1, required). Deleting the source deletes its history. */
    @ManyToOne(() => IncomeSource, { deleteRule: 'cascade' })
    incomeSource!: IncomeSource;
}
