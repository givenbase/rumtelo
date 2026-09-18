import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/core';

import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { MoneyType } from '../../../../../../common/database/money.type';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { Jar } from './jar.entity';

/**
 * Category Entity
 *
 * A spending line inside a jar.
 * Stored `budgeted` is a manual envelope; JarBalance.budgeted adds monthly fixed OUT.
 * Actuals on balances come from sorted OUT transactions in the period.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'category' }))
// One name per jar; services revive an archived row instead of creating a twin.
@Unique({ properties: ['household', 'jar', 'name'] })
@Index({ properties: ['jar'] })
export class Category extends HouseholdEntity {
    // ? PROPERTIES
    /** Household-facing label ("Groceries"). */
    @Property({ length: 80 })
    name!: string;

    /** Manual monthly envelope in minor units. */
    @Property({ type: MoneyType, default: 0 })
    budgeted = 0;

    /** Display order inside the jar. */
    @Property({ default: 0 })
    sortOrder = 0;

    /** Hidden from pickers but kept for history; a re-created twin revives it. */
    @Property({ default: false })
    isArchived = false;

    // ? RELATIONSHIPS
    /** Parent jar (N:1, required). Deleting the jar deletes its categories. */
    @ManyToOne(() => Jar, { deleteRule: 'cascade' })
    jar!: Jar;
}
