/**
 * The "stylised day" model behind the setup wizard and the daily check-in.
 *
 * A person answers five anchors (sleep, work, home, care, getting around); personal
 * care carries a quiet default; everything left over is free time. If they split the
 * free time we store the split, otherwise the remainder lands in HETUS 998
 * (`FREE_OTHER`) so a day always adds up to 1440 minutes and "you steer" stays honest.
 */

import type { TimeMinutesByCategory, TimeTemplate } from '@rumtelo/contracts';
import {
    MINUTES_PER_DAY,
    TIME_CATEGORY_KIND,
    TimeCategory,
    TimeDayKind,
    TimeKind,
} from '@rumtelo/contracts';

export type DayMinutes = Partial<Record<TimeCategory, number>>;

/** One question in the wizard / adjust panel. */
export type ShapeQuestion = {
    category: TimeCategory;
    question: string;
    /** Same category, asked the way a day off is lived. Falls back to `question`. */
    dayOffQuestion?: string;
    /** Chip values in hours. */
    options: readonly number[];
};

export const ANCHORS: readonly ShapeQuestion[] = [
    {
        category: TimeCategory.SLEEP,
        question: 'How long do you sleep?',
        dayOffQuestion: 'Do you sleep in?',
        options: [5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 10],
    },
    {
        category: TimeCategory.PAID_WORK,
        question: 'How long do you work?',
        options: [0, 4, 6, 7, 8, 9, 10, 12],
    },
    {
        category: TimeCategory.HOUSEHOLD_CARE,
        question: 'Home — cooking, cleaning, shopping, admin?',
        dayOffQuestion: 'The house — chores, groceries, the admin pile?',
        options: [0, 0.5, 1, 1.5, 2, 3, 4],
    },
    {
        category: TimeCategory.FAMILY_CARE,
        question: 'Caring for children or adults?',
        dayOffQuestion: 'Time with the people you care for?',
        options: [0, 0.5, 1, 2, 3, 5, 8],
    },
    {
        category: TimeCategory.TRAVEL,
        question: 'Getting around?',
        dayOffQuestion: 'Out and about — driving, cycling, transit?',
        options: [0, 0.5, 1, 1.5, 2, 3],
    },
];

/**
 * A first guess at a day off from the workday just described, so the second screen
 * asks "what changes?" instead of starting over. Sleep in an hour, more house, no
 * commute. Care time carries over — kids do not take the weekend off.
 */
export function dayOffFromWorkday(workday: DayMinutes): DayMinutes {
    const shape: DayMinutes = { ...workday };
    shape[TimeCategory.PAID_WORK] = 0;
    shape[TimeCategory.SLEEP] = Math.min(600, (workday[TimeCategory.SLEEP] ?? 450) + 60);
    shape[TimeCategory.HOUSEHOLD_CARE] = Math.min(
        240,
        (workday[TimeCategory.HOUSEHOLD_CARE] ?? 60) + 60
    );
    shape[TimeCategory.TRAVEL] = Math.round((workday[TimeCategory.TRAVEL] ?? 60) / 2 / 15) * 15;
    // Free-time split does not carry over: a day off spends it differently.
    for (const question of FREE_SPLIT) delete shape[question.category];
    delete shape[TimeCategory.FREE_OTHER];
    return shape;
}

/** Optional second layer: how the free remainder is spent. */
export const FREE_SPLIT: readonly ShapeQuestion[] = [
    {
        category: TimeCategory.EXERCISE,
        question: 'Moving — sport, training, brisk walks',
        options: [0, 0.5, 1, 1.5, 2, 3],
    },
    {
        category: TimeCategory.SOCIAL,
        question: 'People — friends, family, going out',
        options: [0, 0.5, 1, 1.5, 2, 3, 4],
    },
    {
        category: TimeCategory.SCREEN,
        question: 'Screen — TV, scrolling, gaming',
        options: [0, 0.5, 1, 1.5, 2, 3, 4],
    },
    {
        category: TimeCategory.STILLNESS,
        question: 'Stillness — rest, meditation, prayer',
        options: [0, 0.25, 0.5, 1, 1.5],
    },
];

/** Rarely needed, behind "more". */
export const MORE: readonly ShapeQuestion[] = [
    {
        category: TimeCategory.PERSONAL_CARE,
        question: 'Eating, washing, dressing',
        options: [0.5, 1, 1.5, 2, 3],
    },
    { category: TimeCategory.STUDY, question: 'Study', options: [0, 1, 2, 4, 6, 8] },
    { category: TimeCategory.HOBBIES, question: 'Hobbies', options: [0, 0.5, 1, 2, 3] },
    { category: TimeCategory.VOLUNTEERING, question: 'Volunteering', options: [0, 0.5, 1, 2, 3] },
];

export const PERSONAL_CARE_DEFAULT = 90;

