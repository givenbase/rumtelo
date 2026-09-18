import { Collection, Entity, Enum, OneToMany, Property, Unique } from '@mikro-orm/core';
import { WeekCheckStage } from '@rumtelo/contracts';

import type { WeekCheckAllocation } from './week-check-allocation.entity';

import { MoneyType } from '../../../../../common/database/money.type';
import { NativeEnum } from '../../../../../common/database/native-enum.util';
import { WeekCheckEntity } from '../../../../../common/database/week-check.entity';
import { entityConfig } from '../../../../../common/database/entity-config.util';

/**
 * Money Week Check Entity
 *
 * The ten-minute weekly check: look, redirect, set intention. Three steps on
 * purpose — the product's core claim is that this beats worrying daily.
 *
 * @see WeekCheckEntity — shared week / completedAt shell across portals
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'week_check' }))
@Unique({ properties: ['household', 'week'] })
export class MoneyWeekCheck extends WeekCheckEntity {
    // ? PROPERTIES
    /** Left-over after fixed costs and jar targets this week, in minor units. */
    @Property({ type: MoneyType, default: 0 })
    surplus = 0;

    /** One sentence the household commits to for the coming week. */
    @Property({ length: 280, nullable: true })
    intention: string | null = null;

    // ? ENUMS
    /** LOOK → REDIRECT → INTENTION — which step the check is on. */
    @Enum(NativeEnum({ WeekCheckStage, domain: 'money', defaultValue: WeekCheckStage.LOOK }))
    stage: WeekCheckStage = WeekCheckStage.LOOK;

    // ? RELATIONSHIPS
    /** Where the surplus was redirected (1:N, inverse side). */
    @OneToMany('WeekCheckAllocation', 'weekCheck')
    allocations = new Collection<WeekCheckAllocation>(this);
}
