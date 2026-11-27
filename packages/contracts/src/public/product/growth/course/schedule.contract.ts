/**
 * Schedule Contract (Growth · Koers)
 * Read-only synthesis mounted at `contract.growth.course.schedule`. The only write is
 * a reminder snooze; ticking happens through the source (course / rhythm).
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import {
    CourseScheduleListInput,
    CourseScheduleSnoozeInput,
    CourseScheduleView,
} from './schedule.schema';

// ====================================================================
// ? READ Operations
// ====================================================================

/** Rows for a date range (max 92 days), every lane the household's plan grants. */
export const courseScheduleList = oc.input(CourseScheduleListInput).output(CourseScheduleView);

// ====================================================================
// ? UPDATE Operations
// ====================================================================

/** "Not now": the month-close reminder moves to the last day itself. */
export const courseScheduleSnooze = oc
    .input(CourseScheduleSnoozeInput)
    .output(z.object({ ok: z.literal(true) }));

/** Nested contract object mounted at `contract.growth.course.schedule`. */
export const courseScheduleContract = {
    list: courseScheduleList,
    snooze: courseScheduleSnooze,
};
