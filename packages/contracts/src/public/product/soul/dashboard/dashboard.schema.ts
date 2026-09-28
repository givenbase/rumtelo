/**
 * Dashboard Schemas (Soul)
 * Soul portal hub composition.
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import { CoachMessage } from '../../../platform/coach/coach.schema';

/**
 * Soul portal hub composition. Stillness streak uses energy MIND logs when present;
 * centers stay 0 until a centers entity exists; intention is money week-check text
 * when that practice set one (closest persisted "intent" today).
 */
export const SoulDashboard = z.object({
    /** Consecutive days with a MIND log ending today (UTC), null when never logged. */
    stillnessStreakDays: z.int().nullable(),
    gratitudeThisWeek: z.int(),
    /** Money week-check intention for the current week, if any. */
    intention: z.string().max(280).nullable(),
    /** No centers entity yet. */
    centersNamedToday: z.int(),
    coach: z.array(CoachMessage),
});

// Inferred types (same-module merge for consumers)
export type SoulDashboard = z.infer<typeof SoulDashboard>;
