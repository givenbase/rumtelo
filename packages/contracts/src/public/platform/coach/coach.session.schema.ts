/**
 * Coach Session Schemas
 * Smart fill queue — one question at a time, writes go through product APIs.
 */

import { z } from 'zod';

import { HouseholdId, Id, Money, PeriodKey, WeekKey } from '../../../common/common.schema';
import { Locale } from '../../../common/common.enums';
import { CoachKind } from '../enums';
import { EnergyMetric } from '../../product/energy/enums';
import { WeekCheckStage } from '../../product/money/enums';

/** Which portal the step belongs to (for styling / filtering). */
export const CoachPortal = z.enum(['money', 'energy', 'soul', 'growth', 'home']);
export type CoachPortal = z.infer<typeof CoachPortal>;

/** How the UI should collect the answer. */
export const CoachStepInput = z.enum([
    'jar_pick',
    'paid_skip',
    'yes_typical',
    'gratitude_text',
    'score_chips',
    'week_check_look',
    'week_check_redirect',
    'week_check_intend',
    'link_only',
]);
export type CoachStepInput = z.infer<typeof CoachStepInput>;

/**
 * Voice modality for a step — declared by the session contract, not by browser sniffing.
 * `speak`: TTS may read `prompt`. `listen`: STT may draft an answer for on-screen confirm.
 */
export const CoachStepVoice = z.object({
    speak: z.boolean(),
    listen: z.boolean(),
});
export type CoachStepVoice = z.infer<typeof CoachStepVoice>;

/** Derive voice flags from the step’s input kind (single source for producers + UI). */
export function coachStepVoice(input: CoachStepInput): CoachStepVoice {
    if (input === 'link_only') {
        return { speak: true, listen: false };
    }
    return { speak: true, listen: true };
}

/**
 * BCP-47 language tags for coach TTS/STT — keyed by contracts {@link Locale}.
 * UI must not invent locale→lang maps; extend this when adding a Locale.
 */
export const COACH_SPEECH_BCP47 = {
    [Locale.EN]: 'en-GB',
    [Locale.NL]: 'nl-NL',
    [Locale.ES]: 'es-ES',
    [Locale.FR]: 'fr-FR',
} as const satisfies Record<Locale, string>;

/** Cap actionable steps per visit (insights sit beside the queue). */
export const COACH_SESSION_STEP_CAP = 3;

const JarOption = z.object({
    id: Id,
    name: z.string(),
    key: z.string(),
});

const InboxPayload = z.object({
    type: z.literal('inbox_sort'),
    transactionId: Id,
    amount: Money,
    description: z.string(),
    counterparty: z.string().nullable(),
    bookedOn: z.string(),
    jars: z.array(JarOption),
});

const DueBillPayload = z.object({
    type: z.literal('due_bill'),
    fixedCostId: Id,
    name: z.string(),
    amount: Money,
    period: PeriodKey,
});

const TimeDayPayload = z.object({
    type: z.literal('time_day'),
    on: z.string(),
    /** ISO weekday name hint, e.g. "Monday". */
    dayLabel: z.string(),
    kindLabel: z.string(),
});

const CatchUpPayload = z.object({
    type: z.literal('time_catch_up'),
    days: z.array(z.object({ on: z.string(), dayLabel: z.string() })),
    count: z.int().min(1),
});

const GratitudePayload = z.object({
    type: z.literal('gratitude'),
    week: WeekKey,
});

const ScorePayload = z.object({
    type: z.literal('energy_score'),
    metric: z.enum(EnergyMetric),
    on: z.string(),
});

const WeekCheckLookPayload = z.object({
    type: z.literal('week_check_look'),
    week: WeekKey,
    stage: z.enum(WeekCheckStage),
});

const WeekCheckRedirectPayload = z.object({
    type: z.literal('week_check_redirect'),
    week: WeekKey,
    surplus: Money,
    jars: z.array(JarOption),
});

const WeekCheckIntendPayload = z.object({
    type: z.literal('week_check_intend'),
    week: WeekKey,
});

const LinkPayload = z.object({
    type: z.literal('link'),
    href: z.string(),
});

export const CoachStepPayload = z.discriminatedUnion('type', [
    InboxPayload,
    DueBillPayload,
    TimeDayPayload,
    CatchUpPayload,
    GratitudePayload,
    ScorePayload,
    WeekCheckLookPayload,
    WeekCheckRedirectPayload,
    WeekCheckIntendPayload,
    LinkPayload,
]);
export type CoachStepPayload = z.infer<typeof CoachStepPayload>;

/**
 * One fillable question in the Coach session.
 * The client writes via the product API named in `writeProcedure` (documentation only).
 */
export const CoachStep = z.object({
    /** Stable id for deep links / ⌘K, e.g. `money.inbox:uuid`. */
    id: z.string().max(120),
    portal: CoachPortal,
    kind: z.enum(CoachKind),
    prompt: z.string().max(500),
    input: CoachStepInput,
    payload: CoachStepPayload,
    /** Voice I/O allowed for this step — from {@link coachStepVoice}, not from the browser. */
    voice: CoachStepVoice,
    /** Optional escape hatch when the step is heavy. */
    href: z.string().max(200).nullable(),
    hrefLabel: z.string().max(60).nullable(),
});
export type CoachStep = z.infer<typeof CoachStep>;

export const CoachSession = z.object({
    householdId: HouseholdId,
    period: PeriodKey,
    week: WeekKey,
    /** Actionable fill steps, already capped and ordered. */
    steps: z.array(CoachStep),
    /** How many fillable items exist before the visit cap (for progress whisper). */
    totalAvailable: z.int().min(0),
    quiet: z.boolean(),
});
export type CoachSession = z.infer<typeof CoachSession>;
