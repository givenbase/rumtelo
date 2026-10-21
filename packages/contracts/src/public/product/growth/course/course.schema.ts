/**
 * Course Schemas (Growth · Koers)
 * The cascade year → quarter → month → week → day. Max 3 items per slot;
 * every item hangs under one item a layer up. Progress is computed, never stored.
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import { HouseholdId, HouseholdScoped, Id } from '../../../../common/common.schema';
import { VisibilityChoice } from '../../../platform/enums';
import { PersonalFields } from '../../../platform/household/visibility';
import { CourseHorizon, CourseItemStatus } from '../enums';
import { isCoursePeriod } from './course-period';
import { COURSE_SLOT_SIZE, COURSE_TARGET_COUNT_MAX, isCountableLayer } from './course-rules';

/** Period key for any horizon; pair with {@link isCoursePeriod} for the exact format. */
export const CoursePeriodKey = z.string().min(4).max(10);

/**
 * Roll-up from the layer below; DROPPED children leave the total. With a counter
 * (`targetCount`), `done` is the rhythm ticks in the period and `total` the counter.
 */
export const CourseProgress = z.object({
    done: z.int().min(0),
    total: z.int().min(0),
});

export const CourseItem = z.object({
    id: Id,
    householdId: HouseholdId,
    horizon: z.enum(CourseHorizon),
    period: CoursePeriodKey,
    /** Item one layer up; null = loose (allowed, The Coach names it). */
    parentId: Id.nullable(),
    position: z.int().min(1).max(COURSE_SLOT_SIZE),
    name: z.string().min(1).max(140),
    /** "Done when …" — meaningful for year / quarter / month. */
    doneWhen: z.string().max(280).nullable(),
    status: z.enum(CourseItemStatus),
    reviewNote: z.string().max(280).nullable(),
    /** Set when carried forward from the previous period. */
    carriedFromId: Id.nullable(),
    /** How often this item has been pushed forward along its carry chain; 0 = fresh. */
    carryCount: z.int().min(0),
    /** Linked Money goal (year / quarter only). */
    goalId: Id.nullable(),
    /** Learn skill catalog key. */
    skill: z.string().max(64).nullable(),
    /** Month / quarter counter ("12×"), filled by ticks of rhythms hanging under it. */
    targetCount: z.int().min(1).max(COURSE_TARGET_COUNT_MAX).nullable(),
    progress: CourseProgress,
    /** Children that exist but are hidden from the viewer ("+1 private"). */
    hiddenChildCount: z.int().min(0),
    ...PersonalFields.shape,
    canEdit: z.boolean(),
});

/** One period on screen: its items, their "why" chain and the layer below. */
export const CoursePeriodView = z.object({
    horizon: z.enum(CourseHorizon),
    period: CoursePeriodKey,
    items: z.array(CourseItem),
    /** Visible ancestors of `items`, any depth; walk `parentId` to build the chain. */
    ancestors: z.array(CourseItem),
    /** Visible items one layer down whose parent is in `items`. */
    children: z.array(CourseItem),
    /** Items in this period hidden from the viewer. */
    hiddenCount: z.int().min(0),
    /** Visibility choices the viewer may pick here (empty = cannot create). */
    visibilityOptions: z.array(z.enum(VisibilityChoice)),
    /** Preselected choice for a new item. */
    defaultVisibility: z.enum(VisibilityChoice),
    /** False for a single participant — the picker stays hidden. */
    isVisibilityPickerShown: z.boolean(),
});

const periodMatchesHorizon = (input: { horizon: CourseHorizon; period?: string | null }) =>
    input.period === undefined ||
    input.period === null ||
    isCoursePeriod(input.horizon, input.period);

const periodIssue = { message: 'Period does not match horizon', path: ['period'] };

export const CourseItemCreateInput = HouseholdScoped.extend({
    horizon: z.enum(CourseHorizon),
    period: CoursePeriodKey,
    parentId: Id.nullish(),
    name: z.string().trim().min(1).max(140),
    doneWhen: z.string().trim().max(280).nullish(),
    /** Omitted = the viewer's default choice. */
    visibility: z.enum(VisibilityChoice).nullish(),
    goalId: Id.nullish(),
    skill: z.string().max(64).nullish(),
    targetCount: z.int().min(1).max(COURSE_TARGET_COUNT_MAX).nullish(),
})
    .refine(periodMatchesHorizon, periodIssue)
    .refine(input => !input.targetCount || isCountableLayer(input.horizon), {
        message: 'Only a month or quarter takes a counter',
        path: ['targetCount'],
    });

export const CoursePeriodInput = HouseholdScoped.extend({
    horizon: z.enum(CourseHorizon),
    /** Omitted = the period containing today. */
    period: CoursePeriodKey.nullish(),
    /** View filter "Ik · Iedereen · [naam]": only this maker's rows (never widens access). */
    accountId: Id.nullish(),
}).refine(periodMatchesHorizon, periodIssue);

export const CourseYearInput = HouseholdScoped.extend({
    year: z.string().regex(/^\d{4}$/),
});

export const CourseItemUpdateInput = HouseholdScoped.extend({
    id: Id,
    name: z.string().trim().min(1).max(140).optional(),
    doneWhen: z.string().trim().max(280).nullable().optional(),
    parentId: Id.nullable().optional(),
    position: z.int().min(1).max(COURSE_SLOT_SIZE).optional(),
    visibility: z.enum(VisibilityChoice).optional(),
    goalId: Id.nullable().optional(),
    skill: z.string().max(64).nullable().optional(),
    targetCount: z.int().min(1).max(COURSE_TARGET_COUNT_MAX).nullable().optional(),
});

export const CourseItemStatusInput = HouseholdScoped.extend({
    id: Id,
    status: z.enum(CourseItemStatus),
    reviewNote: z.string().trim().max(280).nullish(),
});

export const CourseItemRef = HouseholdScoped.extend({ id: Id });

// Inferred types (same-module merge for consumers)
export type CourseProgress = z.infer<typeof CourseProgress>;
export type CourseItem = z.infer<typeof CourseItem>;
export type CoursePeriodView = z.infer<typeof CoursePeriodView>;
export type CourseItemCreateInput = z.infer<typeof CourseItemCreateInput>;
export type CoursePeriodInput = z.infer<typeof CoursePeriodInput>;
export type CourseYearInput = z.infer<typeof CourseYearInput>;
export type CourseItemUpdateInput = z.infer<typeof CourseItemUpdateInput>;
export type CourseItemStatusInput = z.infer<typeof CourseItemStatusInput>;
export type CourseItemRef = z.infer<typeof CourseItemRef>;
