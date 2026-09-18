import type { Goal } from '@rumtelo/contracts';
import { GoalKind, GoalStatus } from '@rumtelo/contracts';

/** Active SAVE goals on a jar, focus-first (sortOrder ASC). */
export function activeSaveGoalsOnJar(
    goals: readonly Goal[],
    jarId: string | null | undefined
): Goal[] {
    if (!jarId) return [];
    return goals
        .filter(
            goal =>
                goal.kind === GoalKind.SAVE &&
                goal.jarId === jarId &&
                goal.status === GoalStatus.ACTIVE
        )
        .sort(
            (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)
        );
}

/** #1 focus SAVE goal on a jar, if any. */
export function focusSaveGoal(
    goals: readonly Goal[],
    jarId: string | null | undefined
): Goal | null {
    return activeSaveGoalsOnJar(goals, jarId)[0] ?? null;
}

/** 1-based rank among active SAVE siblings on the same jar; null if not applicable. */
export function saveGoalRank(goal: Goal, goals: readonly Goal[]): number | null {
    if (goal.kind !== GoalKind.SAVE || goal.status !== GoalStatus.ACTIVE || !goal.jarId) {
        return null;
    }
    const ordered = activeSaveGoalsOnJar(goals, goal.jarId);
    const index = ordered.findIndex(row => row.id === goal.id);
    return index >= 0 ? index + 1 : null;
}

export function isFocusSaveGoal(goal: Goal, goals: readonly Goal[]): boolean {
    return saveGoalRank(goal, goals) === 1;
}

/**
 * Progress toward a SAVE focus goal from jar available (cash in the tank).
 * Non-focus / reached fall back to goal.saved.
 */
export function saveGoalProgressCents(input: {
    goal: Goal;
    isFocus: boolean;
    jarAvailableCents: number | null | undefined;
}): number {
    const { goal, isFocus, jarAvailableCents } = input;
    if (goal.status === GoalStatus.REACHED) return goal.target;
    if (isFocus && jarAvailableCents !== null && jarAvailableCents !== undefined) {
        return Math.max(0, Math.min(goal.target, jarAvailableCents));
    }
    return Math.max(0, goal.saved);
}
