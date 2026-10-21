import { CourseHorizon, coursePeriodOf, isCoursePeriod } from '@rumtelo/contracts';

import { growthPath } from '@/app/_lib/routes';
import { weekRangeOf } from '@/app/_lib/week-key';

/** Most specific first, so `2027-03-08` is a day and not a month. */
const DETECT_ORDER = [
    CourseHorizon.DAY,
    CourseHorizon.WEEK,
    CourseHorizon.QUARTER,
    CourseHorizon.MONTH,
    CourseHorizon.YEAR,
] as const;

/** Tabs in order: what now, what this week, where it leads. */
export const COURSE_TABS = ['today', 'week', 'goals'] as const;
export type CourseTab = (typeof COURSE_TABS)[number];

/** Layers shown in Goals, large to small. Quarter only when switched on. */
export type GoalsHorizon = CourseHorizon.YEAR | CourseHorizon.QUARTER | CourseHorizon.MONTH;

export type CourseView =
    | { tab: 'today'; day: string }
    | { tab: 'week'; week: string }
    | { tab: 'goals'; horizon: GoalsHorizon; period: string };

/**
 * `/course` → Today; `/course/2027-03-08` → Today on that day; `/course/2027-W10` →
 * Week; a month, quarter or year → Goals. Anything unknown → Today.
 */
export function parseCourseView(segment: string | undefined, now = new Date()): CourseView {
    const horizon = segment
        ? DETECT_ORDER.find(candidate => isCoursePeriod(candidate, segment))
        : undefined;
    if (!segment || !horizon) return { tab: 'today', day: coursePeriodOf(CourseHorizon.DAY, now) };
    if (horizon === CourseHorizon.DAY) return { tab: 'today', day: segment };
    if (horizon === CourseHorizon.WEEK) return { tab: 'week', week: segment };
    return { tab: 'goals', horizon, period: segment };
}

/** The week a day belongs to. */
export function weekOfDay(day: string): string {
    return coursePeriodOf(CourseHorizon.WEEK, new Date(`${day}T00:00:00Z`));
}

/** `/product/growth/course/<period>`; no period → Today. */
export function courseHref(period?: string): string {
    return period ? growthPath('course', period) : growthPath('course');
}

/** Human label for a period key. */
export function periodLabel(
    horizon: CourseHorizon,
    period: string,
    locale: string,
    short: { quarter: (quarter: string) => string; week: (week: string) => string }
): string {
    switch (horizon) {
        case CourseHorizon.YEAR:
            return period;
        case CourseHorizon.QUARTER:
            return `${short.quarter(period.slice(6))} ${period.slice(0, 4)}`;
        case CourseHorizon.MONTH:
            return new Intl.DateTimeFormat(locale, {
                month: 'long',
                year: 'numeric',
                timeZone: 'UTC',
            }).format(new Date(`${period}-01T00:00:00Z`));
        case CourseHorizon.WEEK: {
            const { from, to } = weekRangeOf(period);
            const range = new Intl.DateTimeFormat(locale, {
                day: 'numeric',
                month: 'short',
                timeZone: 'UTC',
            }).formatRange(new Date(`${from}T00:00:00Z`), new Date(`${to}T00:00:00Z`));
            return `${short.week(String(Number(period.slice(6))))} · ${range}`;
        }
        case CourseHorizon.DAY:
            return new Intl.DateTimeFormat(locale, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                timeZone: 'UTC',
            }).format(new Date(`${period}T00:00:00Z`));
    }
}
