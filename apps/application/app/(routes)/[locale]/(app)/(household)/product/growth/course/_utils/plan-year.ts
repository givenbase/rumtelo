import {
    CourseArea,
    CourseRhythmCadence,
    CourseRhythmKind,
    CourseScope,
    GoalKind,
    GoalStatus,
    monthlyAmountFor,
    presetsFor,
    rhythmShapeFor,
    type CoursePreset,
    type JarKey,
    type WorkSituation,
} from '@rumtelo/contracts';

import type { PlanGoalDraft } from './plan-form';

// ====================================================================
// Steps
// ====================================================================

/** The screens of "Plan your year", in order. */
export const PLAN_STEPS = ['now', 'areas', 'goals', 'break', 'save'] as const;
export type PlanStep = (typeof PLAN_STEPS)[number];

/** Steps the person may leave empty and move on. */
export const PLAN_SKIPPABLE_STEPS: readonly PlanStep[] = ['now', 'break'];

// ====================================================================
// Areas: chips that only filter the presets of step 3
// ====================================================================

export const PLAN_AREA_KEYS = [
    'health',
    'relationships',
    'learning',
    'freedom',
    'meaning',
    'income',
    'clients',
    'career',
    'skills',
    'balance',
] as const;
export type PlanAreaKey = (typeof PLAN_AREA_KEYS)[number];

export interface PlanArea {
    key: PlanAreaKey;
    scope: CourseScope;
    area: CourseArea;
    /**
     * Narrows a (scope, area) pair when several chips share it: relationships and
     * meaning are both personal Soul, clients, career and skills are all business Growth.
     * Omitted = every preset of the pair.
     */
    presetKeys?: readonly string[];
}

const { PERSONAL, BUSINESS } = CourseScope;
const { MONEY, GROWTH, ENERGY, SOUL } = CourseArea;

export const PLAN_AREAS: readonly PlanArea[] = [
    { key: 'health', scope: PERSONAL, area: ENERGY },
    {
        key: 'relationships',
        scope: PERSONAL,
        area: SOUL,
        presetKeys: ['weekly_date', 'family_time'],
    },
    { key: 'learning', scope: PERSONAL, area: GROWTH },
    { key: 'freedom', scope: PERSONAL, area: MONEY },
    { key: 'meaning', scope: PERSONAL, area: SOUL, presetKeys: ['gratitude_routine'] },
    { key: 'income', scope: BUSINESS, area: MONEY },
    { key: 'clients', scope: BUSINESS, area: GROWTH, presetKeys: ['new_clients'] },
    {
        key: 'career',
        scope: BUSINESS,
        area: GROWTH,
        presetKeys: ['promotion_raise', 'find_work'],
    },
    { key: 'skills', scope: BUSINESS, area: GROWTH, presetKeys: ['learn_work_skill'] },
    { key: 'balance', scope: BUSINESS, area: ENERGY },
];

export function planAreaByKey(key: PlanAreaKey): PlanArea {
    return PLAN_AREAS.find(area => area.key === key)!;
}

/** The chips of one group (Personal or Business), in display order. */
export function planAreasOfScope(scope: CourseScope): PlanArea[] {
    return PLAN_AREAS.filter(area => area.scope === scope);
}

/** Presets that fit the chip and the person's work situation, best fit first. */
export function presetsForArea(area: PlanArea, situation: WorkSituation | null): CoursePreset[] {
    return presetsFor(situation, area.scope).filter(
        preset =>
            preset.area === area.area && (!area.presetKeys || area.presetKeys.includes(preset.key))
    );
}

// ====================================================================
// Amounts (integer minor units only)
// ====================================================================

/** Largest amount "Plan your year" accepts, in minor units (10 million in major). */
export const PLAN_AMOUNT_MAX_MINOR = 1_000_000_000;

/**
 * "12,50", "12.50", "1.250" or "1 250,5" → minor units with integer maths; null when it is
 * not an amount. The last separator is the decimal one when one or two digits follow it,
 * otherwise it is a thousands separator.
 */
