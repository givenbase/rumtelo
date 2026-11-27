/**
 * Week-Check Schemas (Money)
 * Ten-minute weekly review: look, redirect, set intention.
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import { HouseholdId, Id, Money, WeekKey } from '../../../../common/common.schema';
import { WeekCheckStage } from '../enums';

/**
 * The ten-minute weekly week check: look, redirect, set intention.
 * Deliberately three steps — the product's core claim is that this beats daily worry.
 */
export const WeekCheckAllocation = z.object({
    jarId: Id,
    amount: Money,
});

export const WeekCheck = z.object({
    id: Id,
    householdId: HouseholdId,
    week: WeekKey,
    stage: z.enum(WeekCheckStage),
    surplus: Money,
    allocations: z.array(WeekCheckAllocation),
    /** The single sentence the user commits to for the coming week. */
    intention: z.string().max(280).nullable(),
    completedAt: z.iso.datetime().nullable(),
    /**
     * Whether the Course stages follow the Money stages for this caller: the plan has
     * `growthCourse` and the caller is a writable seat (not VIEWER, not a Practice
     * preview). The client never infers this from the plan alone.
     */
    courseApplies: z.boolean(),
});

// Inferred types (same-module merge for consumers)
export type WeekCheckAllocation = z.infer<typeof WeekCheckAllocation>;
export type WeekCheck = z.infer<typeof WeekCheck>;
