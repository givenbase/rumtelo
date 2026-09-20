/**
 * Time Schemas (Energy)
 * Daily minutes per activity category and the weekly summary against evidence bands.
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import { HouseholdId, Id, IsoDate, WeekKey } from '../../../../common/common.schema';
import { TimeBandRegion, TimeBandStatus, TimeCategory, TimeEvidence, TimeKind } from '../enums';

/**
 * "Every hour gets a job too." One row per person per day per category, in minutes.
 * Replaces the invented "jar percentage × free hours" model with what the person
 * actually did. Aggregated weekly and compared against cited bands — never scored.
 */
export const TimeEntry = z.object({
    id: Id,
    householdId: HouseholdId,
    /** Rumtelo `auth.account.id` — person whose day this is (not Better Auth user). */
    accountId: Id,
    on: IsoDate,
    category: z.enum(TimeCategory),
    /** Whole minutes for that day; a day cannot hold more than 24h. */
    minutes: z.int().min(0).max(1440),
    note: z.string().max(280).nullable(),
});

/** One citation behind a band. The UI renders these as links, not as authority. */
export const TimeSource = z.object({
    name: z.string(),
    region: z.enum(TimeBandRegion),
    evidence: z.enum(TimeEvidence),
    url: z.url(),
    /** One sentence: what this source actually found or recommends. */
    claim: z.string(),
});

/**
 * Minutes per week. `floor` and `ceiling` are hard lines with health evidence;
 * `targetLow..targetHigh` is the range most guidelines agree on. Any side may be
 * open (`null`) — the Hadza show there is no meaningful ceiling on movement.
 */
export const TimeBand = z.object({
    floor: z.int().nullable(),
    targetLow: z.int().nullable(),
    targetHigh: z.int().nullable(),
    ceiling: z.int().nullable(),
    /**
     * Daily behaviour (sleep, screen) — safe to pro-rate by days logged.
     * Weekly accumulators (work, exercise) are only judged on a full week: an 8 h
     * workday is not a 56 h week.
     */
    perDay: z.boolean(),
});

/** Static reference for one category: its SNA kind, band (if any) and sources. */
export const TimeReference = z.object({
    category: z.enum(TimeCategory),
    kind: z.enum(TimeKind),
    band: TimeBand.nullable(),
    sources: z.array(TimeSource),
});

export const TimeCategorySummary = z.object({
    category: z.enum(TimeCategory),
    kind: z.enum(TimeKind),
    /** Sum over the days logged this week. */
    minutes: z.int(),
    /** `minutes / daysLogged`, rounded. 0 when nothing logged. */
    dailyAverage: z.int(),
    status: z.enum(TimeBandStatus),
});

/** Per-person split by SNA kind — the honest "where things diverge" inside a household. */
export const TimeMemberSummary = z.object({
    accountId: Id,
    daysLogged: z.int(),
    minutes: z.record(z.enum(TimeKind), z.int()),
});

export const TimeWeekSummary = z.object({
    week: WeekKey,
    from: IsoDate,
    to: IsoDate,
    /** Distinct calendar days with at least one entry (any member). */
    daysLogged: z.int(),
    /** Sum of every entry in the week. */
    loggedMinutes: z.int(),
    /** `daysLogged × 1440 − loggedMinutes` for the current person — what the diary missed. */
    unloggedMinutes: z.int(),
    categories: z.array(TimeCategorySummary),
    /** Sharif et al.'s discretionary time: the FREE kind, against the 2–5 h/day band. */
    discretionary: z.object({
        minutes: z.int(),
        dailyAverage: z.int(),
        status: z.enum(TimeBandStatus),
    }),
    members: z.array(TimeMemberSummary),
});

// Inferred types (same-module merge for consumers)
export type TimeEntry = z.infer<typeof TimeEntry>;
export type TimeSource = z.infer<typeof TimeSource>;
export type TimeBand = z.infer<typeof TimeBand>;
export type TimeReference = z.infer<typeof TimeReference>;
export type TimeCategorySummary = z.infer<typeof TimeCategorySummary>;
export type TimeMemberSummary = z.infer<typeof TimeMemberSummary>;
export type TimeWeekSummary = z.infer<typeof TimeWeekSummary>;
