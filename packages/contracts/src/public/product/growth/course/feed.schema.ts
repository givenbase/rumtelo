/**
 * Calendar Feed Schemas (Growth · Koers)
 * A one-way mirror of Course into Google, Apple or Outlook through a secret ICS
 * address. Rumtelo writes, the calendar shows; ticking stays in Rumtelo.
 */

import { z } from 'zod';

import { HouseholdScoped } from '../../../../common/common.schema';
import { MONTH_CLOSE_LEAD_DAYS } from './schedule-rules';

/** What the feed shows, per person. Defaults are careful: more can be switched on. */
export const CourseFeedSources = z.object({
    /** This week's 3 as one all-day row from Monday to Sunday. */
    isFocusWeekShown: z.boolean(),
    /** Today's 3 per day (only when the day layer is on). */
    isFocusDayShown: z.boolean(),
    /** Routines on their pattern days. */
    isRhythmShown: z.boolean(),
    /** Week checks and the month close, with reminders. */
    isRitualsShown: z.boolean(),
    /** Sleep advice from the Energy template. */
    isSleepShown: z.boolean(),
    /** The rows of others in the household that you may see. */
    isPartnerShown: z.boolean(),
});

export const CourseFeedSettings = CourseFeedSources.extend({
    isEnabled: z.boolean(),
    /** Secret subscription address; null while the feed is off. */
    url: z.url().nullable(),
    /** `webcal://` form of `url` for Apple Calendar and Outlook desktop. */
    webcalUrl: z.string().nullable(),
    /** "Plan your month close" this many days before its last day. */
    monthCloseLeadDays: z.union(MONTH_CLOSE_LEAD_DAYS.map(days => z.literal(days))),
    lastFetchedAt: z.iso.datetime().nullable(),
});

export const CourseFeedUpdateInput = HouseholdScoped.extend({
    ...CourseFeedSources.partial().shape,
    monthCloseLeadDays: z.union(MONTH_CLOSE_LEAD_DAYS.map(days => z.literal(days))).optional(),
});

// Inferred types (same-module merge for consumers)
export type CourseFeedSources = z.infer<typeof CourseFeedSources>;
export type CourseFeedSettings = z.infer<typeof CourseFeedSettings>;
export type CourseFeedUpdateInput = z.infer<typeof CourseFeedUpdateInput>;
