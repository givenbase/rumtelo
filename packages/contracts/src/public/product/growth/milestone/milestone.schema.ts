/**
 * Milestone Schemas (Growth)
 * Income milestones — monthly earning targets.
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import { HouseholdId, Id, IsoDate, Money } from '../../../../common/common.schema';

export const IncomeMilestone = z.object({
    id: Id,
    householdId: HouseholdId,
    name: z.string().min(1).max(160),
    targetMonthly: Money,
    reachedOn: IsoDate.nullable(),
});

// Inferred types (same-module merge for consumers)
export type IncomeMilestone = z.infer<typeof IncomeMilestone>;
