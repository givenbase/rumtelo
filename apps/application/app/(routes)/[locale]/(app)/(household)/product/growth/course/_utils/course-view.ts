import {
    CourseHorizon,
    CourseLane,
    CourseRhythmKind,
    CourseScheduleKind,
    addDays,
    ancestorPeriodOf,
    type CourseItem,
    type CourseScheduleEntry,
} from '@rumtelo/contracts';

/** Today in the household calendar (UTC date, like the API). */
export function todayIso(now = new Date()): string {
    return now.toISOString().slice(0, 10);
}

/** Range Today reads: the day plus six days, so a month close due later can remind. */
export function todayRange(day: string): { from: string; to: string } {
    return { from: day, to: addDays(day, 6) };
}

/** Quarter (`YYYY-Qn`) that holds a month. */
export function quarterOfMonth(month: string): string {
    return ancestorPeriodOf(CourseHorizon.MONTH, month, CourseHorizon.QUARTER) ?? month;
}

/** How a month-close row reads on `day`. */
export type MonthCloseState = 'later' | 'reminder' | 'due' | 'overdue' | 'done';

export function monthCloseStateOf(
    entry: Pick<CourseScheduleEntry, 'isDone' | 'isOverdue' | 'date' | 'reminderDate'>,
    day: string
): MonthCloseState {
    if (entry.isDone) return 'done';
    if (entry.isOverdue) return 'overdue';
    if (entry.date === day) return 'due';
    if (entry.reminderDate !== null && day >= entry.reminderDate) return 'reminder';
    return 'later';
}

/**
 * Checks that belong on a day: that day's own checks, plus a month close that is
 * reminding or due (its last day may lie later in the week). A month still open after
 * its end sits on today only — the API places it there.
 */
export function checksForDay(
    entries: readonly CourseScheduleEntry[],
    day: string
): CourseScheduleEntry[] {
    return entries.filter(entry => {
        if (entry.lane !== CourseLane.CHECK) return false;
        if (entry.kind !== CourseScheduleKind.MONTH_CLOSE || entry.isOverdue) {
            return entry.date === day;
        }
        const state = monthCloseStateOf(entry, day);
        return state === 'reminder' || state === 'due';
    });
}

/** Rows of one lane on one day. */
export function entriesOn(
    entries: readonly CourseScheduleEntry[],
    lane: CourseLane,
    day: string
): CourseScheduleEntry[] {
    return entries.filter(entry => entry.lane === lane && entry.date === day);
}

/** Badge a row wears: its lane, with a routine shown as Habit or Discipline. */
export type CourseBadgeKind = 'FOCUS' | 'HABIT' | 'DISCIPLINE' | 'CHECK' | 'ADVICE';

export function badgeKindOf(
    entry: Pick<CourseScheduleEntry, 'lane' | 'rhythmKind'>
): CourseBadgeKind {
    if (entry.lane === CourseLane.RHYTHM) {
        return entry.rhythmKind === CourseRhythmKind.HABIT ? 'HABIT' : 'DISCIPLINE';
    }
    if (entry.lane === CourseLane.FOCUS) return 'FOCUS';
    if (entry.lane === CourseLane.ADVICE) return 'ADVICE';
    return 'CHECK';
}

/**
 * Under a goal in Goals, only this month's and this quarter's steps show — the whole
 * year would bury the month you are in. The ring still counts the whole year.
 */
export function isCurrentStep(
    item: Pick<CourseItem, 'horizon' | 'period'>,
    month: string,
    quarter: string | null
): boolean {
    if (item.horizon === CourseHorizon.MONTH) return item.period === month;
    if (item.horizon === CourseHorizon.QUARTER) return quarter !== null && item.period === quarter;
    return false;
}
