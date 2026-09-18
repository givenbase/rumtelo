import { Entity, Property } from '@mikro-orm/core';

import { HouseholdEntity } from '../../../../../common/database/household.entity';
import { MoneyType } from '../../../../../common/database/money.type';
import { entityConfig } from '../../../../../common/database/entity-config.util';

/**
 * Income Lever Entity
 *
 * Things that move earning power (ask for a raise, start a side gig). A growth
 * surface, not a budget line.
 *
 * @see LeverPreset — backoffice starting points
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'growth', tableName: 'income_lever' }))
export class IncomeLever extends HouseholdEntity {
    // ? PROPERTIES
    /** Household-facing label ("Ask for a raise"). */
    @Property({ length: 160 })
    name!: string;

    /** Free-text note. */
    @Property({ type: 'text', nullable: true })
    note: string | null = null;

    /** Estimated extra net per month if pulled, in minor units. */
    @Property({ type: MoneyType, default: 0 })
    potentialMonthly = 0;

    /** Pulled — kept on the list as a win. */
    @Property({ default: false })
    isDone = false;
}
