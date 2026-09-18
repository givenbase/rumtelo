import { Property } from '@mikro-orm/core';

import { HouseholdEntity } from './household.entity';

/**
 * HouseholdEntity + the weekly check shell every product portal shares.
 *
 * ```
 * HouseholdEntity          id, createdAt, updatedAt, household
 *   └─ WeekCheckEntity       + week (YYYY-Www), completedAt
 *         ├─ MoneyWeekCheck    + surplus, intention, stage, allocations
 *         ├─ GrowthWeekCheck
 *         ├─ EnergyWeekCheck
 *         └─ SoulWeekCheck
 * ```
 *
 * Mirrors `PortalWeekCheck` in `@rumtelo/contracts`. Each subclass keeps its own
 * table and adds `@Unique({ properties: ['household', 'week'] })`.
 */
export abstract class WeekCheckEntity extends HouseholdEntity {
    // ? PROPERTIES
    /** ISO week key `YYYY-Www` — the unit of the weekly check. */
    @Property({ length: 8 })
    week!: string;

    /** When the household finished this week's check. Null = open. */
    @Property({ type: 'timestamptz', nullable: true })
    completedAt: Date | null = null;
}
