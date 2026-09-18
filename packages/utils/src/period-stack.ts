/**
 * Period-travel stacking + smart projections.
 *
 * Plug this in anywhere the UI needs “where would I be by that month?” —
 * overview jars, Coach copy, goals pace, debt remaining.
 *
 * Horizon rule (jars): H = |monthsDelta| + 1 (current month alone → 1).
 * Goal deposits looking ahead: only *future* months beyond today → × monthsDelta
 * on top of live `saved` (do not double-count the current month’s saved).
 */

import { GoalKind, GoalStatus, PayoffStrategy } from '@rumtelo/contracts';

import { allocateByPercentage } from './money-plan';
import {
    projectBalancesAfterMonths,
    type DebtPayoffInput,
    simulatePayoff,
} from './debt-payoff-math';
import {
    currentYearMonth,
    describePeriodTravel,
    monthsBetween,
    type PeriodTravel,
    type YearMonth,
} from './period-offset';
import { toPeriodKey } from './period-key';

/** H = |Δ| + 1 — one month when viewing now. */
export function horizonMonths(travel: Pick<PeriodTravel, 'monthsDelta'>): number {
    return Math.abs(travel.monthsDelta) + 1;
}

export function parsePeriodKey(period: string): YearMonth {
    const [year, month] = period.split('-').map(Number);
    return { year: year ?? 1970, month: month ?? 1 };
}

/** Inclusive YYYY-MM keys from `from` through `to` (order-independent). */
export function periodKeysInclusive(from: YearMonth, to: YearMonth): string[] {
    const start = monthsBetween(from, to) >= 0 ? from : to;
    const end = monthsBetween(from, to) >= 0 ? to : from;
    const keys: string[] = [];
    let cursor = { ...start };
    while (monthsBetween(cursor, end) >= 0) {
        keys.push(toPeriodKey(cursor.year, cursor.month));
        if (cursor.month === 12) {
            cursor = { year: cursor.year + 1, month: 1 };
        } else {
            cursor = { year: cursor.year, month: cursor.month + 1 };
        }
        if (keys.length > 200) break;
    }
    return keys;
}

export type StackShare = { id: string; percentage: number };

export type StackedAllocations = {
    monthlyTotal: number;
    stackedTotal: number;
    monthly: { id: string; amount: number }[];
    stacked: { id: string; amount: number }[];
};

/** Plan deposits × horizon (Looking Ahead / past envelope proxy). */
export function stackPlannedAllocations(input: {
    monthlyNet: number;
    shares: readonly StackShare[];
    horizon: number;
}): StackedAllocations {
    const horizon = Math.max(1, Math.round(input.horizon));
    const monthly = allocateByPercentage(input.monthlyNet, input.shares);
    const stacked = monthly.map(row => ({ id: row.id, amount: row.amount * horizon }));
    return {
        monthlyTotal: input.monthlyNet,
        stackedTotal: input.monthlyNet * horizon,
        monthly,
        stacked,
    };
}

/** Sum ledger maps across periods (Looking Back). */
export function stackActualsByJar(input: {
    spentByJarByPeriod: ReadonlyMap<string, ReadonlyMap<string, number>>;
    creditedByJarByPeriod?: ReadonlyMap<string, ReadonlyMap<string, number>>;
}): { spent: Map<string, number>; credited: Map<string, number> } {
    const spent = new Map<string, number>();
    const credited = new Map<string, number>();

    for (const byJar of input.spentByJarByPeriod.values()) {
        for (const [jarId, amount] of byJar) {
            spent.set(jarId, (spent.get(jarId) ?? 0) + amount);
        }
    }
    for (const byJar of (input.creditedByJarByPeriod ?? new Map()).values()) {
        for (const [jarId, amount] of byJar) {
            credited.set(jarId, (credited.get(jarId) ?? 0) + amount);
        }
    }
    return { spent, credited };
}

