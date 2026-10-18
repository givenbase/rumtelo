/**
 * Plan Schemas (Growth)
 * The cascade year → quarter → month → week → day. Max 3 items per slot;
 * every item hangs under one item a layer up. Progress is computed, never stored.
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import { HouseholdId, HouseholdScoped, Id } from '../../../../common/common.schema';
import { VisibilityChoice } from '../../../platform/enums';
import { PersonalFields } from '../../../platform/household/visibility';
import { PlanHorizon, PlanItemStatus } from '../enums';
import { isPlanPeriod } from './plan-period';

/** Items per (person, horizon, period, parent). Constraint creates focus. */
export const PLAN_SLOT_SIZE = 3;

/** Period key for any horizon; pair with {@link isPlanPeriod} for the exact format. */
export const PlanPeriodKey = z.string().min(4).max(10);

/** Roll-up from the layer below; DROPPED children leave the total. */
export const PlanProgress = z.object({
    done: z.int().min(0),
    total: z.int().min(0),
});

export const PlanItem = z.object({
    id: Id,
    householdId: HouseholdId,
    horizon: z.enum(PlanHorizon),
    period: PlanPeriodKey,
    /** Item one layer up; null = loose (allowed, The Coach names it). */
    parentId: Id.nullable(),
    position: z.int().min(1).max(PLAN_SLOT_SIZE),
    name: z.string().min(1).max(140),
    /** "Done when …" — meaningful for year / quarter / month. */
    doneWhen: z.string().max(280).nullable(),
    status: z.enum(PlanItemStatus),
    reviewNote: z.string().max(280).nullable(),
    /** Set when carried forward from the previous period. */
    carriedFromId: Id.nullable(),
    /** How often this item has been pushed forward along its carry chain; 0 = fresh. */
    carryCount: z.int().min(0),
    /** Linked Money goal (year / quarter only). */
    goalId: Id.nullable(),
    /** Learn skill catalog key. */
    skill: z.string().max(64).nullable(),
    progress: PlanProgress,
    /** Children that exist but are hidden from the viewer ("+1 private"). */
    hiddenChildCount: z.int().min(0),
    ...PersonalFields.shape,
    canEdit: z.boolean(),
});

/** One period on screen: its items, their "why" chain and the layer below. */
export const PlanPeriodView = z.object({
    horizon: z.enum(PlanHorizon),
    period: PlanPeriodKey,
    items: z.array(PlanItem),
    /** Visible ancestors of `items`, any depth; walk `parentId` to build the chain. */
    ancestors: z.array(PlanItem),
    /** Visible items one layer down whose parent is in `items`. */
    children: z.array(PlanItem),
    /** Items in this period hidden from the viewer. */
    hiddenCount: z.int().min(0),
    /** Visibility choices the viewer may pick here (empty = cannot create). */
    visibilityOptions: z.array(z.enum(VisibilityChoice)),
    /** Preselected choice for a new item. */
    defaultVisibility: z.enum(VisibilityChoice),
    /** False for a single participant — the picker stays hidden. */
    isVisibilityPickerShown: z.boolean(),
});

const periodMatchesHorizon = (input: { horizon: PlanHorizon; period?: string | null }) =>
    input.period === undefined ||
    input.period === null ||
    isPlanPeriod(input.horizon, input.period);

const periodIssue = { message: 'Period does not match horizon', path: ['period'] };

export const PlanItemCreateInput = HouseholdScoped.extend({
    horizon: z.enum(PlanHorizon),
    period: PlanPeriodKey,
    parentId: Id.nullish(),
    name: z.string().trim().min(1).max(140),
    doneWhen: z.string().trim().max(280).nullish(),
    /** Omitted = the viewer's default choice. */
    visibility: z.enum(VisibilityChoice).nullish(),
    goalId: Id.nullish(),
    skill: z.string().max(64).nullish(),
}).refine(periodMatchesHorizon, periodIssue);

export const PlanPeriodInput = HouseholdScoped.extend({
    horizon: z.enum(PlanHorizon),
    /** Omitted = the period containing today. */
    period: PlanPeriodKey.nullish(),
    /** View filter "Ik · Iedereen · [naam]": only this maker's rows (never widens access). */
    accountId: Id.nullish(),
}).refine(periodMatchesHorizon, periodIssue);

export const PlanYearInput = HouseholdScoped.extend({
    year: z.string().regex(/^\d{4}$/),
});

export const PlanItemUpdateInput = HouseholdScoped.extend({
    id: Id,
    name: z.string().trim().min(1).max(140).optional(),
    doneWhen: z.string().trim().max(280).nullable().optional(),
    parentId: Id.nullable().optional(),
    position: z.int().min(1).max(PLAN_SLOT_SIZE).optional(),
    visibility: z.enum(VisibilityChoice).optional(),
    goalId: Id.nullable().optional(),
    skill: z.string().max(64).nullable().optional(),
});

export const PlanItemStatusInput = HouseholdScoped.extend({
    id: Id,
    status: z.enum(PlanItemStatus),
    reviewNote: z.string().trim().max(280).nullish(),
});

export const PlanItemRef = HouseholdScoped.extend({ id: Id });

// Inferred types (same-module merge for consumers)
export type PlanProgress = z.infer<typeof PlanProgress>;
export type PlanItem = z.infer<typeof PlanItem>;
export type PlanPeriodView = z.infer<typeof PlanPeriodView>;
export type PlanItemCreateInput = z.infer<typeof PlanItemCreateInput>;
export type PlanPeriodInput = z.infer<typeof PlanPeriodInput>;
export type PlanYearInput = z.infer<typeof PlanYearInput>;
export type PlanItemUpdateInput = z.infer<typeof PlanItemUpdateInput>;
export type PlanItemStatusInput = z.infer<typeof PlanItemStatusInput>;
export type PlanItemRef = z.infer<typeof PlanItemRef>;
