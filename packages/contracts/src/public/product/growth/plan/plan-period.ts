/**
 * Plan period keys (Growth cascade)
 *
 * One key format per horizon, all calendar-based and UTC:
 *
 * | Horizon | Key          | Example      |
 * |---------|--------------|--------------|
 * | YEAR    | `YYYY`       | `2027`       |
 * | QUARTER | `YYYY-Qn`    | `2027-Q1`    |
 * | MONTH   | `YYYY-MM`    | `2027-03`    |
 * | WEEK    | `YYYY-Www`   | `2027-W10`   |
 * | DAY     | `YYYY-MM-DD` | `2027-03-08` |
 *
 * A week belongs to the month (and year) its Thursday falls in — the ISO rule.
 */

import { PlanHorizon } from '../enums';

const PATTERNS: Record<PlanHorizon, RegExp> = {
    [PlanHorizon.YEAR]: /^\d{4}$/,
    [PlanHorizon.QUARTER]: /^\d{4}-Q[1-4]$/,
    [PlanHorizon.MONTH]: /^\d{4}-(0[1-9]|1[0-2])$/,
    [PlanHorizon.WEEK]: /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/,
    [PlanHorizon.DAY]: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
};

const ORDER = [
    PlanHorizon.YEAR,
    PlanHorizon.QUARTER,
    PlanHorizon.MONTH,
    PlanHorizon.WEEK,
    PlanHorizon.DAY,
] as const;

const DAY_MS = 86_400_000;

/** True when `period` is a well-formed key for `horizon` (and a real date / ISO week). */
export function isPlanPeriod(horizon: PlanHorizon, period: string): boolean {
    if (!PATTERNS[horizon].test(period)) return false;
    if (horizon === PlanHorizon.DAY) return toIsoDate(dateOfDay(period)) === period;
    if (horizon === PlanHorizon.WEEK) {
        const [year, week] = splitWeek(period);
        return week <= isoWeeksInYear(year);
    }
    return true;
}

/** One layer up; null for YEAR. */
export function parentHorizon(horizon: PlanHorizon): PlanHorizon | null {
    return ORDER[ORDER.indexOf(horizon) - 1] ?? null;
}

/** One layer down; null for DAY. */
export function childHorizon(horizon: PlanHorizon): PlanHorizon | null {
    return ORDER[ORDER.indexOf(horizon) + 1] ?? null;
}

/** Key of the containing period one layer up; null for YEAR. */
export function parentPeriodOf(horizon: PlanHorizon, period: string): string | null {
    switch (horizon) {
        case PlanHorizon.YEAR:
            return null;
        case PlanHorizon.QUARTER:
            return period.slice(0, 4);
        case PlanHorizon.MONTH: {
            const month = Number(period.slice(5, 7));
            return `${period.slice(0, 4)}-Q${Math.ceil(month / 3)}`;
        }
        case PlanHorizon.WEEK:
            return toIsoDate(thursdayOfWeek(period)).slice(0, 7);
        case PlanHorizon.DAY:
            return weekKeyOf(dateOfDay(period));
    }
}

/** Key of the period containing `date` (UTC calendar). */
export function planPeriodOf(horizon: PlanHorizon, date: Date): string {
    const day = toIsoDate(date);
    switch (horizon) {
        case PlanHorizon.YEAR:
            return day.slice(0, 4);
        case PlanHorizon.QUARTER:
            return `${day.slice(0, 4)}-Q${Math.ceil(Number(day.slice(5, 7)) / 3)}`;
        case PlanHorizon.MONTH:
            return day.slice(0, 7);
        case PlanHorizon.WEEK:
            return weekKeyOf(date);
        case PlanHorizon.DAY:
            return day;
    }
}

/** The period right after `period` (carry forward). */
export function nextPlanPeriod(horizon: PlanHorizon, period: string): string {
    return shiftPlanPeriod(horizon, period, 1);
}