export type MoneyDelta = {
    from: number;
    to: number;
    delta: number;
};

export function moneyDelta(from: number, to: number): MoneyDelta {
    return { from, to, delta: to - from };
}

export type IncomeNeededInput = {
    remainingCents: number;
    months: number;
    jarPercentage: number;
    jarFixedCents?: number;
    siblingPlannedCents?: number;
};

export type IncomeNeededResult = {
    needCents: number;
    incomeForNeedCents: number | null;
};

function ceilTo(cents: number, stepCents: number): number {
    return Math.ceil(cents / stepCents) * stepCents;
}

/**
 * Monthly contribution + income needed to finish a target in `months`.
 * Same rounding as the Growth income simulator / goal-pace.
 */
export function incomeNeededForTarget(input: IncomeNeededInput): IncomeNeededResult {
    const months = Math.max(1, Math.round(input.months));
    const remainingCents = Math.max(0, input.remainingCents);
    const needCents = remainingCents > 0 ? ceilTo(remainingCents / months, 100) : 0;
    const jarFixedCents = Math.max(0, input.jarFixedCents ?? 0);
    const siblings = Math.max(0, input.siblingPlannedCents ?? 0);
    const incomeForNeedCents =
        input.jarPercentage > 0
            ? ceilTo(((jarFixedCents + siblings + needCents) * 100) / input.jarPercentage, 1_000)
            : null;
    return { needCents, incomeForNeedCents };
}

export type GoalAtHorizonInput = {
    id: string;
    name: string;
    jarKey?: string | null;
    jarId?: string | null;
    kind: string;
    status: string;
    saved: number;
    target: number;
    monthlyContribution: number;
    targetOn: string | null;
    fulfilledOn: string | null;
    /** Jar % when income-needed should be computed. */
    jarPercentage?: number | null;
    jarFixedCents?: number;
    siblingPlannedCents?: number;
};

export type GoalAtPeriod = {
    goalId: string;
    name: string;
    jarKey: string | null;
    saved: number;
    target: number;
    projectedSaved: number;
    fulfilledByPeriod: boolean;
    monthsToFulfill: number | null;
    /** YYYY-MM-DD when this goal first hits target inside the horizon; null if not yet. */
    reachedOn: string | null;
    incomeNeededCents: number | null;
};

function isoMonthStart(from: Date, monthsAhead: number): string {
    const date = new Date(from.getFullYear(), from.getMonth(), 1);
    date.setMonth(date.getMonth() + monthsAhead);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
}

