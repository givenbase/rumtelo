/**
 * Course Contract (Growth · Koers)
 * oRPC procedures for the cascade year → quarter → month → week → day.
 * Reads only return items the viewer may see (household visibility).
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import {
    CourseItem,
    CourseItemCreateInput,
    CourseItemRef,
    CourseItemStatusInput,
    CourseItemUpdateInput,
    CoursePeriodInput,
    CoursePeriodView,
    CourseYearInput,
} from './course.schema';

import { courseFeedContract } from './feed.contract';
import { courseRhythmContract } from './rhythm.contract';
import { courseScheduleContract } from './schedule.contract';

const ok = z.object({ ok: z.literal(true) });

// ====================================================================
// ? CREATE Operations
// ====================================================================

/** New item; refuses a fourth in the same slot. */
export const courseCreate = oc.input(CourseItemCreateInput).output(CourseItem);

// ====================================================================
// ? READ Operations
// ====================================================================

/** One period: items, their "why" chain and the layer below. */
export const coursePeriod = oc.input(CoursePeriodInput).output(CoursePeriodView);

/** Year, quarter and month items of one year — the year overview. */
export const courseYear = oc.input(CourseYearInput).output(z.array(CourseItem));

// ====================================================================
// ? UPDATE Operations
// ====================================================================

/** Edit, re-parent, reorder or change who sees it. */
export const courseUpdate = oc.input(CourseItemUpdateInput).output(CourseItem);

/** Review: done, partial, missed or let go. */
export const courseUpdateStatus = oc.input(CourseItemStatusInput).output(CourseItem);

/** Snooze: copy an unfinished item into the next period; the source becomes DEFERRED. */
export const courseCarry = oc.input(CourseItemRef).output(CourseItem);

// ====================================================================
// ? DELETE Operations
// ====================================================================

/** Children stay and become loose (`parentId = null`). */
export const courseRemove = oc.input(CourseItemRef).output(ok);

/** Nested contract object mounted at `contract.growth.course` (items + rhythm, schedule, feed). */
export const courseContract = {
    create: courseCreate,
    period: coursePeriod,
    year: courseYear,
    update: courseUpdate,
    updateStatus: courseUpdateStatus,
    carry: courseCarry,
    remove: courseRemove,
    rhythm: courseRhythmContract,
    schedule: courseScheduleContract,
    feed: courseFeedContract,
};
