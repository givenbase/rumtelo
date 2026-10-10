/**
 * Month-Score Schemas
 * Monthly score, events, levels, and period recap.
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import { HouseholdId, Id, IsoDate, Money, PeriodKey } from '../../../../common/common.schema';
import { MonthScoreEventKind } from '../enums';

/** Consecutive uncleared rolled months before converting backlog into a debt. */
export const FIXED_COST_ARREARS_DEBT_THRESHOLD = 3;

/**
 * Monthly score for one budget period (YYYY-MM). Accrues from observable
 * behavior, closes on rollover, and is never re-openable — the log is the
 * household's honest history, not a leaderboard to be gamed.
 */
export const MonthScoreEvent = z.object({
    id: Id,
    householdId: HouseholdId,
    period: PeriodKey,
    kind: z.enum(MonthScoreEventKind),
    /** Calendar date the behavior happened (`YYYY-MM-DD`). */
    occurredOn: IsoDate,
    text: z.string().max(240),
    points: z.int(),
});

/** One unpaid bill that must be skipped or carried before close. */
export const MonthCloseDueBill = z.object({
    fixedCostId: Id,
    name: z.string(),
    amount: Money,
    /** Uncleared rolled months already ahead of this close (0 = first carry). */
    arrearsMonths: z.int().nonnegative(),
});

/** Open work that blocks closing this period (inbox + unpaid/unskipped bills). */
export const MonthCloseBlockers = z.object({
    inboxCount: z.int().nonnegative(),
    dueBillCount: z.int().nonnegative(),
    /** Up to a few bill names for warning copy. */
    dueBillNames: z.array(z.string()),
    /** Full due-bill list for the close wizard (skip / carry). */
    dueBills: z.array(MonthCloseDueBill).default([]),
});

/** Per-bill choice when closing with open fixed costs. */
export const MonthCloseBillDisposition = z.object({
    fixedCostId: Id,
    action: z.enum(['skip', 'roll']),
});

export const MonthScore = z.object({
    householdId: HouseholdId,
    period: PeriodKey,
    score: z.int(),
    maxScore: z.int(),
    /**
     * Signed days to the period’s last calendar day (UTC).
     * Positive = still open · 0 = last day · negative = overdue to close.
     */
    daysLeft: z.int(),
    isClosed: z.boolean(),
    /** Level index (1–5). Display label comes from client i18n. */
    level: z.int().min(1),
    events: z.array(MonthScoreEvent),
    /**
     * Null when the period is already closed.
     * When open: inbox + due bills that must be cleared before close.
     */
    closeBlockers: MonthCloseBlockers.nullable(),
    /**
     * Nearest earlier period that still needs closing before this one can lock.
     * Null when the close chain is clear. Current-month writes stay allowed.
     */
    priorOpenPeriod: PeriodKey.nullable(),
});

/** Stable unlock keys — client maps to `pages.dashboard.levels.unlocks.*`. */
export const MonthScoreUnlockKey = z.enum([
    'six_jars',
    'inbox',
    'week_check',
    'goals',
    'debts',
    'energy_layer',
    'coach',
    'export',
]);

export const Level = z.object({
    index: z.int().min(1),
    /** Cumulative score needed to enter this level. */
    threshold: z.int(),
    unlocks: z.array(MonthScoreUnlockKey),
});

export const PeriodRecapHeadlineKey = z.enum(['surplus', 'overspent']);

/** End-of-period recap shown before the next month begins. */
export const PeriodRecap = z.object({
    period: PeriodKey,
    income: Money,
    allocated: Money,
    spent: Money,
    leftOver: Money,
    score: z.int(),
    bestJar: z.string().nullable(),
    worstJar: z.string().nullable(),
    /** Client maps to `pages.dashboard.recap.*`. */
    headlineKey: PeriodRecapHeadlineKey,
});

// Inferred types (same-module merge for consumers)
export type MonthScoreEvent = z.infer<typeof MonthScoreEvent>;
export type MonthCloseDueBill = z.infer<typeof MonthCloseDueBill>;
export type MonthCloseBlockers = z.infer<typeof MonthCloseBlockers>;
export type MonthCloseBillDisposition = z.infer<typeof MonthCloseBillDisposition>;
export type MonthScore = z.infer<typeof MonthScore>;
export type Level = z.infer<typeof Level>;
export type PeriodRecap = z.infer<typeof PeriodRecap>;
export type MonthScoreUnlockKey = z.infer<typeof MonthScoreUnlockKey>;
export type PeriodRecapHeadlineKey = z.infer<typeof PeriodRecapHeadlineKey>;