export function projectGoalsAtHorizon(input: {
    goals: readonly GoalAtHorizonInput[];
    monthsDelta: number;
    direction: PeriodTravel['direction'];
    /** End of selected month as YYYY-MM-DD for Looking Back fulfilledOn checks. */
    selectedPeriodEndIso?: string | null;
}): GoalAtPeriod[] {
    const { goals, monthsDelta, direction } = input;

    return goals.map(goal => {
        const open =
            goal.status === GoalStatus.ACTIVE ||
            goal.status === GoalStatus.REACHED ||
            goal.status === 'ACTIVE' ||
            goal.status === 'REACHED';

        if (direction === 'past') {
            const fulfilledAlready =
                Boolean(goal.fulfilledOn) &&
                (!input.selectedPeriodEndIso || goal.fulfilledOn! <= input.selectedPeriodEndIso);
            const projectedSaved = goal.saved;
            return {
                goalId: goal.id,
                name: goal.name,
                jarKey: goal.jarKey ?? null,
                saved: goal.saved,
                target: goal.target,
                projectedSaved,
                fulfilledByPeriod: fulfilledAlready,
                monthsToFulfill: null,
                reachedOn: fulfilledAlready ? goal.fulfilledOn : null,
                incomeNeededCents: null,
            };
        }

        if (direction === 'current' || !open) {
            const projectedSaved = Math.min(goal.target, goal.saved);
            return {
                goalId: goal.id,
                name: goal.name,
                jarKey: goal.jarKey ?? null,
                saved: goal.saved,
                target: goal.target,
                projectedSaved,
                fulfilledByPeriod: projectedSaved >= goal.target,
                monthsToFulfill:
                    goal.saved < goal.target && goal.monthlyContribution > 0
                        ? Math.ceil((goal.target - goal.saved) / goal.monthlyContribution)
                        : goal.saved >= goal.target
                          ? 0
                          : null,
                reachedOn:
                    projectedSaved >= goal.target
                        ? (goal.fulfilledOn ?? isoMonthStart(new Date(), 0))
                        : null,
                incomeNeededCents: null,
            };
        }

        // Looking ahead — future deposits only (monthsDelta), on top of live saved.
        const futureMonths = Math.max(0, monthsDelta);
        let projectedSaved = goal.saved;
        if (goal.kind === GoalKind.EARN || goal.kind === 'EARN') {
            // EARN is a monthly net target, not a running balance — keep live saved/progress.
            projectedSaved = goal.saved;
        } else {
            projectedSaved = Math.min(
                goal.target,
                goal.saved + goal.monthlyContribution * futureMonths
            );
        }

        const remaining = Math.max(0, goal.target - goal.saved);
        const monthsToFulfill =
            remaining > 0 && goal.monthlyContribution > 0
                ? Math.ceil(remaining / goal.monthlyContribution)
                : remaining <= 0
                  ? 0
                  : null;

        let incomeNeededCents: number | null = null;
        if (
            goal.targetOn &&
            remaining > 0 &&
            (goal.kind === GoalKind.SAVE ||
                goal.kind === GoalKind.GIVE ||
                goal.kind === 'SAVE' ||
                goal.kind === 'GIVE')
        ) {
            const targetYm = parsePeriodKey(goal.targetOn.slice(0, 7));
            const monthsToTarget = monthsBetween(currentYearMonth(), targetYm);
            if (monthsToTarget > 0 && monthsToTarget <= futureMonths) {
                const byTargetDate = Math.min(
                    goal.target,
                    goal.saved + goal.monthlyContribution * monthsToTarget
                );
                if (byTargetDate < goal.target && goal.jarPercentage && goal.jarPercentage > 0) {
                    incomeNeededCents = incomeNeededForTarget({
                        remainingCents: remaining,
                        months: monthsToTarget,
                        jarPercentage: goal.jarPercentage,
                        jarFixedCents: goal.jarFixedCents,
                        siblingPlannedCents: goal.siblingPlannedCents,
                    }).incomeForNeedCents;
                }
            }
        }

        return {
            goalId: goal.id,
            name: goal.name,
            jarKey: goal.jarKey ?? null,
            saved: goal.saved,
            target: goal.target,
            projectedSaved,
            fulfilledByPeriod: projectedSaved >= goal.target,
            monthsToFulfill,
            reachedOn:
                monthsToFulfill !== null && monthsToFulfill <= futureMonths
                    ? isoMonthStart(new Date(), monthsToFulfill)
                    : null,
            incomeNeededCents,
        };
    });
}

export type DebtsAtPeriod = {
    totalRemaining: number;
    /** Live total before projection (baseline for deltas). */
    totalOriginal: number;
    debtFreeOn: string | null;
    monthsRemaining: number | null;
    clearedByPeriod: boolean;
};

