import { Entity, Enum, Index, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { Cadence, FlowDirection } from '@rumtelo/contracts';

import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { MoneyType } from '../../../../../../common/database/money.type';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { Debt } from '../../targets/debt/debt.entity';
import { Category } from '../jar/category.entity';
import { Jar } from '../jar/jar.entity';

/**
 * Fixed Cost Entity
 *
 * Recurring obligations. They draw from a jar so they are visible before they hit.
 *
 * @see FixedCostPreset — backoffice starting points the household picks from
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'fixed_cost' }))
// At most one planned payment per debt.
@Unique({ properties: ['debt'] })
@Index({ properties: ['jar'] })
@Index({ properties: ['category'] })
export class FixedCost extends HouseholdEntity {
    // ? PROPERTIES
    /** Household-facing label ("Rent", "Netflix"). */
    @Property({ length: 120 })
    name!: string;

    /** Free-text note. */
    @Property({ type: 'text', nullable: true })
    note: string | null = null;

    /** Who receives it (landlord, insurer, organisation). Mirrors Transaction.counterparty. */
    @Property({ length: 160, nullable: true })
    counterparty: string | null = null;

    /** Amount per cadence in minor units. */
    @Property({ type: MoneyType })
    amount!: number;

    /** Paused costs stay on the list but leave the budget maths. */
    @Property({ default: true })
    isActive = true;

    /** Day of month it is charged (1–31); null = unknown / irregular. */
    @Property({ type: 'smallint', nullable: true })
    dueDay: number | null = null;

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
}
