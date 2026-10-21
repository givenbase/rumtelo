import { CourseRhythmCadence } from '@rumtelo/contracts';

/** Translator scoped to `features.growth.course.rhythm`. */
type TranslateRhythm = (key: string, values?: Record<string, string | number>) => string;

/** ISO weekday 1 (Monday) … 7 (Sunday) → short weekday name in `locale`. */
export function weekdayShort(weekday: number, locale: string): string {
    // 2024-01-01 was a Monday.
    const date = new Date(Date.UTC(2024, 0, weekday));
    return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(date);
}

/** "3× per week · Mon, Wed, Fri", "Every day", "12× per month". */
export function rhythmPatternLabel(
    rhythm: { cadence: CourseRhythmCadence; target: number; weekdays: readonly number[] | null },
    locale: string,
    t: TranslateRhythm
): string {
    const days = rhythm.weekdays?.length
        ? rhythm.weekdays.map(day => weekdayShort(day, locale)).join(', ')
        : null;
    switch (rhythm.cadence) {
        case CourseRhythmCadence.DAILY:
            return days ?? t('pattern_daily');
        case CourseRhythmCadence.WEEKLY: {
            const base = t('pattern_weekly', { count: rhythm.target });
            return days ? `${base} · ${days}` : base;
        }
        case CourseRhythmCadence.MONTHLY:
            return t('pattern_monthly', { count: rhythm.target });
    }
}
