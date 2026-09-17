/**
 * Dashboard Schemas (Money)
 * One aggregated read for the money dashboard — avoids a waterfall of round trips.
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import { Id, IsoDate, Money, PeriodKey } from '../../../../common/common.schema';
import { CoachMessage } from '../../../platform/coach/coach.schema';
import { JarKey } from '../enums';
import { JarBalance } from '../jar/jar.schema';
import { MonthScore } from '../month-score/month-score.schema';

export const DashboardTravel = z.object({
    direction: z.enum(['current', 'past', 'future']),
    monthsHorizon: z.int().min(1),
    mode: z.enum(['snapshot', 'stacked']),
    relativeLabel: z.string(),
    daysLabel: z.string().nullable(),
});

export const DashboardGoalAtPeriod = z.object({
    goalId: Id,
    name: z.string(),
    jarKey: z.enum(JarKey).nullable(),
    saved: Money,
    target: Money,
    projectedSaved: Money,
    fulfilledByPeriod: z.boolean(),
    monthsToFulfill: z.int().nullable(),
    incomeNeededCents: Money.nullable(),
});

export const DashboardDebtsAtPeriod = z.object({
    totalRemaining: Money,
    totalOriginal: Money,
    debtFreeOn: IsoDate.nullable(),
    monthsRemaining: z.int().nullable(),
    clearedByPeriod: z.boolean(),
});

export const DashboardBaselineJar = z.object({
    id: Id,
    allocated: Money,
});

/** One aggregated read for the dashboard — avoids a waterfall of round trips. */
export const Dashboard = z.object({
    period: PeriodKey,
    periodLabel: z.string(),
    allocatedTotal: Money,
    incomeTotal: Money,
    spentTotal: Money,
    avgLeftOver: Money,
    /** What is safe to spend today without breaking any jar's line. */
    safePerDay: Money,
    playLeft: Money,
    inboxCount: z.int(),
    /** Jars that are not overspent this period. */
    jarsOnTrack: z.int(),
    jarsTotal: z.int(),
    /** Monthly-normalised active fixed OUT across all jars. */
    fixedCostsMonthly: Money,
    /** Estimated debt-free month (YYYY-MM-DD), null when no debts or no payment pool. */
    debtFreeOn: IsoDate.nullable(),
    debtMonthsRemaining: z.int().nullable(),
    jars: z.array(JarBalance),
    coach: z.array(CoachMessage),
    monthScore: MonthScore,
    why: z.string().nullable(),
    /** Period-travel chrome — snapshot when viewing the live month. */
    travel: DashboardTravel,
    /** Open goals projected to the selected period (fulfillment / shortfalls). */
    goalsAtPeriod: z.array(DashboardGoalAtPeriod),
    /** Debt remaining as-of the selected period (Looking Ahead projected). */
    debtsAtPeriod: DashboardDebtsAtPeriod.nullable(),
    /**
     * Live-month allocated totals for current→selected deltas.
     * Null when `travel.mode === 'snapshot'`.
     */
    baselineAllocatedTotal: Money.nullable(),
    baselineJars: z.array(DashboardBaselineJar).nullable(),
    /** Coach-spoken Looking Ahead / Looking Back line (null on current month). */
    travelCoachText: z.string().nullable(),
});

// Inferred types (same-module merge for consumers)
export type Dashboard = z.infer<typeof Dashboard>;
export type DashboardTravel = z.infer<typeof DashboardTravel>;
export type DashboardGoalAtPeriod = z.infer<typeof DashboardGoalAtPeriod>;
export type DashboardDebtsAtPeriod = z.infer<typeof DashboardDebtsAtPeriod>;
export type DashboardBaselineJar = z.infer<typeof DashboardBaselineJar>;
