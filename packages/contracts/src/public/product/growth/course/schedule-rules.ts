/**
 * Schedule rules (Growth · Koers)
 *
 * Pure date rules for Course › Schedule and the calendar feed, shared by the API and
 * the app so a reminder can never land on one day in the app and another in the
 * calendar. All dates are ISO `YYYY-MM-DD`, UTC calendar.
 */

import { CourseHorizon, CourseRhythmCadence } from '../enums';
import { ancestorPeriodOf, coursePeriodOf, shiftCoursePeriod } from './course-period';

const DAY_MS = 86_400_000;

/** Lead days a month-close reminder may use (0 = on the day itself). */
export const MONTH_CLOSE_LEAD_DAYS = [0, 3, 7] as const;
export type MonthCloseLeadDays = (typeof MONTH_CLOSE_LEAD_DAYS)[number];

/** Default lead: "plan your month close" three days before. */
export const MONTH_CLOSE_DEFAULT_LEAD_DAYS: MonthCloseLeadDays = 3;

/** Longest range one schedule read may cover. */
export const SCHEDULE_MAX_DAYS = 92;

export function addDays(isoDate: string, days: number): string {
    return new Date(new Date(`${isoDate}T00:00:00Z`).getTime() + days * DAY_MS)
        .toISOString()
        .slice(0, 10);
}

/** Every date from `from` to `to`, both included. */
export function datesBetween(from: string, to: string): string[] {
    const dates: string[] = [];
    for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
    return dates;
}

/** Inclusive day count between two dates. */
export function daySpan(from: string, to: string): number {
    return (
        Math.round(
            (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) /
                DAY_MS
        ) + 1
    );
}

/** Last calendar day of a `YYYY-MM` month. */
export function lastDayOfMonth(month: string): string {
    const [year, monthIndex] = month.split('-').map(Number) as [number, number];
    return new Date(Date.UTC(year, monthIndex, 0)).toISOString().slice(0, 10);
}

/** First and last date of a course period (week, month, quarter, year or day). */
export function periodRange(horizon: CourseHorizon, period: string): { from: string; to: string } {
    switch (horizon) {
        case CourseHorizon.DAY:
            return { from: period, to: period };
        case CourseHorizon.WEEK: {
            const monday = mondayOf(period);
            return { from: monday, to: addDays(monday, 6) };
        }
        case CourseHorizon.MONTH:
            return { from: `${period}-01`, to: lastDayOfMonth(period) };
        case CourseHorizon.QUARTER: {
            const first = (Number(period.slice(6)) - 1) * 3 + 1;
            const year = period.slice(0, 4);
            return {
                from: `${year}-${String(first).padStart(2, '0')}-01`,
                to: lastDayOfMonth(`${year}-${String(first + 2).padStart(2, '0')}`),
            };
        }
        case CourseHorizon.YEAR:
            return { from: `${period}-01-01`, to: `${period}-12-31` };
    }
}

/** Monday of an ISO week key. */
export function mondayOf(week: string): string {
    const year = Number(week.slice(0, 4));
    const weekNumber = Number(week.slice(6));
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Weekday = jan4.getUTCDay() || 7;
    return new Date(jan4.getTime() + ((weekNumber - 1) * 7 - (jan4Weekday - 1)) * DAY_MS)
        .toISOString()
        .slice(0, 10);
}

/**
 * The week a Growth week check plans. On Sunday you look ahead to the coming week;
 * on any other day the check is about the week you are in.
 */
export function weekCheckWeekFor(isoDate: string): string {
    const date = new Date(`${isoDate}T00:00:00Z`);
    const week = coursePeriodOf(CourseHorizon.WEEK, date);
    return date.getUTCDay() === 0 ? shiftCoursePeriod(CourseHorizon.WEEK, week, 1) : week;
}

/** The Sunday on which the check for `week` happens: the Sunday before it starts. */
export function weekCheckDayOf(week: string): string {
    return addDays(mondayOf(week), -1);
}

/**
 * The period a rhythm counts in for a given week: the week itself, or (MONTHLY) the
 * month that holds the week's Thursday — the same rule as the cascade.
 */
export function rhythmPeriodOf(
    cadence: CourseRhythmCadence,
    week: string
): { horizon: CourseHorizon; period: string } {
    if (cadence === CourseRhythmCadence.MONTHLY) {
        return {
            horizon: CourseHorizon.MONTH,
            period: ancestorPeriodOf(CourseHorizon.WEEK, week, CourseHorizon.MONTH) ?? week,
        };
    }
    return { horizon: CourseHorizon.WEEK, period: week };
}

export interface MonthCloseStage {
    /** Last day of the month: the day the close is due. */
    dueDate: string;
    /** First day the reminder shows: `leadDays` before, or the due day once snoozed. */
    reminderDate: string;
    /** Today lies on or after the reminder and the month is still open. */
    isReminding: boolean;
    /** The month has ended and is still open — it stays until it is closed. */
    isOverdue: boolean;
}

/**
 * Stepped month-close reminder: `leadDays` before the last day; snoozed, it moves to
 * the day itself; after the month it stays as an open row until the month is closed.
 * Late is information, never an alarm.
 */
export function monthCloseStage(input: {
    month: string;
    today: string;
    isClosed: boolean;
    isSnoozed: boolean;
    leadDays: number;
}): MonthCloseStage {
    const dueDate = lastDayOfMonth(input.month);
    const reminderDate = input.isSnoozed ? dueDate : addDays(dueDate, -input.leadDays);
    return {
        dueDate,
        reminderDate,
        isReminding: !input.isClosed && input.today >= reminderDate,
        isOverdue: !input.isClosed && input.today > dueDate,
    };
}

/** Hours with one decimal (`7.5`), for sleep advice copy. */
export function minutesToHours(minutes: number): number {
    return Math.round((minutes / 60) * 10) / 10;
}
