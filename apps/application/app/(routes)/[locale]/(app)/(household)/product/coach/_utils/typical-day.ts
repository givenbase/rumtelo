import type { TimeTemplate } from '@rumtelo/contracts';
import { MINUTES_PER_DAY, TIME_CATEGORY_KIND, TimeCategory, TimeKind } from '@rumtelo/contracts';

type DayMinutes = Partial<Record<TimeCategory, number>>;

function shapeFromMinutes(minutes: Record<string, number>): DayMinutes {
    const shape: DayMinutes = { ...minutes };
    delete shape[TimeCategory.FREE_OTHER];
    return shape;
}

const isFree = (category: TimeCategory) => TIME_CATEGORY_KIND[category] === TimeKind.FREE;

function sum(minutes: DayMinutes, predicate: (category: TimeCategory) => boolean): number {
    return (Object.entries(minutes) as [TimeCategory, number][])
        .filter(([category]) => predicate(category))
        .reduce((total, [, value]) => total + (value ?? 0), 0);
}

function freeAssigned(minutes: DayMinutes): number {
    return sum(minutes, category => isFree(category) && category !== TimeCategory.FREE_OTHER);
}

function freeRemainder(minutes: DayMinutes): number {
    return MINUTES_PER_DAY - sum(minutes, category => !isFree(category));
}

function finalizeDay(minutes: DayMinutes): Record<TimeCategory, number> {
    const remainder = Math.max(0, freeRemainder(minutes));
    const assigned = Math.min(remainder, freeAssigned(minutes));
    const full = Object.fromEntries(
        Object.values(TimeCategory).map(category => [category, Math.max(0, minutes[category] ?? 0)])
    ) as Record<TimeCategory, number>;
    full[TimeCategory.FREE_OTHER] = remainder - assigned;
    return full;
}

function isoWeekdayOf(iso: string): number {
    const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay() || 7;
}

function templateForDay(templates: ReadonlyArray<TimeTemplate>, iso: string): DayMinutes | null {
    const weekday = isoWeekdayOf(iso);
    const template =
        templates.find(candidate => candidate.weekdays.includes(weekday)) ?? templates[0];
    if (!template) return null;
    return shapeFromMinutes(template.learned ?? template.minutes);
}

/** Build `energy.time.create` entries from the household typical-week template. */
export function typicalDayEntries(
    templates: ReadonlyArray<TimeTemplate>,
    on: string
): { category: TimeCategory; minutes: number }[] | null {
    const defaults = templateForDay(templates, on);
    if (!defaults) return null;
    const full = finalizeDay(defaults);
    return (Object.entries(full) as [TimeCategory, number][]).map(([category, minutes]) => ({
        category,
        minutes,
    }));
}
