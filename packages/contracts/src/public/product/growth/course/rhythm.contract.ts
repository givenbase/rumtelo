/**
 * Rhythm Contract (Growth · Koers)
 * oRPC procedures for routines. Mounted at `contract.growth.course.rhythm`.
 * Proposals ask for a yes: nothing is copied into a new period without one.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { CourseItem } from './course.schema';
import {
    CourseRhythm,
    CourseRhythmConfirmInput,
    CourseRhythmCreateInput,
    CourseRhythmListInput,
    CourseRhythmRef,
    CourseRhythmSuggestion,
    CourseRhythmSuggestionsInput,
    CourseRhythmTickInput,
    CourseRhythmUpdateInput,
    CourseRhythmWeekView,
} from './rhythm.schema';

const ok = z.object({ ok: z.literal(true) });

// ====================================================================
// ? CREATE Operations
// ====================================================================

/** New routine, optionally under a year, quarter or month item. */
export const courseRhythmCreate = oc.input(CourseRhythmCreateInput).output(CourseRhythm);

/** Tick a day (today or earlier). Idempotent per day. */
export const courseRhythmTick = oc.input(CourseRhythmTickInput).output(CourseRhythm);

// ====================================================================
// ? READ Operations
// ====================================================================

/** Running routines for one week, with ticks and the count of their period. */
export const courseRhythmList = oc.input(CourseRhythmListInput).output(CourseRhythmWeekView);

/** Proposals for the week being planned — shown in the week check and on Rhythm. */
export const courseRhythmSuggestions = oc
    .input(CourseRhythmSuggestionsInput)
    .output(z.array(CourseRhythmSuggestion));

// ====================================================================
// ? UPDATE Operations
// ====================================================================

/** Change the pattern ("make it smaller"), re-parent or change who sees it. */
export const courseRhythmUpdate = oc.input(CourseRhythmUpdateInput).output(CourseRhythm);

export const courseRhythmPause = oc.input(CourseRhythmRef).output(CourseRhythm);

export const courseRhythmResume = oc.input(CourseRhythmRef).output(CourseRhythm);

/** "Keep going" for this week — the proposal goes quiet until next week. */
export const courseRhythmConfirm = oc.input(CourseRhythmConfirmInput).output(CourseRhythm);

/**
 * Renew the parent milestone for the current month (same name, counter and goal) and
 * hang the routine under the copy. Idempotent per month.
 */
export const courseRhythmRenew = oc
    .input(CourseRhythmRef)
    .output(z.object({ rhythm: CourseRhythm, milestone: CourseItem }));

// ====================================================================
// ? DELETE Operations
// ====================================================================

/** Undo a tick. */
export const courseRhythmUntick = oc.input(CourseRhythmTickInput).output(CourseRhythm);

/** Stop the routine. Its ticks stay, so past counters keep their score. */
export const courseRhythmRemove = oc.input(CourseRhythmRef).output(ok);

/** Nested contract object mounted at `contract.growth.course.rhythm`. */
export const courseRhythmContract = {
    create: courseRhythmCreate,
    tick: courseRhythmTick,
    list: courseRhythmList,
    suggestions: courseRhythmSuggestions,
    update: courseRhythmUpdate,
    pause: courseRhythmPause,
    resume: courseRhythmResume,
    confirm: courseRhythmConfirm,
    renew: courseRhythmRenew,
    untick: courseRhythmUntick,
    remove: courseRhythmRemove,
};