function isoMonthDay(date: Date | null): string | null {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function projectDebtsAtHorizon(input: {
    debts: readonly DebtPayoffInput[];
    monthsDelta: number;
    direction: PeriodTravel['direction'];
    strategy?: PayoffStrategy;
    extraMonthly?: number;
}): DebtsAtPeriod {
    const strategy = input.strategy ?? PayoffStrategy.AVALANCHE;
    const extra = input.extraMonthly ?? 0;
    const totalOriginal = input.debts.reduce((total, debt) => total + debt.balance, 0);

    if (input.debts.length === 0) {
        return {
            totalRemaining: 0,
            totalOriginal: 0,
            debtFreeOn: null,
            monthsRemaining: null,
            clearedByPeriod: true,
        };
    }

    const full = simulatePayoff(input.debts, strategy, extra);

    // Looking back / current: live balances (no historical rewind in v1).
    if (input.direction !== 'future') {
        return {
            totalRemaining: totalOriginal,
            totalOriginal,
            debtFreeOn: isoMonthDay(full.debtFreeOn),
            monthsRemaining: full.debtFreeOn ? full.months : null,
            clearedByPeriod: totalOriginal <= 0,
        };
    }

    const projected = projectBalancesAfterMonths(
        input.debts,
        Math.max(0, input.monthsDelta),
        strategy,
        extra
    );

    return {
        totalRemaining: projected.totalRemaining,
        totalOriginal,
        debtFreeOn: isoMonthDay(full.debtFreeOn),
        monthsRemaining: full.debtFreeOn
            ? Math.max(0, full.months - Math.max(0, input.monthsDelta))
            : null,
        clearedByPeriod: projected.cleared,
    };
}

export type CoachPeriodTravelCopyInput = {
    travel: PeriodTravel;
    stamp: string;
    horizon: number;
    stackedTotal: number;
    /** Already formatted major-unit strings optional — prefer cents + leave formatting to caller. */
    stackedTotalLabel?: string;
    jarHighlights?: string[];
    goalsAtPeriod?: readonly GoalAtPeriod[];
    debtsAtPeriod?: DebtsAtPeriod | null;
    /** Format cents → display; defaults to raw minor units. */
    formatMoney?: (cents: number) => string;
};

/** One Coach-voice paragraph for Looking Ahead / Looking Back.
 * Jar flow only — goals/debt deltas live on the travel strip (no double-say).
 */
export function coachPeriodTravelCopy(input: CoachPeriodTravelCopyInput): string {
    const money = input.formatMoney ?? ((cents: number) => String(cents));
    const { travel, stamp, horizon, stackedTotal } = input;
    const past = travel.direction === 'past';

    const parts: string[] = [];

    if (past) {
        parts.push(
            `Looking back at ${stamp} (${travel.relativeLabel}): about ${money(stackedTotal)} moved through your jars across ${horizon} month${horizon === 1 ? '' : 's'}.`
        );
    } else {
        parts.push(
            `By ${stamp}, if you keep this plan, about ${money(stackedTotal)} will have moved through your jars across ${horizon} month${horizon === 1 ? '' : 's'}.`
        );
    }

    if (input.jarHighlights?.length) {
        parts.push(input.jarHighlights.slice(0, 2).join(' · '));
    }

    // Income shortfall tip only — fulfilled goals / debt remaining are on the strip.
    const short = (input.goalsAtPeriod ?? []).find(goal => goal.incomeNeededCents !== null);
    if (short?.incomeNeededCents !== null && short?.incomeNeededCents !== undefined) {
        parts.push(
            `${short.name} still needs pace — roughly ${money(short.incomeNeededCents)}/mo net to make the date.`
        );
    }

    if (past) {
        parts.push('Lifetime goal saved and live debt are not rewound for past months.');
    }

    return parts.join(' ');
}

/** Convenience: travel metadata for a selected period key. */
export function travelForPeriod(period: string, now = new Date()) {
    const selected = parsePeriodKey(period);
    const travel = describePeriodTravel(selected, now);
    return {
        travel,
        horizon: horizonMonths(travel),
        mode: travel.direction === 'current' ? ('snapshot' as const) : ('stacked' as const),
        selected,
        current: currentYearMonth(now),
    };
}

export function endOfPeriodIso(period: string): string {
    const { year, month } = parsePeriodKey(period);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return `${toPeriodKey(year, month)}-${String(lastDay).padStart(2, '0')}`;
}