export const DEFAULT_SHAPE: Record<TimeDayKind, DayMinutes> = {
    [TimeDayKind.WORKDAY]: {
        [TimeCategory.SLEEP]: 450,
        [TimeCategory.PERSONAL_CARE]: PERSONAL_CARE_DEFAULT,
        [TimeCategory.PAID_WORK]: 480,
        [TimeCategory.HOUSEHOLD_CARE]: 60,
        [TimeCategory.FAMILY_CARE]: 0,
        [TimeCategory.TRAVEL]: 60,
    },
    [TimeDayKind.DAY_OFF]: {
        [TimeCategory.SLEEP]: 510,
        [TimeCategory.PERSONAL_CARE]: PERSONAL_CARE_DEFAULT,
        [TimeCategory.PAID_WORK]: 0,
        [TimeCategory.HOUSEHOLD_CARE]: 120,
        [TimeCategory.FAMILY_CARE]: 60,
        [TimeCategory.TRAVEL]: 30,
    },
};

export const DEFAULT_WEEKDAYS: Record<TimeDayKind, number[]> = {
    [TimeDayKind.WORKDAY]: [1, 2, 3, 4, 5],
    [TimeDayKind.DAY_OFF]: [6, 7],
};

export const DAY_KIND_NAME: Record<TimeDayKind, string> = {
    [TimeDayKind.WORKDAY]: 'workday',
    [TimeDayKind.DAY_OFF]: 'day off',
};

export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const isFree = (category: TimeCategory) => TIME_CATEGORY_KIND[category] === TimeKind.FREE;

function sum(minutes: DayMinutes, predicate: (category: TimeCategory) => boolean): number {
    return (Object.entries(minutes) as [TimeCategory, number][])
        .filter(([category]) => predicate(category))
        .reduce((total, [, value]) => total + (value ?? 0), 0);
}

/** Minutes not claimed by body, paid or unpaid — what the person steers. */
export function freeRemainder(minutes: DayMinutes): number {
    return MINUTES_PER_DAY - sum(minutes, category => !isFree(category));
}

/** Free minutes already assigned to a specific free category (excluding the catch-all). */
export function freeAssigned(minutes: DayMinutes): number {
    return sum(minutes, category => isFree(category) && category !== TimeCategory.FREE_OTHER);
}

/** Over-committed when anchors alone pass 24 h, or the free split exceeds the remainder. */
export function overDay(minutes: DayMinutes): boolean {
    const remainder = freeRemainder(minutes);
    return remainder < 0 || freeAssigned(minutes) > remainder;
}

/**
 * Every category present, day totals exactly 1440. Unsplit free time → FREE_OTHER.
 * Clamps rather than throws: the UI already blocks over-committed days.
 */
export function finalizeDay(minutes: DayMinutes): Record<TimeCategory, number> {
    const remainder = Math.max(0, freeRemainder(minutes));
    const assigned = Math.min(remainder, freeAssigned(minutes));
    const full = Object.fromEntries(
        Object.values(TimeCategory).map(category => [category, Math.max(0, minutes[category] ?? 0)])
    ) as Record<TimeCategory, number>;
    full[TimeCategory.FREE_OTHER] = remainder - assigned;
    return full;
}

/** Template minutes → editable shape: drop the catch-all so the remainder is recomputed live. */
export function shapeFromMinutes(minutes: TimeMinutesByCategory): DayMinutes {
    const shape: DayMinutes = { ...minutes };
    delete shape[TimeCategory.FREE_OTHER];
    return shape;
}

export function isoWeekdayOf(iso: string): number {
    const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay() || 7;
}

/** The template that owns this date's weekday, and its best default (learned beats setup). */
export function templateForDay(
    templates: ReadonlyArray<TimeTemplate>,
    iso: string
): { template: TimeTemplate; defaults: DayMinutes } | null {
    const weekday = isoWeekdayOf(iso);
    const template =
        templates.find(candidate => candidate.weekdays.includes(weekday)) ?? templates[0];
    if (!template) return null;
    return { template, defaults: shapeFromMinutes(template.learned ?? template.minutes) };
}

/** "7.5h sleep · 8h work · 2h home & care · 1h travel · 5h you steer" */
export function describeShape(minutes: DayMinutes): string {
    const hours = (value: number) => {
        const rounded = Math.round((value / 60) * 4) / 4;
        const whole = Math.floor(rounded);
        const glyph = { 0.25: '¼', 0.5: '½', 0.75: '¾' }[rounded - whole] ?? '';
        return `${whole === 0 && glyph ? '' : whole}${glyph}h`;
    };
    const parts: string[] = [];
    const sleep = minutes[TimeCategory.SLEEP] ?? 0;
    const work = minutes[TimeCategory.PAID_WORK] ?? 0;
    const home =
        (minutes[TimeCategory.HOUSEHOLD_CARE] ?? 0) + (minutes[TimeCategory.FAMILY_CARE] ?? 0);
    const travel = minutes[TimeCategory.TRAVEL] ?? 0;
    if (sleep) parts.push(`${hours(sleep)} sleep`);
    if (work) parts.push(`${hours(work)} work`);
    if (home) parts.push(`${hours(home)} home & care`);
    if (travel) parts.push(`${hours(travel)} travel`);
    parts.push(`${hours(Math.max(0, freeRemainder(minutes)))} you steer`);
    return parts.join(' · ');
}
