/**
 * Lever Schemas (Growth)
 * Things that move earning power.
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import { HouseholdId, Id, Money } from '../../../../common/common.schema';

/** Things that move earning power. A Growth surface, not a budget line. */
export const IncomeLever = z.object({
    id: Id,
    householdId: HouseholdId,
    name: z.string().min(1).max(160),
    note: z.string().max(500).nullable(),
    potentialMonthly: Money,
    isDone: z.boolean(),
    /** Optional link back to the catalog preset key. */
    presetKey: z.string().max(64).nullable().optional(),
});

// Inferred types (same-module merge for consumers)
export type IncomeLever = z.infer<typeof IncomeLever>;