/** Move `steps` periods forward (negative = back). */
export function shiftPlanPeriod(horizon: PlanHorizon, period: string, steps: number): string {
    switch (horizon) {
        case PlanHorizon.YEAR:
            return String(Number(period) + steps);
        case PlanHorizon.QUARTER: {
            const index = Number(period.slice(0, 4)) * 4 + Number(period.slice(6)) - 1 + steps;
            return `${Math.floor(index / 4)}-Q${(index % 4) + 1}`;
        }
        case PlanHorizon.MONTH: {
            const index = Number(period.slice(0, 4)) * 12 + Number(period.slice(5, 7)) - 1 + steps;
            return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
        }
        case PlanHorizon.WEEK:
            return weekKeyOf(new Date(mondayOfWeek(period).getTime() + steps * 7 * DAY_MS));
        case PlanHorizon.DAY:
            return toIsoDate(new Date(dateOfDay(period).getTime() + steps * DAY_MS));
    }
}

/** Child period keys one layer down, in order (a month lists the weeks whose Thursday it holds). */
export function childPeriodsOf(horizon: PlanHorizon, period: string): string[] {
    switch (horizon) {
        case PlanHorizon.YEAR:
            return [1, 2, 3, 4].map(quarter => `${period}-Q${quarter}`);
        case PlanHorizon.QUARTER: {
            const first = (Number(period.slice(6)) - 1) * 3 + 1;
            return [first, first + 1, first + 2].map(
                month => `${period.slice(0, 4)}-${String(month).padStart(2, '0')}`
            );
        }
        case PlanHorizon.MONTH: {
            const weeks: string[] = [];
            let week = weekKeyOf(new Date(`${period}-01T00:00:00Z`));
            if (parentPeriodOf(PlanHorizon.WEEK, week) !== period) {
                week = shiftPlanPeriod(PlanHorizon.WEEK, week, 1);
            }
            while (parentPeriodOf(PlanHorizon.WEEK, week) === period) {
                weeks.push(week);
                week = shiftPlanPeriod(PlanHorizon.WEEK, week, 1);
            }
            return weeks;
        }
        case PlanHorizon.WEEK: {
            const monday = mondayOfWeek(period).getTime();
            return [0, 1, 2, 3, 4, 5, 6].map(offset =>
                toIsoDate(new Date(monday + offset * DAY_MS))
            );
        }
        case PlanHorizon.DAY:
            return [];
    }
}

/** True when `above` is a larger layer than `horizon` (year above quarter, …). */
export function isHorizonAbove(above: PlanHorizon, horizon: PlanHorizon): boolean {
    return ORDER.indexOf(above) < ORDER.indexOf(horizon);
}

/**
 * Key of the period at `ancestorHorizon` that contains (`horizon`, `period`);
 * null unless `ancestorHorizon` lies above `horizon`. Lets a week hang straight
 * under a year goal when the layers between are switched off or simply skipped.
 */
export function ancestorPeriodOf(
    horizon: PlanHorizon,
    period: string,
    ancestorHorizon: PlanHorizon
): string | null {
    if (!isHorizonAbove(ancestorHorizon, horizon)) return null;
    let current = { horizon, period };
    while (current.horizon !== ancestorHorizon) {
        const up = parentHorizon(current.horizon);
        const upPeriod = parentPeriodOf(current.horizon, current.period);
        if (!up || !upPeriod) return null;
        current = { horizon: up, period: upPeriod };
    }
    return current.period;
}

// ====================================================================
// Private
// ====================================================================

function toIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function dateOfDay(period: string): Date {
    return new Date(`${period}T00:00:00Z`);
}

function splitWeek(period: string): [number, number] {
    return [Number(period.slice(0, 4)), Number(period.slice(6))];
}

/** ISO week key of a UTC date (week of its Thursday). */
function weekKeyOf(date: Date): string {
    const thursday = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    );
    const day = thursday.getUTCDay() || 7;
    thursday.setUTCDate(thursday.getUTCDate() + 4 - day);
    const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
    const week = Math.ceil(((thursday.getTime() - yearStart) / DAY_MS + 1) / 7);
    return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Monday of an ISO week: week 1 holds January 4th. */
function mondayOfWeek(period: string): Date {
    const [year, week] = splitWeek(period);
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Weekday = jan4.getUTCDay() || 7;
    return new Date(jan4.getTime() + ((week - 1) * 7 - (jan4Weekday - 1)) * DAY_MS);
}

function thursdayOfWeek(period: string): Date {
    return new Date(mondayOfWeek(period).getTime() + 3 * DAY_MS);
}

/** 53 when the year starts or (leap year) ends on a Thursday. */
function isoWeeksInYear(year: number): number {
    return weekKeyOf(new Date(Date.UTC(year, 11, 28))).endsWith('53') ? 53 : 52;
}
