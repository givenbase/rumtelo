/**
 * Progress Schemas (Money)
 * As-of-now board facts and the stage they reach. Computed on every read from board data;
 * nothing here is stored per milestone.
 */

import { z } from 'zod';

import { BoardStage } from '../../../platform/enums';

/** The event that reaches the next stage, for "Coming up" copy. */
export const BoardStageTrigger = z.enum([
    'SORT_FIVE_OR_DAY_FIVE',
    'FIRST_WEEK_CHECK',
    'FIRST_MONTH_CLOSE',
]);

/** The next stage and what reaches it. */
export const MoneyProgressNext = z.object({
    stage: z.enum(BoardStage),
    trigger: BoardStageTrigger,
    /** Only for SORT_FIVE_OR_DAY_FIVE: lines still to sort (0-5). Null otherwise. */
    sortedRemaining: z.int().min(0).max(5).nullable(),
    /** Only for SORT_FIVE_OR_DAY_FIVE: days still to wait (0-5). Null otherwise. */
    daysRemaining: z.int().min(0).max(5).nullable(),
});

/** As-of-now board facts and the stage they reach. Never depends on period travel. */
export const MoneyProgress = z.object({
    /** Any transaction on the board, all time. */
    hasTransactions: z.boolean(),
    /** Any money week check with a completion time, all time. */
    hasCompletedWeekCheck: z.boolean(),
    /** The money check for the current ISO week is done. */
    weekCheckDoneThisWeek: z.boolean(),
    /** Any month score closed, all time. */
    hasClosedMonth: z.boolean(),
    /** SORTED transactions, all time, capped at 5 (a limited read, not a full count). */
    sortedCount: z.int().min(0).max(5),
    /** Whole days since the household was created (UTC); never negative. */
    householdAgeDays: z.int().min(0),
    /**
     * max(derived stage, paid-plan floor, stored floor). The client applies the person's
     * `showAllSurfaces` and the Practice preview on top.
     */
    stage: z.enum(BoardStage),
    /** The next stage and what reaches it. Null at MONTH. */
    next: MoneyProgressNext.nullable(),
});

// Inferred types (same-module merge for consumers)
export type BoardStageTrigger = z.infer<typeof BoardStageTrigger>;
export type MoneyProgressNext = z.infer<typeof MoneyProgressNext>;
export type MoneyProgress = z.infer<typeof MoneyProgress>;
