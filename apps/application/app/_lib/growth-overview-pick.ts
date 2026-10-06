import type { Goal, Jar } from '@rumtelo/contracts';
import { GoalKind, GoalStatus, JarKey } from '@rumtelo/contracts';
import { earnGoalProgress } from '@rumtelo/utils';

import { isFocusSaveGoal } from '@/app/_lib/goal-focus';

const OVERVIEW_MAX = 3;

export type OverviewLane = 'edu' | 'earn' | 'due_now' | 'due_month' | 'due_on' | 'next';

export type OverviewRow = {
    goal: Goal;
    lane: OverviewLane;
};

function isOpenOverviewGoal(goal: Goal, currentNet: number): boolean {
    if (goal.status === GoalStatus.ARCHIVED || goal.status === GoalStatus.REACHED) return false;
    if (goal.kind === GoalKind.GIVE) return false;
    if (goal.kind === GoalKind.EARN) {
        return !earnGoalProgress({ target: goal.target, currentNet }).reached;
    }
    return goal.saved < goal.target;
}

export function overviewGoalProgressPct(goal: Goal, currentNet: number): number {
    if (goal.target <= 0) return 0;
    if (goal.kind === GoalKind.EARN) {
        return Math.min(100, Math.round((currentNet / goal.target) * 100));
    }
    return Math.min(100, Math.round((goal.saved / goal.target) * 100));
}

export function overviewGoalCurrent(goal: Goal, currentNet: number): number {
    return goal.kind === GoalKind.EARN ? currentNet : goal.saved;
}

function jarKeyOf(goal: Goal, jarById: ReadonlyMap<string, Jar>): JarKey | null {
    if (!goal.jarId) return null;
    return jarById.get(goal.jarId)?.key ?? null;
}

function monthsAhead(fromKey: string, toIso: string): number {
    const [fromYear, fromMonth] = fromKey.split('-').map(Number);
    const [toYear, toMonth] = toIso.split('-').map(Number);
    if (!fromYear || !fromMonth || !toYear || !toMonth) return 99;
    return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}

function dueLane(
    targetOn: string,
    periodKey: string
): Extract<OverviewLane, 'due_now' | 'due_month' | 'due_on'> {
    const ahead = monthsAhead(periodKey, targetOn);
    if (ahead < 0) return 'due_now';
    if (ahead === 0) return 'due_month';
    return 'due_on';
}

function bySortThenName(left: Goal, right: Goal): number {
    return left.sortOrder - right.sortOrder || left.name.localeCompare(right.name);
}

function firstOf(
    goals: readonly Goal[],
    compare: (left: Goal, right: Goal) => number
): Goal | undefined {
    let best: Goal | undefined;
    for (const goal of goals) {
        if (!best || compare(goal, best) < 0) best = goal;
    }
    return best;
}

const NEXT_JAR_ORDER: JarKey[] = [
    JarKey.FINANCIAL_FREEDOM,
    JarKey.LONG_TERM_SAVINGS,
    JarKey.PLAY,
    JarKey.GIVE,
    JarKey.NECESSITIES,
];

/**
 * Capacity (Education) → lever (Earn) → due soon → other jars / desires.
 * Max 3, one per jar.
 */
export function pickOverviewGoals(
    goals: readonly Goal[],
    jarById: ReadonlyMap<string, Jar>,
    currentNet: number,
    periodKey: string
): OverviewRow[] {
    const open = goals.filter(goal => isOpenOverviewGoal(goal, currentNet));
    const rows: OverviewRow[] = [];
    const taken = new Set<string>();
    const takenJars = new Set<string>();

    const push = (goal: Goal | undefined, lane: OverviewLane) => {
        if (!goal || taken.has(goal.id) || rows.length >= OVERVIEW_MAX) return;
        if (goal.jarId && takenJars.has(goal.jarId)) return;
        taken.add(goal.id);
        if (goal.jarId) takenJars.add(goal.jarId);
        rows.push({ goal, lane });
    };

    const unused = () => open.filter(goal => !taken.has(goal.id));

    const eduSaves = unused().filter(
        goal => goal.kind === GoalKind.SAVE && jarKeyOf(goal, jarById) === JarKey.EDUCATION
    );
    push(
        firstOf(
            eduSaves.filter(goal => isFocusSaveGoal(goal, goals)),
            bySortThenName
        ) ?? firstOf(eduSaves, bySortThenName),
        'edu'
    );

    push(
        firstOf(
            unused().filter(goal => goal.kind === GoalKind.EARN),
            bySortThenName
        ),
        'earn'
    );

    const due = firstOf(
        unused().filter(goal => goal.targetOn && monthsAhead(periodKey, goal.targetOn) <= 2),
        (left, right) => {
            const byDate = left.targetOn!.slice(0, 7).localeCompare(right.targetOn!.slice(0, 7));
            return byDate !== 0 ? byDate : bySortThenName(left, right);
        }
    );
    if (due?.targetOn) push(due, dueLane(due.targetOn, periodKey));

    push(
        firstOf(
            unused().filter(goal => goal.kind === GoalKind.SAVE && isFocusSaveGoal(goal, goals)),
            (left, right) => {
                const leftJar = jarKeyOf(left, jarById);
                const rightJar = jarKeyOf(right, jarById);
                const leftIdx = leftJar ? NEXT_JAR_ORDER.indexOf(leftJar) : 99;
                const rightIdx = rightJar ? NEXT_JAR_ORDER.indexOf(rightJar) : 99;
                if (leftIdx !== rightIdx) return leftIdx - rightIdx;
                return bySortThenName(left, right);
            }
        ),
        'next'
    );

    push(
        firstOf(
            unused().filter(goal => goal.kind === GoalKind.SAVE),
            bySortThenName
        ),
        'next'
    );

    return rows;
}