export function parseMinorUnits(raw: string): number | null {
    const text = raw.replace(/[\s ']/g, '');
    if (!/^\d[\d.,]*$/.test(text)) return null;
    const decimal = /^(.*?)[.,](\d{1,2})$/.exec(text);
    const whole = (decimal ? decimal[1]! : text).replace(/[.,]/g, '');
    if (!/^\d+$/.test(whole)) return null;
    const fraction = decimal ? decimal[2]!.padEnd(2, '0') : '00';
    const minor = Number(whole) * 100 + Number(fraction);
    return Number.isSafeInteger(minor) ? minor : null;
}

/** Minor units as text for an input field ("1250.5" → "1250,50"; whole amounts have no decimals). */
export function minorUnitsToInput(minor: number): string {
    const whole = Math.floor(minor / 100);
    const cents = minor % 100;
    return cents === 0 ? String(whole) : `${whole},${String(cents).padStart(2, '0')}`;
}

/** Month number (1–12) of a `YYYY-MM` key. */
function monthNumberOf(month: string): number {
    return Number(month.slice(5, 7));
}

/**
 * What to put aside each month for a total reached by December: an even share from
 * `month` (`YYYY-MM`, the month of saving) through December, rounded up to the cent.
 */
export function monthlyShareFor(totalMinor: number, month: string): number {
    return monthlyAmountFor(totalMinor, monthNumberOf(month), 12);
}

/**
 * The month the first step lands in: this month when the plan is for the current year,
 * otherwise January of the plan year.
 */
export function planMonthOf(year: string, now = new Date()): string {
    const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return current.startsWith(year) ? current : `${year}-01`;
}

// ====================================================================
// Drafts
// ====================================================================

/** Select value for "no jar" — Radix Select has no empty value. */
export const PLAN_NO_JAR = 'none';

/** Resolved copy of a preset (the UI translates the keys; this stays free of i18n). */
export interface PlanPresetCopy {
    name: string;
    doneWhen: string;
    firstStep: string;
    rhythmName: string;
}

/** A draft without a preset: the person writes every word. */
export function blankDraft(input: { id: string; area: PlanArea }): PlanGoalDraft {
    return {
        uid: input.id,
        areaKey: input.area.key,
        presetKey: '',
        name: '',
        doneWhen: '',
        scope: input.area.scope,
        hasAmount: false,
        amountKind: GoalKind.SAVE,
        amount: '',
        jarId: PLAN_NO_JAR,
        step: '',
        routineOn: false,
        routineName: '',
        routineKind: CourseRhythmKind.DISCIPLINE,
        routineCadence: CourseRhythmCadence.WEEKLY,
        routineTarget: '1',
        routineArea: input.area.area,
    };
}

/**
 * A draft from a preset: its copy, scope, amount default, jar and routine, all editable.
 * `jarIdOf` resolves the preset's suggested jar key to this household's jar id (the caller
 * falls back to the main pot of the key's group when that pot is off, `jarForKey`); a key
 * that resolves to nothing (or is not allowed) leaves the choice open (`'none'`).
 */
export function draftFromPreset(input: {
    id: string;
    area: PlanArea;
    preset: CoursePreset;
    copy: PlanPresetCopy;
    jarIdOf: (key: JarKey) => string | null;
    /** False when the plan has no Money goals: the amount switch starts off. */
    canHaveAmount: boolean;
}): PlanGoalDraft {
    const { preset, copy } = input;
    const rhythm = preset.rhythm;
    const jarId =
        preset.suggestedJarKey !== undefined ? input.jarIdOf(preset.suggestedJarKey) : null;
    return {
        ...blankDraft({ id: input.id, area: input.area }),
        presetKey: preset.key,
        name: copy.name,
        doneWhen: copy.doneWhen,
        scope: preset.scope,
        hasAmount: preset.hasAmount && input.canHaveAmount,
        amountKind: preset.goalKind === GoalKind.EARN ? GoalKind.EARN : GoalKind.SAVE,
        jarId: jarId ?? PLAN_NO_JAR,
        step: copy.firstStep,
        routineOn: rhythm !== undefined,
        routineName: rhythm ? copy.rhythmName : '',
        routineKind: rhythm?.kind ?? CourseRhythmKind.DISCIPLINE,
        routineCadence: rhythm?.cadence ?? CourseRhythmCadence.WEEKLY,
        routineTarget: String(rhythm?.target ?? 1),
        routineArea: preset.area,
    };
}

// ====================================================================
// The save chain
// ====================================================================

export interface PlanMoneyGoal {
    kind: GoalKind;
    jarId: string | null;
    name: string;
    icon: null;
    target: number;
    monthlyContribution: number;
    targetOn: string;
    status: GoalStatus;
    why: null;
}

export interface PlanChain {
    /** The draft this chain saves. */
    draftId: string;
    /** Step 1 of the chain; null without an amount. */
    money: PlanMoneyGoal | null;
    /** Step 2: the YEAR goal of the Course. */
    year: { name: string; doneWhen: string | null; scope: CourseScope };
    /** Step 3: the first step, in `month`; null without one. */
    step: { name: string; month: string } | null;
    /** Step 4: the routine under the year goal; null without one. */
    routine: {
        name: string;
        kind: CourseRhythmKind;
        cadence: CourseRhythmCadence;
        target: number;
        area: CourseArea;
    } | null;
}

/**
 * What saving one draft does, in order: Money goal (with an amount), YEAR goal, first
 * step in `month`, routine under the year goal. Pure: no ids, no API.
 */
export function buildChain(draft: PlanGoalDraft, ctx: { year: string; month: string }): PlanChain {
    const amount = draft.hasAmount ? parseMinorUnits(draft.amount) : null;
    const isEarn = draft.amountKind === GoalKind.EARN;
    const jarId = draft.jarId === PLAN_NO_JAR ? null : draft.jarId;

    const money: PlanMoneyGoal | null =
        amount !== null && amount > 0 && (isEarn || jarId !== null)
            ? {
                  kind: isEarn ? GoalKind.EARN : GoalKind.SAVE,
                  jarId: isEarn ? null : jarId,
                  name: draft.name.trim(),
                  icon: null,
                  target: amount,
                  monthlyContribution: isEarn ? 0 : monthlyShareFor(amount, ctx.month),
                  targetOn: `${ctx.year}-12-31`,
                  status: GoalStatus.ACTIVE,
                  why: null,
              }
            : null;

    const step = draft.step.trim();
    const routineName = draft.routineName.trim();
    const shape = rhythmShapeFor(
        draft.routineKind,
        draft.routineCadence,
        Number(draft.routineTarget)
    );

    return {
        draftId: draft.uid,
        money,
        year: {
            name: draft.name.trim(),
            doneWhen: draft.doneWhen.trim() || null,
            scope: draft.scope,
        },
        step: step ? { name: step, month: ctx.month } : null,
        routine:
            draft.routineOn && routineName
                ? {
                      name: routineName,
                      kind: draft.routineKind,
                      cadence: shape.cadence,
                      target: shape.target,
                      area: draft.routineArea,
                  }
                : null,
    };
}

export type PlanStage = 'money' | 'year' | 'step' | 'routine';
export const PLAN_STAGES: readonly PlanStage[] = ['money', 'year', 'step', 'routine'];
export type PlanStageState = 'pending' | 'done' | 'failed' | 'skipped';

/** Where one goal stands while saving. */
export interface PlanGoalProgress {
    stages: Record<PlanStage, PlanStageState>;
    moneyGoalId: string | null;
    yearItemId: string | null;
    /** Why the amount was not saved (the goal itself is still kept). */
    moneyError: string | null;
    /** Why the last hard stage failed. */
    error: string | null;
}

/** Stages a chain does not have start as `skipped`, the rest as `pending`. */
export function initialProgress(chain: PlanChain): PlanGoalProgress {
    return {
        stages: {
            money: chain.money ? 'pending' : 'skipped',
            year: 'pending',
            step: chain.step ? 'pending' : 'skipped',
            routine: chain.routine ? 'pending' : 'skipped',
        },
        moneyGoalId: null,
        yearItemId: null,
        moneyError: null,
        error: null,
    };
}

/**
 * The next stage to run, or null when the goal is finished (or can go no further).
 * A failed amount is final — the goal is kept without it and the amount is added later —
 * so it is never retried; any other failed stage is retried. Steps and routines wait for
 * the year goal they hang under.
 */
export function nextStage(progress: PlanGoalProgress): PlanStage | null {
    for (const stage of PLAN_STAGES) {
        const state = progress.stages[stage];
        if (state === 'done' || state === 'skipped') continue;
        if (stage === 'money' && state === 'failed') continue;
        if ((stage === 'step' || stage === 'routine') && progress.yearItemId === null) return null;
        return stage;
    }
    return null;
}

/** True while at least one stage of one goal can still run. */
export function hasRemainingWork(progresses: readonly PlanGoalProgress[]): boolean {
    return progresses.some(progress => nextStage(progress) !== null);
}

/** Counts for the result screen. */
export function summarizeProgress(progresses: readonly PlanGoalProgress[]): {
    goalsSaved: number;
    goalsOpen: number;
    amountsMissed: number;
} {
    let goalsSaved = 0;
    let amountsMissed = 0;
    for (const progress of progresses) {
        if (progress.stages.year === 'done') goalsSaved += 1;
        if (progress.stages.money === 'failed') amountsMissed += 1;
    }
    return { goalsSaved, goalsOpen: progresses.length - goalsSaved, amountsMissed };
}

// ====================================================================
// Balance
// ====================================================================

export interface PlanBalance {
    personal: number;
    business: number;
    /** The scope with no goal while the other has some; null when both are present or none is. */
    missing: CourseScope | null;
}

/** How the goals divide over Personal and Business — information, never a rule. */
export function balanceOf(goals: readonly { scope: CourseScope }[]): PlanBalance {
    const personal = goals.filter(goal => goal.scope === PERSONAL).length;
    const business = goals.filter(goal => goal.scope === BUSINESS).length;
    const missing =
        personal > 0 && business === 0
            ? BUSINESS
            : business > 0 && personal === 0
              ? PERSONAL
              : null;
    return { personal, business, missing };
}
