import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import { Cadence, FlowDirection } from '@rumtelo/contracts';

import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { Category } from '../jar/category.entity';
import { Jar } from '../jar/jar.entity';

/**
 * Recurring obligations. They draw from a jar so they are visible before they hit.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'fixed_cost' }))
export class FixedCost extends HouseholdEntity {
    // ? PROPERTIES
    @Property({ length: 120 })
    name!: string;

    /** Who receives it (landlord, insurer, organisation). Mirrors Transaction.counterparty. */
    @Property({ length: 160, nullable: true })
    counterparty: string | null = null;

    @Property({ type: 'bigint' })
    amount!: number;

    @Property({ nullable: true })
    dueDay: number | null = null;

    @Property({ type: 'text', nullable: true })
    note: string | null = null;

    @Property({ default: true })
    isActive = true;

    @Property({ type: 'date', nullable: true })
    endsOn: string | null = null;

    // ? ENUMS
    @Enum(NativeEnum({ Cadence, domain: 'money', defaultValue: Cadence.MONTHLY }))
    cadence: Cadence = Cadence.MONTHLY;

    @Enum(NativeEnum({ FlowDirection, domain: 'money', defaultValue: FlowDirection.OUT }))
    direction: FlowDirection = FlowDirection.OUT;

    // ? RELATIONSHIPS
    @ManyToOne(() => Jar)
    jar!: Jar;

    @ManyToOne(() => Category, { nullable: true })
    category: Category | null = null;
}
