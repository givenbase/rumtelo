/**
 * Course rules (Growth · Koers)
 *
 * The domain rules both the API and the app apply — one source so a slot, a
 * progress ring or a form field can never disagree between server and screen.
 */

import { CourseHorizon, CourseItemStatus, CourseRhythmCadence, CourseRhythmKind } from '../enums';

/** Items per slot. Constraint creates focus. */
export const COURSE_SLOT_SIZE = 3;

/** Week and day are a top 3 per period; larger layers allow 3 per goal above. */
const PERIOD_CAPPED = new Set<CourseHorizon>([CourseHorizon.WEEK, CourseHorizon.DAY]);

/** Layers that describe an outcome ("done when …"). */
const OUTCOME_LAYERS = new Set<CourseHorizon>([
    CourseHorizon.YEAR,
    CourseHorizon.QUARTER,
    CourseHorizon.MONTH,
]);

/** Layers that may link a Money goal. */
const MONEY_GOAL_LAYERS = new Set<CourseHorizon>([CourseHorizon.YEAR, CourseHorizon.QUARTER]);

/** Let go or pushed forward: neither counts in a parent's progress. */
const UNCOUNTED_STATUSES = new Set<CourseItemStatus>([
    CourseItemStatus.DROPPED,
    CourseItemStatus.DEFERRED,
]);

/** True when the slot is (maker, horizon, period); false when the parent is part of it. */
export function isPeriodCapped(horizon: CourseHorizon): boolean {
    return PERIOD_CAPPED.has(horizon);
}

export function isOutcomeLayer(horizon: CourseHorizon): boolean {
    return OUTCOME_LAYERS.has(horizon);
}

export function canLinkMoneyGoal(horizon: CourseHorizon): boolean {
    return MONEY_GOAL_LAYERS.has(horizon);
}

export function countsInProgress(status: CourseItemStatus): boolean {
    return !UNCOUNTED_STATUSES.has(status);
}

// ====================================================================
// Counters and rhythm
// ====================================================================

/** Highest count a milestone may promise ("12× this month"). */
export const COURSE_TARGET_COUNT_MAX = 99;

/** Layers that may carry a counter (`targetCount`) filled by rhythm ticks. */
const COUNTABLE_LAYERS = new Set<CourseHorizon>([CourseHorizon.MONTH, CourseHorizon.QUARTER]);

/** Layers a rhythm may hang under. Never a week or a day: those are choices, not patterns. */
const RHYTHM_PARENT_LAYERS = new Set<CourseHorizon>([
    CourseHorizon.YEAR,
    CourseHorizon.QUARTER,
    CourseHorizon.MONTH,
]);

/** Largest `target` per cadence; DAILY is always exactly 1 (one tick per day). */
export const RHYTHM_TARGET_MAX: Record<CourseRhythmCadence, number> = {
    [CourseRhythmCadence.DAILY]: 1,
    [CourseRhythmCadence.WEEKLY]: 7,
    [CourseRhythmCadence.MONTHLY]: 31,
};

/** Days without a tick after which The Coach asks: pause or make it smaller? */
export const RHYTHM_QUIET_DAYS = 14;

export function isCountableLayer(horizon: CourseHorizon): boolean {
    return COUNTABLE_LAYERS.has(horizon);
}

export function canParentRhythm(horizon: CourseHorizon): boolean {
    return RHYTHM_PARENT_LAYERS.has(horizon);
}

/** Only a discipline counts: its ticks fill a milestone counter and show "7 of 12". */
export function isCountingRhythm(kind: CourseRhythmKind): boolean {
    return kind === CourseRhythmKind.DISCIPLINE;
}

/**
 * Shape a routine is stored in. A habit is always DAILY with target 1 — it only asks
 * "done today?" on its pattern days; a discipline keeps the cadence and target given.
 */
export function rhythmShapeFor(
    kind: CourseRhythmKind,
    cadence: CourseRhythmCadence,
    target: number
): { cadence: CourseRhythmCadence; target: number } {
    if (kind === CourseRhythmKind.HABIT) return { cadence: CourseRhythmCadence.DAILY, target: 1 };
    return { cadence, target };
}

/** True when `target` fits the cadence (DAILY = 1, WEEKLY 1–7, MONTHLY 1–31). */
export function isRhythmTargetValid(cadence: CourseRhythmCadence, target: number): boolean {
    if (!Number.isInteger(target) || target < 1) return false;
    return target <= RHYTHM_TARGET_MAX[cadence];
}

/**
 * Ticks a rhythm asks for in the period it counts in. DAILY counts per week:
 * one per pattern day (every day when no weekdays are set).
 */
export function rhythmPeriodTarget(
    cadence: CourseRhythmCadence,
    target: number,
    weekdays: readonly number[] | null
): number {
    if (cadence === CourseRhythmCadence.DAILY) return weekdays?.length ? weekdays.length : 7;
    return target;
}

/** ISO weekday 1 (Monday) … 7 (Sunday) of an ISO date. */
export function isoWeekdayOf(isoDate: string): number {
    return new Date(`${isoDate}T00:00:00Z`).getUTCDay() || 7;
}

/**
 * Should the routine show up on `isoDate`? On its pattern days; without a pattern,
 * every day until the period's count is reached (then it rests, it does not nag).
 */
export function isRhythmDueOn(input: {
    cadence: CourseRhythmCadence;
    weekdays: readonly number[] | null;
    isoDate: string;
    periodCount: number;
    periodTarget: number;
}): boolean {
    if (input.weekdays?.length) return input.weekdays.includes(isoWeekdayOf(input.isoDate));
    if (input.cadence === CourseRhythmCadence.DAILY) return true;
    return input.periodCount < input.periodTarget;
}
