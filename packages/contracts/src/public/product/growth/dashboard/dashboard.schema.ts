/**
 * Dashboard Schemas (Growth)
 * Growth portal hub composition.
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import { Money } from '../../../../common/common.schema';
import { CoachMessage } from '../../../platform/coach/coach.schema';

/**
 * Growth portal hub composition — goals/income from money aggregates;
 * learn from the shelf; net worth from holdings + jars − debts.
 */
export const GrowthDashboard = z.object({
    goalsActive: z.int(),
    goalsTotal: z.int(),
    /** Mean progress 0–100 across active goals (0 when none). */
    goalsProgressPct: z.int().min(0).max(100),
    incomeMonthly: Money,
    /** Titles still on Focus (NOW + QUEUE). Matches Learn → Focus. */
    learnQueued: z.int(),
    /** Share of picked titles that are DONE (0 when none picked). */
    learnProgressPct: z.int().min(0).max(100),
    netWorth: Money.nullable(),
    coach: z.array(CoachMessage),
});

// Inferred types (same-module merge for consumers)
export type GrowthDashboard = z.infer<typeof GrowthDashboard>;
