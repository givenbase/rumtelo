import type { Goal, JarBalance } from '@rumtelo/contracts';

/**
 * Goal pace for the income simulator (Growth → Income) — "and what it buys you".
 *
 * Model (kept deliberately simple and consistent with the Goals page and
 * `GoalService.projections()` on the backend):
 *
 * - A goal moves at the monthly amount the user set on it (`monthlyContribution`),
 *   not at the whole jar. Same straight-line date as the Goals page.
 * - The simulated income changes what the jar *receives*. From that we derive
 *   headroom: flow − fixed costs in the jar − every open goal's plan in the jar.
 *   Headroom is the honest answer to "is there room to speed this up?".
 * - "I want it in N months" converts to a needed monthly amount; we then say
 *   whether the jar has room for it at this income, or what income would.
 *
 * All money in minor units (the `Cents` suffix follows the app convention; currency-agnostic).
 */

export type GoalPaceJar = Pick<JarBalance, 'name' | 'percentage' | 'committedOut'>;

export type GoalPaceGoal = Pick<Goal, 'saved' | 'target' | 'monthlyContribution' | 'targetOn'>;

export type GoalPaceInput = {
    /** Simulated net monthly income. */
    simIncomeCents: number;
    goal: GoalPaceGoal;
    /** Jar the goal is funded from; null when the goal has no jar. */
    jar: GoalPaceJar | null;
    /** Sum of `monthlyContribution` of the other open SAVE goals in the same jar. */
    siblingPlannedCents: number;
    /** Horizon the user is asking about (months, ≥ 1). */
    wantMonths: number;
    today?: Date;
};

export type GoalPaceVerdict =
    | 'reached'
    | 'no-plan'
    | 'on-target'
    | 'ahead'
    | 'behind-room'
    | 'behind-income';

export type GoalPace = {
    remainingCents: number;
    plannedCents: number;
    /** Months to finish at the planned amount; null when nothing is planned. */
    monthsAtPlan: number | null;
    doneOn: Date | null;
    /** Months until the goal's own target date; null when none is set. */
    planMonths: number | null;
    /** What the jar receives at the simulated income; null without a jar. */
    jarFlowCents: number | null;
    jarFixedCents: number;
    /** Every open goal's plan in this jar (this goal included). */
    jarGoalsCents: number;
    /** flow − fixed − goals. Negative means the plan does not fit at this income. */
    jarHeadroomCents: number | null;
    /** Monthly amount that finishes the goal within `wantMonths`. */
    needCents: number;
    /** need − planned (positive = must add). */
    deltaCents: number;
    /** Income at which the jar covers fixed + other goals + `needCents`; null without a jar. */
    incomeForNeedCents: number | null;
    verdict: GoalPaceVerdict;
};

/** Same rule as the backend: calendar-month difference, never below 1. */
export function monthsUntil(isoDate: string, today = new Date()): number {
    const target = new Date(isoDate);
    return Math.max(
        1,
        (target.getUTCFullYear() - today.getUTCFullYear()) * 12 +
            (target.getUTCMonth() - today.getUTCMonth())
    );
}

function ceilTo(cents: number, stepCents: number): number {
    return Math.ceil(cents / stepCents) * stepCents;
}

export function addMonths(date: Date, months: number): Date {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
}

export function evaluateGoalPace(input: GoalPaceInput): GoalPace {
    const today = input.today ?? new Date();
    const sim = Math.max(0, input.simIncomeCents);
    const wantMonths = Math.max(1, Math.round(input.wantMonths));

    const remainingCents = Math.max(0, input.goal.target - input.goal.saved);
    const plannedCents = Math.max(0, input.goal.monthlyContribution);
    const siblings = Math.max(0, input.siblingPlannedCents);

    const monthsAtPlan =
        remainingCents > 0 && plannedCents > 0 ? Math.ceil(remainingCents / plannedCents) : null;
    const doneOn = monthsAtPlan === null ? null : addMonths(today, monthsAtPlan);
    const planMonths = input.goal.targetOn ? monthsUntil(input.goal.targetOn, today) : null;

    const jar = input.jar;
    const jarFlowCents = jar ? Math.round((sim * jar.percentage) / 100) : null;
    const jarFixedCents = jar ? Math.max(0, jar.committedOut) : 0;
    const jarGoalsCents = plannedCents + siblings;
    const jarHeadroomCents =
        jarFlowCents === null ? null : jarFlowCents - jarFixedCents - jarGoalsCents;

    // Whole major units: the coach tells the user an amount to type into the goal form.
    const needCents = remainingCents > 0 ? ceilTo(remainingCents / wantMonths, 100) : 0;
    const deltaCents = needCents - plannedCents;
    // "Roughly" figure — round up to 10 major units so it reads as a target, not a decimal.
    const incomeForNeedCents =
        jar && jar.percentage > 0
            ? ceilTo(((jarFixedCents + siblings + needCents) * 100) / jar.percentage, 1_000)
            : null;

    let verdict: GoalPaceVerdict;
    if (remainingCents <= 0) {
        verdict = 'reached';
    } else if (monthsAtPlan === null) {
        verdict = 'no-plan';
    } else if (Math.abs(monthsAtPlan - wantMonths) <= 1) {
        verdict = 'on-target';
    } else if (monthsAtPlan < wantMonths) {
        verdict = 'ahead';
    } else if (jarHeadroomCents !== null && jarHeadroomCents >= deltaCents) {
        verdict = 'behind-room';
    } else {
        verdict = 'behind-income';
    }

    return {
        remainingCents,
        plannedCents,
        monthsAtPlan,
        doneOn,
        planMonths,
        jarFlowCents,
        jarFixedCents,
        jarGoalsCents,
        jarHeadroomCents,
        needCents,
        deltaCents,
        incomeForNeedCents,
        verdict,
    };
}
