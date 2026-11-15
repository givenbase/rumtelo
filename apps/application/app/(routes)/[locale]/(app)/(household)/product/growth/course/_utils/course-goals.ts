import {
    CourseHorizon,
    CourseItemStatus,
    ancestorPeriodOf,
    countsInProgress,
    shiftCoursePeriod,
    type CourseItem,
    type CourseScope,
    type GoalSummary,
} from '@rumtelo/contracts';

import { isCurrentStep } from './course-view';

/**
 * One row of the merged Goals list: a Course goal (a YEAR item, with or without a
 * linked Money goal) or a Money goal that nothing links to yet.
 */
export interface GoalNode {
    /** Stable list key: the item id, or `money:<goalId>` for an unlinked Money goal. */
    key: string;
    /** The Course goal; null for a Money goal that has no steps yet. */
    item: CourseItem | null;
    /** Linked or unlinked Money goal, when there is one. */
    moneyGoal: GoalSummary | null;
    name: string;
    scope: CourseScope | null;
    /** This month's steps (and this quarter's, when quarters are on). */
    steps: CourseItem[];
    /** Twelve flags, January first: does the month have a step under this goal? */
    filledMonths: boolean[];
    /** A Course goal without a step this month. */
    needsStep: boolean;
    /** 0–100: steps done, or saved of target while there are no steps. */
    percent: number;
}

/** Share of `done` in `total` as a whole percent; 0 when there is nothing to count. */
export function percentOf(done: number, total: number): number {
    if (total <= 0) return 0;
    return Math.min(100, Math.round((done / total) * 100));
}

/** Saved of target for a Money goal, as a whole percent. */
export function moneyPercent(goal: Pick<GoalSummary, 'saved' | 'target'>): number {
    return percentOf(goal.saved, goal.target);
}

/** `YYYY-MM` keys of the twelve months of `year`. */
export function monthsOfYear(year: string): string[] {
    return Array.from(
        { length: 12 },
        (_unused, index) => `${year}-${String(index + 1).padStart(2, '0')}`
    );
}

