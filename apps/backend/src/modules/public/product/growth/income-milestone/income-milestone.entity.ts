import { Entity, Property } from '@mikro-orm/core';

import { HouseholdEntity } from '../../../../../common/database/household.entity';
import { MoneyType } from '../../../../../common/database/money.type';
import { entityConfig } from '../../../../../common/database/entity-config.util';

/**
 * Income Milestone Entity
 *
 * A monthly-net target the household wants to reach ("€3.000 net/month").
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'growth', tableName: 'income_milestone' }))
export class IncomeMilestone extends HouseholdEntity {
    // ? PROPERTIES
    /** Household-facing label. */
    @Property({ length: 160 })
    name!: string;

    /** Monthly net target in minor units. */
    @Property({ type: MoneyType })
    targetMonthly!: number;

    /** Date the target was first reached; null while open. */
    @Property({ type: 'date', nullable: true })
    reachedOn: string | null = null;
}
