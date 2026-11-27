/**
 * Schedule Schemas (Growth · Koers)
 * One read over Course and the checks around it — what is on a day or a week. Course
 * › Today and › Week, the Home card and the calendar feed all read it. Rows come from
 * their source (Focus, a routine, a week check, Energy) and link back there; nothing
 * here is stored as a row of its own.
 */

import { z } from 'zod';

import { HouseholdScoped, Id, IsoDate, WeekKey } from '../../../../common/common.schema';
import {
    CourseArea,
    CourseLane,
    CourseRhythmKind,
    CourseRitual,
    CourseScheduleKind,
} from '../enums';
import { SCHEDULE_MAX_DAYS, daySpan } from './schedule-rules';

export const CourseScheduleEntry = z.object({
    /** Stable identity (also the calendar UID): `focus-week:2026-W43:<account>`. */
    key: z.string().min(1).max(160),
    lane: z.enum(CourseLane),
    kind: z.enum(CourseScheduleKind),
    area: z.enum(CourseArea),
    /** First day; `endDate` is the last day (inclusive). */
    date: IsoDate,
    endDate: IsoDate,
    /** Item or routine names the row is about (empty for rituals and advice). */
    names: z.array(z.string()),
    /** Source ids: Focus items, or the routine. */
    sourceIds: z.array(Id),
    isDone: z.boolean(),
    /** Routine rows: HABIT (badge "Habit", no counter) or DISCIPLINE (counts). */
    rhythmKind: z.enum(CourseRhythmKind).nullable(),
    /** Counts where they mean something: Focus done / total, discipline ticks / target. */
    doneCount: z.int().min(0).nullable(),
    totalCount: z.int().min(0).nullable(),
    /** Week (`YYYY-Www`) or month (`YYYY-MM`) the row is about. */
    period: z.string().nullable(),
    /** A month close past its last day that is still open — stays until it is done. */
    isOverdue: z.boolean(),
    /** Day the reminder starts showing (month close). */
    reminderDate: IsoDate.nullable(),
    /** Snoozable ritual and whether this period's reminder was snoozed. */
    ritual: z.enum(CourseRitual).nullable(),
    isSnoozed: z.boolean(),
    /** Advice: planned minutes and the advised band (sleep: 7–9 h). */
    minutes: z.int().min(0).nullable(),
    adviceLowMinutes: z.int().min(0).nullable(),
    adviceHighMinutes: z.int().min(0).nullable(),
    /** Maker of a Focus / Rhythm row; null for rituals, advice and together rows. */
    accountId: Id.nullable(),
    isMine: z.boolean(),
    /** In-app path the row opens. */
    href: z.string(),
});

export const CourseScheduleView = z.object({
    from: IsoDate,
    to: IsoDate,
    /** Today in the household calendar (UTC date). */
    today: IsoDate,
    /** The week the Growth week check plans today (Sunday → next week). */
    weekCheckWeek: WeekKey,
    entries: z.array(CourseScheduleEntry),
});

export const CourseScheduleListInput = HouseholdScoped.extend({
    from: IsoDate,
    to: IsoDate,
}).refine(input => input.from <= input.to && daySpan(input.from, input.to) <= SCHEDULE_MAX_DAYS, {
    message: `Range must run forward and cover at most ${SCHEDULE_MAX_DAYS} days`,
    path: ['to'],
});

export const CourseScheduleSnoozeInput = HouseholdScoped.extend({
    ritual: z.enum(CourseRitual),
    /** Month (`YYYY-MM`) whose reminder moves to the day itself. */
    period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

// Inferred types (same-module merge for consumers)
export type CourseScheduleEntry = z.infer<typeof CourseScheduleEntry>;
export type CourseScheduleView = z.infer<typeof CourseScheduleView>;
export type CourseScheduleListInput = z.infer<typeof CourseScheduleListInput>;
export type CourseScheduleSnoozeInput = z.infer<typeof CourseScheduleSnoozeInput>;