/** The YEAR item an item hangs under (itself for a YEAR item); null when the chain is loose or hidden. */
function rootGoalId(item: CourseItem, byId: ReadonlyMap<string, CourseItem>): string | null {
    let current: CourseItem | undefined = item;
    // Year → quarter → month is at most two hops; the bound only guards bad data.
    for (let hops = 0; current && hops < 6; hops += 1) {
        if (current.horizon === CourseHorizon.YEAR) return current.id;
        current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return null;
}

/** Steps (month items, quarter items) of the year indexed by the goal they belong to. */
function stepsByGoal(yearItems: readonly CourseItem[]): Map<string, CourseItem[]> {
    const byId = new Map(yearItems.map(item => [item.id, item]));
    const grouped = new Map<string, CourseItem[]>();
    for (const item of yearItems) {
        if (item.horizon === CourseHorizon.YEAR) continue;
        const goalId = rootGoalId(item, byId);
        if (goalId) grouped.set(goalId, [...(grouped.get(goalId) ?? []), item]);
    }
    return grouped;
}

/**
 * Month flags for the timeline: a month is filled when a step lies in it, or in the
 * quarter that holds it.
 */
function filledMonthsOf(year: string, steps: readonly CourseItem[]): boolean[] {
    return monthsOfYear(year).map(month =>
        steps.some(
            step =>
                (step.horizon === CourseHorizon.MONTH && step.period === month) ||
                (step.horizon === CourseHorizon.QUARTER &&
                    step.period ===
                        ancestorPeriodOf(CourseHorizon.MONTH, month, CourseHorizon.QUARTER))
        )
    );
}

/**
 * The merged list: Course goals that need a step this month first, then the rest by
 * position, then Money goals nothing links to yet.
 */
export function buildGoalNodes({
    goals,
    unlinked,
    yearItems,
    month,
    quarter,
}: {
    goals: readonly CourseItem[];
    unlinked: readonly GoalSummary[];
    yearItems: readonly CourseItem[];
    month: string;
    quarter: string | null;
}): GoalNode[] {
    const year = month.slice(0, 4);
    const grouped = stepsByGoal(yearItems);

    const goalNodes = goals.map((goal): GoalNode => {
        const all = grouped.get(goal.id) ?? [];
        const steps = all.filter(step => isCurrentStep(step, month, quarter));
        const money = goal.moneyGoal;
        return {
            key: goal.id,
            item: goal,
            moneyGoal: money,
            name: goal.name,
            scope: goal.scope,
            steps,
            filledMonths: filledMonthsOf(year, all),
            needsStep: steps.length === 0,
            percent:
                goal.progress.total > 0
                    ? percentOf(goal.progress.done, goal.progress.total)
                    : money
                      ? moneyPercent(money)
                      : 0,
        };
    });
    const ordered = [
        ...goalNodes.filter(node => node.needsStep),
        ...goalNodes.filter(node => !node.needsStep),
    ];

    const moneyNodes = unlinked.map((goal): GoalNode => ({
        key: `money:${goal.id}`,
        item: null,
        moneyGoal: goal,
        name: goal.name,
        scope: null,
        steps: [],
        filledMonths: filledMonthsOf(year, []),
        needsStep: false,
        percent: moneyPercent(goal),
    }));
    return [...ordered, ...moneyNodes];
}

/**
 * This month's steps no goal owns: no parent, or only a loose quarter above them. A
 * step under a private goal is not loose — it just cannot be named to the viewer.
 */
export function looseSteps({
    yearItems,
    month,
    quarter,
    accountId,
}: {
    yearItems: readonly CourseItem[];
    month: string;
    quarter: string | null;
    accountId: string | undefined;
}): CourseItem[] {
    const byId = new Map(yearItems.map(item => [item.id, item]));
    const candidates = yearItems.filter(
        item =>
            isCurrentStep(item, month, quarter) &&
            (!accountId || item.accountId === accountId) &&
            rootGoalId(item, byId) === null &&
            (item.parentId === null || byId.has(item.parentId))
    );
    const candidateIds = new Set(candidates.map(item => item.id));
    return candidates.filter(item => !item.parentId || !candidateIds.has(item.parentId));
}

/** Done and total of a set of items; dropped and moved-on ones leave the count. */
export function countItems(items: readonly Pick<CourseItem, 'status'>[]): {
    done: number;
    total: number;
} {
    const counted = items.filter(item => countsInProgress(item.status));
    return {
        done: counted.filter(item => item.status === CourseItemStatus.DONE).length,
        total: counted.length,
    };
}

/**
 * Parent of a new item for the current week: this month's step when it holds that
 * week, else the goal itself (a week may hang straight under a year goal).
 */
export function weekParentFor(
    goal: CourseItem,
    steps: readonly CourseItem[],
    week: string
): CourseItem | null {
    const weekMonth = ancestorPeriodOf(CourseHorizon.WEEK, week, CourseHorizon.MONTH);
    const step = steps.find(
        candidate => candidate.horizon === CourseHorizon.MONTH && candidate.period === weekMonth
    );
    if (step) return step;
    return ancestorPeriodOf(CourseHorizon.WEEK, week, CourseHorizon.YEAR) === goal.period
        ? goal
        : null;
}

/**
 * Month the second step button offers: next month when this one has a step, but never
 * across the year boundary (a goal belongs to one year). Null = nothing to offer.
 */
export function nextStepMonth(month: string): string | null {
    const next = shiftCoursePeriod(CourseHorizon.MONTH, month, 1);
    return next.slice(0, 4) === month.slice(0, 4) ? next : null;
}

/** Items of this week's focus that hang under a goal or one of its steps. */
export function weekItemsOfGoal(
    goal: CourseItem,
    steps: readonly CourseItem[],
    weekItems: readonly CourseItem[]
): CourseItem[] {
    const parentIds = new Set([goal.id, ...steps.map(step => step.id)]);
    return weekItems.filter(item => item.parentId !== null && parentIds.has(item.parentId));
}

/**
 * Week and day slots: three invited places, then a plain "add" up to the maximum.
 * `isBeyondRecommended` (a 4th item or more) is where the calm hint shows.
 */
export function focusSlotsOf(
    recommended: number,
    max: number,
    count: number
): { emptySlots: number; canAddMore: boolean; isFull: boolean; isBeyondRecommended: boolean } {
    return {
        emptySlots: Math.max(0, recommended - count),
        canAddMore: count < max,
        isFull: count >= max,
        isBeyondRecommended: count > recommended,
    };
}

/** Month name of a `YYYY-MM` key: "November" (long) or "Nov" (short), in `locale`. */
export function monthName(
    month: string,
    locale: string,
    style: 'long' | 'short' | 'narrow'
): string {
    return new Intl.DateTimeFormat(locale, { month: style, timeZone: 'UTC' }).format(
        new Date(`${month}-01T00:00:00Z`)
    );
}

/** "November 2026" from an ISO date (`2026-11-30`), or null without one. */
export function monthYearOf(isoDate: string | null, locale: string): string | null {
    if (!isoDate) return null;
    return new Intl.DateTimeFormat(locale, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`));
}
