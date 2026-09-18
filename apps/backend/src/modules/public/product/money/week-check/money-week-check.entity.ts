import { Collection, Entity, Enum, OneToMany, Property, Unique } from '@mikro-orm/core';
import { WeekCheckStage } from '@rumtelo/contracts';

import type { WeekCheckAllocation } from './week-check-allocation.entity';

import { HouseholdEntity } from '../../../../../common/database/household.entity';
import { NativeEnum } from '../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../common/database/entity-config.util';

/**
 * The ten-minute weekly week check: look, redirect, set intention. Three steps on
 * purpose — the product's core claim is that this beats worrying daily.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'week_check' }))
@Unique({ properties: ['household', 'week'] })
export class WeekCheck extends HouseholdEntity {
    // ? PROPERTIES
    /** YYYY-Www */
    @Property({ length: 8 })
    week!: string;

    @Property({ type: 'bigint', default: 0 })
    surplus = 0;

    @Property({ length: 280, nullable: true })
    intention: string | null = null;

    @Property({ type: 'timestamptz', nullable: true })
    completedAt: Date | null = null;

    // ? ENUMS
    @Enum(NativeEnum({ WeekCheckStage, domain: 'money', defaultValue: WeekCheckStage.LOOK }))
    stage: WeekCheckStage = WeekCheckStage.LOOK;

    // ? RELATIONSHIPS
    @OneToMany('WeekCheckAllocation', 'weekCheck')
    allocations = new Collection<WeekCheckAllocation>(this);
}
