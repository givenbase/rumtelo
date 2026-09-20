/**
 * ISO week keys (YYYY-Www) on the client. Mirrors `currentWeek` / `weekRange`
 * in the backend so the "My week" page and the summary procedure agree on Monday.
 */

const DAY_MS = 86_400_000;

function utcDate(iso: string): Date {
    const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
    return new Date(Date.UTC(year, month - 1, day));
}

export function toIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

export function todayIso(): string {
    const now = new Date();
    return toIsoDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

/** ISO 8601 week key for a calendar date. */
export function weekKeyOf(iso: string): string {
    const date = utcDate(iso);
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((date.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Monday..Sunday for a week key. */
export function weekRangeOf(week: string): { from: string; to: string } {
    const [yearPart, weekPart] = week.split('-W') as [string, string];
    const fourthOfJanuary = new Date(Date.UTC(Number(yearPart), 0, 4));
    const weekdayOfFourth = fourthOfJanuary.getUTCDay() || 7;
    const monday = new Date(fourthOfJanuary);
    monday.setUTCDate(
        fourthOfJanuary.getUTCDate() - (weekdayOfFourth - 1) + (Number(weekPart) - 1) * 7
    );
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    return { from: toIsoDate(monday), to: toIsoDate(sunday) };
}

export function shiftWeek(week: string, delta: number): string {
    const { from } = weekRangeOf(week);
    const monday = utcDate(from);
    monday.setUTCDate(monday.getUTCDate() + delta * 7);
    return weekKeyOf(toIsoDate(monday));
}

export function shiftDay(iso: string, delta: number): string {
    const date = utcDate(iso);
    date.setUTCDate(date.getUTCDate() + delta);
    return toIsoDate(date);
}

export function formatDayLabel(iso: string, locale = 'en'): string {
    return utcDate(iso).toLocaleDateString(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
    });
}
