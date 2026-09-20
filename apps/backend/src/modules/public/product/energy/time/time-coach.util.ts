/**
 * Pure planning helpers for the time-week coach rules. Mirrors the frontend
 * stylised-day model so a planned week here is the same week the forecast shows.
 */

import { MINUTES_PER_DAY, TIME_CATEGORY_KIND, TimeCategory, TimeKind } from '@rumtelo/contracts';
import type { TimeMinutesByCategory } from '@rumtelo/contracts';

export type DayMinutes = Partial<Record<TimeCategory, number>>;

const isFree = (category: TimeCategory) => TIME_CATEGORY_KIND[category] === TimeKind.FREE;

function sum(minutes: DayMinutes, predicate: (category: TimeCategory) => boolean): number {
    return (Object.entries(minutes) as [TimeCategory, number][])
        .filter(([category]) => predicate(category))
        .reduce((total, [, value]) => total + (value ?? 0), 0);
}

export function isoWeekday(iso: string): number {
    const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay() || 7;
}

export function addDays(iso: string, delta: number): string {
    const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + delta);
    return date.toISOString().slice(0, 10);
}

export function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

export function freeRemainder(minutes: DayMinutes): number {
    return MINUTES_PER_DAY - sum(minutes, category => !isFree(category));
}

export function freeAssigned(minutes: DayMinutes): number {
    return sum(minutes, category => isFree(category) && category !== TimeCategory.FREE_OTHER);
}

/** Every category present; unsplit free time lands in FREE_OTHER. */
export function finalizeDay(minutes: DayMinutes): Record<TimeCategory, number> {
    const remainder = Math.max(0, freeRemainder(minutes));
    const assigned = Math.min(remainder, freeAssigned(minutes));
    const full = Object.fromEntries(
        Object.values(TimeCategory).map(category => [category, Math.max(0, minutes[category] ?? 0)])
    ) as Record<TimeCategory, number>;
    full[TimeCategory.FREE_OTHER] = remainder - assigned;
    return full;
}

export function emptyDay(): Record<TimeCategory, number> {
    return Object.fromEntries(Object.values(TimeCategory).map(category => [category, 0])) as Record<
        TimeCategory,
        number
    >;
}

export function addDay(
    totals: Record<TimeCategory, number>,
    day: Record<TimeCategory, number>
): void {
    for (const category of Object.values(TimeCategory)) {
        totals[category] += day[category];
    }
}

export function kindTotal(totals: Record<TimeCategory, number>, kind: TimeKind): number {
    return Object.values(TimeCategory)
        .filter(category => TIME_CATEGORY_KIND[category] === kind)
        .reduce((total, category) => total + totals[category], 0);
}

/** "6h", "6h 30m", "45m" — spoken, not chip glyphs. */
export function formatCoachHours(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours === 0) return `${rest}m`;
    return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2
        ? sorted[middle]!
        : Math.round((sorted[middle - 1]! + sorted[middle]!) / 2);
}

export function templateForWeekday(
    templates: ReadonlyArray<{ weekdays: number[]; minutes: TimeMinutesByCategory }>,
    weekday: number
): TimeMinutesByCategory | null {
    return templates.find(template => template.weekdays.includes(weekday))?.minutes ?? null;
}
