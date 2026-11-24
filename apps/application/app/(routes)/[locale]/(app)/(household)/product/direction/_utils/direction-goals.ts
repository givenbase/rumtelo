import {
    CourseHorizon,
    CourseItemStatus,
    GoalStatus,
    ancestorPeriodOf,
    type CourseItem,
    type Goal,
    type GoalSummary,
} from '@rumtelo/contracts';

/** At most three goals under a direction: more than that is a list, not a direction. */
export const DIRECTION_GOALS_MAX = 3;

export type DirectionGoal = {
    /** Stable list key. */
    key: string;
    name: string;
    /** Where its row leads: the Course goals view, or one Money goal's page. */
    target: { kind: 'course' } | { kind: 'money'; goalId: string };
    /** The nearest step that is still to do; null when the data holds none (Money goals never do). */
    firstStep: string | null;
};

const OPEN_STATUSES: ReadonlySet<CourseItemStatus> = new Set([
    CourseItemStatus.OPEN,
    CourseItemStatus.PARTIAL,
]);

const isOpen = (item: Pick<CourseItem, 'status'>) => OPEN_STATUSES.has(item.status);

/** The YEAR item an item hangs under (itself for a YEAR item); null when the chain is broken. */
function goalIdOf(item: CourseItem, byId: ReadonlyMap<string, CourseItem>): string | null {
    let current: CourseItem | undefined = item;
    // Year → quarter → month is two hops; the bound only guards bad data.
    for (let hops = 0; current && hops < 6; hops += 1) {
        if (current.horizon === CourseHorizon.YEAR) return current.id;
        current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return null;
}

/**
 * The nearest step of a goal that is still to do: the earliest open month step from `month`
 * on, else the earliest open quarter step that holds or follows it. Steps in the past that
 * were not finished are the week check's business, not a first step.
 */
export function firstStepOf(
    goalId: string,
    yearItems: readonly CourseItem[],
    month: string
): string | null {
    const byId = new Map(yearItems.map(item => [item.id, item]));
    const steps = yearItems.filter(
        item =>
            (item.horizon === CourseHorizon.MONTH || item.horizon === CourseHorizon.QUARTER) &&
            isOpen(item) &&
            goalIdOf(item, byId) === goalId
    );
    const byPeriod = (left: CourseItem, right: CourseItem) =>
        left.period.localeCompare(right.period) || left.position - right.position;
    const monthStep = steps
        .filter(item => item.horizon === CourseHorizon.MONTH && item.period >= month)
        .sort(byPeriod)[0];
    if (monthStep) return monthStep.name;
    const quarter = ancestorPeriodOf(CourseHorizon.MONTH, month, CourseHorizon.QUARTER);
    const quarterStep = steps
        .filter(
            item => item.horizon === CourseHorizon.QUARTER && (!quarter || item.period >= quarter)
        )
        .sort(byPeriod)[0];
    return quarterStep?.name ?? null;
}

/**
 * Plus and Max: the person's own year goals, then the household's open Money goals that no
 * Course goal links to yet (the Goals tab lists both side by side). "Own" is a goal the
 * person made or one made for the household together; another member's goal is not theirs,
 * even when it is visible to them. Position order, at most three.
 */
export function pickCourseDirectionGoals(input: {
    goals: readonly CourseItem[];
    unlinked: readonly GoalSummary[];
    yearItems: readonly CourseItem[];
    /** `YYYY-MM` the steps are measured from. */
    month: string;
}): DirectionGoal[] {
    const own = input.goals
        .filter(
            goal =>
                goal.horizon === CourseHorizon.YEAR &&
                isOpen(goal) &&
                (goal.isMine || goal.accountId === null)
        )
        .sort((left, right) => left.position - right.position)
        .map((goal): DirectionGoal => ({
            key: goal.id,
            name: goal.name,
            target: { kind: 'course' },
            firstStep: firstStepOf(goal.id, input.yearItems, input.month),
        }));
    const money = input.unlinked.map((goal): DirectionGoal => ({
        key: `money:${goal.id}`,
        name: goal.name,
        target: { kind: 'money', goalId: goal.id },
        firstStep: null,
    }));
    return [...own, ...money].slice(0, DIRECTION_GOALS_MAX);
}

/** Basic: the household's active goals, focus first (`sortOrder`), at most three. */
export function pickMoneyDirectionGoals(goals: readonly Goal[]): DirectionGoal[] {
    return goals
        .filter(goal => goal.status === GoalStatus.ACTIVE)
        .sort(
            (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)
        )
        .slice(0, DIRECTION_GOALS_MAX)
        .map(goal => ({
            key: `money:${goal.id}`,
            name: goal.name,
            target: { kind: 'money', goalId: goal.id },
            firstStep: null,
        }));
}
