/**
 * Month-Score Schemas
 * Monthly score, events, levels, and period recap.
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import { HouseholdId, Id, IsoDate, Money, PeriodKey } from '../../../../common/common.schema';
import { MonthScoreEventKind } from '../enums';

/**
 * Monthly score for one budget period (YYYY-MM). Accrues from observable
 * behaviour, closes on rollover, and is never re-openable — the log is the
 * household's honest history, not a leaderboard to be gamed.
 */
export const MonthScoreEvent = z.object({
    id: Id,
    householdId: HouseholdId,
    period: PeriodKey,
    kind: z.enum(MonthScoreEventKind),
    /** Calendar date the behaviour happened (`YYYY-MM-DD`). */
    occurredOn: IsoDate,
    text: z.string().max(240),
    points: z.int(),
});

export const MonthScore = z.object({
    householdId: HouseholdId,
    period: PeriodKey,
    score: z.int(),
    maxScore: z.int(),
    daysLeft: z.int(),
    isClosed: z.boolean(),
    level: z.int().min(1),
    levelLabel: z.string(),
    events: z.array(MonthScoreEvent),
});

export const Level = z.object({
    index: z.int().min(1),
    label: z.string(),
    /** Cumulative score needed to enter this level. */
    threshold: z.int(),
    unlocks: z.array(z.string()),
});

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
    headline: z.string(),
});

// Inferred types (same-module merge for consumers)
export type MonthScoreEvent = z.infer<typeof MonthScoreEvent>;
export type MonthScore = z.infer<typeof MonthScore>;
export type Level = z.infer<typeof Level>;
export type PeriodRecap = z.infer<typeof PeriodRecap>;
