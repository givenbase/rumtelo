/**
 * Rhythm Schemas (Growth · Koers)
 * Routines you keep — "training 3× a week" — next to the three Focus choices.
 * A rhythm never fills a Focus slot; its ticks fill a milestone counter above it.
 * Zod only — no `export type` beyond the inferred block.
 */

import { z } from 'zod';

import { HouseholdScoped, Id, IsoDate, WeekKey } from '../../../../common/common.schema';
import { VisibilityChoice } from '../../../platform/enums';
import { PersonalFields } from '../../../platform/household/visibility';
import { CourseArea, CourseHorizon, CourseRhythmCadence, CourseRhythmKind } from '../enums';
import { isRhythmTargetValid, rhythmShapeFor } from './course-rules';

const Weekdays = z
    .array(z.int().min(1).max(7))
    .max(7)
    .refine(days => new Set(days).size === days.length, 'Weekdays must be unique');

const RhythmName = z.string().trim().min(1).max(140);

export const CourseRhythm = z.object({
    id: Id,
    householdId: z.string(),
    name: z.string().min(1).max(140),
    kind: z.enum(CourseRhythmKind),
    cadence: z.enum(CourseRhythmCadence),
    /** Times per cadence; DAILY = 1. */
    target: z.int().min(1).max(31),
    /** ISO weekdays of the pattern (1 = Monday); null = any day. */
    weekdays: z.array(z.int().min(1).max(7)).nullable(),
    /** Year, quarter or month item it feeds; null = loose. */
    parentId: Id.nullable(),
    /** Parent name for the "why" line; null when loose or hidden. */
    parentName: z.string().nullable(),
    /** Parent exists but the viewer may not see it ("Private goal"). */
    isParentHidden: z.boolean(),
    /** Horizon and period of the parent — a past month asks to be renewed. */
    parentHorizon: z.enum(CourseHorizon).nullable(),
    parentPeriod: z.string().nullable(),
    area: z.enum(CourseArea).nullable(),
    isPaused: z.boolean(),
    /** Ticks inside the requested week. */
    ticks: z.array(IsoDate),
    /** Period the count runs in (the week, or the month for MONTHLY). */
    periodHorizon: z.enum(CourseHorizon),
    period: z.string(),
    periodCount: z.int().min(0),
    periodTarget: z.int().min(1),
    /** Most recent tick, any time; null = never. */
    lastTickOn: IsoDate.nullable(),
    ...PersonalFields.shape,
    canEdit: z.boolean(),
});

/** Course › Rhythm for one week. */
export const CourseRhythmWeekView = z.object({
    week: WeekKey,
    /** Monday … Sunday of `week`. */
    days: z.array(IsoDate).length(7),
    rhythms: z.array(CourseRhythm),
    hiddenCount: z.int().min(0),
    visibilityOptions: z.array(z.enum(VisibilityChoice)),
    defaultVisibility: z.enum(VisibilityChoice),
    isVisibilityPickerShown: z.boolean(),
});

/** One proposal at the start of a week: keep going, smaller, pause, stop — or renew. */
export const CourseRhythmSuggestion = z.object({
    rhythm: CourseRhythm,
    /** Score of the period before this one. */
    previousPeriod: z.string(),
    previousCount: z.int().min(0),
    previousTarget: z.int().min(1),
    /** Set when the parent milestone belongs to a month that has ended. */
    renewal: z
        .object({
            parentId: Id,
            name: z.string(),
            targetCount: z.int().nullable(),
            fromPeriod: z.string(),
            toPeriod: z.string(),
        })
        .nullable(),
});

const rhythmTargetFits = (input: {
    kind?: CourseRhythmKind;
    cadence?: CourseRhythmCadence;
    target?: number;
}) => {
    const { kind, cadence, target } = input;
    if (cadence === undefined || target === undefined) return true;
    const shape = kind ? rhythmShapeFor(kind, cadence, target) : { cadence, target };
    return isRhythmTargetValid(shape.cadence, shape.target);
};

const targetIssue = { message: 'Target does not fit the cadence', path: ['target'] };

export const CourseRhythmCreateInput = HouseholdScoped.extend({
    name: RhythmName,
    kind: z.enum(CourseRhythmKind),
    cadence: z.enum(CourseRhythmCadence),
    target: z.int().min(1).max(31),
    weekdays: Weekdays.nullish(),
    parentId: Id.nullish(),
    area: z.enum(CourseArea).nullish(),
    /** Omitted = the viewer's default choice. */
    visibility: z.enum(VisibilityChoice).nullish(),
}).refine(rhythmTargetFits, targetIssue);

export const CourseRhythmListInput = HouseholdScoped.extend({
    /** Omitted = this week. */
    week: WeekKey.nullish(),
    /** View filter (never widens access). */
    accountId: Id.nullish(),
});

export const CourseRhythmSuggestionsInput = HouseholdScoped.extend({
    /** The week being planned; omitted = this week. */
    week: WeekKey.nullish(),
});

export const CourseRhythmUpdateInput = HouseholdScoped.extend({
    id: Id,
    name: RhythmName.optional(),
    kind: z.enum(CourseRhythmKind).optional(),
    cadence: z.enum(CourseRhythmCadence).optional(),
    target: z.int().min(1).max(31).optional(),
    weekdays: Weekdays.nullable().optional(),
    parentId: Id.nullable().optional(),
    area: z.enum(CourseArea).nullable().optional(),
    visibility: z.enum(VisibilityChoice).optional(),
});

export const CourseRhythmRef = HouseholdScoped.extend({ id: Id });

export const CourseRhythmTickInput = HouseholdScoped.extend({
    id: Id,
    date: IsoDate,
});

export const CourseRhythmConfirmInput = HouseholdScoped.extend({
    id: Id,
    week: WeekKey,
});

// Inferred types (same-module merge for consumers)
export type CourseRhythm = z.infer<typeof CourseRhythm>;
export type CourseRhythmWeekView = z.infer<typeof CourseRhythmWeekView>;
export type CourseRhythmSuggestion = z.infer<typeof CourseRhythmSuggestion>;
export type CourseRhythmCreateInput = z.infer<typeof CourseRhythmCreateInput>;
export type CourseRhythmListInput = z.infer<typeof CourseRhythmListInput>;
export type CourseRhythmSuggestionsInput = z.infer<typeof CourseRhythmSuggestionsInput>;
export type CourseRhythmUpdateInput = z.infer<typeof CourseRhythmUpdateInput>;
export type CourseRhythmRef = z.infer<typeof CourseRhythmRef>;
export type CourseRhythmTickInput = z.infer<typeof CourseRhythmTickInput>;
export type CourseRhythmConfirmInput = z.infer<typeof CourseRhythmConfirmInput>;
