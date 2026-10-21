import {
    CourseScheduleKind,
    addDays,
    daySpan,
    minutesToHours,
    type CourseScheduleEntry,
} from '@rumtelo/contracts';

/** Languages the feed speaks. Spanish and French fall back to English for now. */
export type FeedLanguage = 'en' | 'nl';

interface FeedCopy {
    calendarName: string;
    yourWeek: (week: string, done: number, total: number) => string;
    sharedWeek: (week: string, done: number, total: number) => string;
    yourDay: (done: number, total: number) => string;
    sharedDay: (done: number, total: number) => string;
    discipline: (name: string, done: number, total: number) => string;
    habit: (name: string) => string;
    growthWeekCheck: string;
    moneyWeekCheck: string;
    monthClose: (month: string) => string;
    monthCloseOverdue: (month: string) => string;
    monthCloseReminder: string;
    sleep: (hours: string, low: string, high: string) => string;
    open: string;
    footer: string;
    done: string;
}

const MONTHS: Record<FeedLanguage, string[]> = {
    en: [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
    ],
    nl: [
        'januari',
        'februari',
        'maart',
        'april',
        'mei',
        'juni',
        'juli',
        'augustus',
        'september',
        'oktober',
        'november',
        'december',
    ],
};

const COPY: Record<FeedLanguage, FeedCopy> = {
    en: {
        calendarName: 'Rumtelo · Course',
        yourWeek: (week, done, total) => `Your 3 · ${week} (${done}/${total})`,
        sharedWeek: (week, done, total) => `Household · ${week} (${done}/${total})`,
        yourDay: (done, total) => `Your 3 today (${done}/${total})`,
        sharedDay: (done, total) => `Household today (${done}/${total})`,
        discipline: (name, done, total) => `Discipline · ${name} (${done}/${total})`,
        habit: name => `Habit · ${name}`,
        growthWeekCheck: 'Growth week check',
        moneyWeekCheck: 'Money week check',
        monthClose: month => `Close ${month}`,
        monthCloseOverdue: month => `${month} is still open · close the month`,
        monthCloseReminder: 'Plan your month close',
        sleep: (hours, low, high) => `Sleep · ${hours} h planned (advice ${low}–${high} h)`,
        open: 'Open in Rumtelo',
        footer: 'Tick it off in Rumtelo. This calendar only mirrors it.',
        done: 'Done',
    },
    nl: {
        calendarName: 'Rumtelo · Koers',
        yourWeek: (week, done, total) => `Jouw 3 · ${week} (${done}/${total})`,
        sharedWeek: (week, done, total) => `Huishouden · ${week} (${done}/${total})`,
        yourDay: (done, total) => `Jouw 3 vandaag (${done}/${total})`,
        sharedDay: (done, total) => `Huishouden vandaag (${done}/${total})`,
        discipline: (name, done, total) => `Discipline · ${name} (${done}/${total})`,
        habit: name => `Gewoonte · ${name}`,
        growthWeekCheck: 'Groei-weekcheck',
        moneyWeekCheck: 'Geld-weekcheck',
        monthClose: month => `Maand afsluiten: ${month}`,
        monthCloseOverdue: month => `${capitalize(month)} staat nog open · sluit de maand af`,
        monthCloseReminder: 'Plan je maandafsluiting',
        sleep: (hours, low, high) => `Slaap · ${hours} u gepland (advies ${low}–${high} u)`,
        open: 'Open in Rumtelo',
        footer: 'Vink af in Rumtelo. Deze agenda spiegelt alleen.',
        done: 'Gedaan',
    },
};

/**
 * Render schedule rows as an iCalendar (RFC 5545) document.
 *
 * All rows are all-day events (`VALUE=DATE`, DTEND exclusive): Course chooses *what*,
 * not *when*. Every event is `TRANSP:TRANSPARENT` so it never blocks free/busy, and
 * `CLASS:PRIVATE`. Reminders (`VALARM`) only ride on open rituals.
 */
export function renderCourseCalendar(input: {
    entries: readonly CourseScheduleEntry[];
    language: FeedLanguage;
    appUrl: string;
    now: Date;
}): string {
    const copy = COPY[input.language];
    const stamp = formatStamp(input.now);
    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Rumtelo//Course//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${escapeText(copy.calendarName)}`,
        'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
        'X-PUBLISHED-TTL:PT1H',
    ];

    for (const entry of input.entries) {
        const summary = summaryOf(entry, copy, input.language);
        if (!summary) continue;
        const url = `${input.appUrl.replace(/\/$/, '')}${entry.href}`;
        const description = [
            ...entry.names.map(name => `• ${name}`),
            entry.names.length > 0 ? '' : null,
            `${copy.open}: ${url}`,
            copy.footer,
        ]
            .filter((line): line is string => line !== null)
            .join('\n');

        lines.push(
            'BEGIN:VEVENT',
            `UID:${escapeText(entry.key)}@rumtelo`,
            `DTSTAMP:${stamp}`,
            `DTSTART;VALUE=DATE:${compactDate(entry.date)}`,
            `DTEND;VALUE=DATE:${compactDate(addDays(entry.endDate, 1))}`,
            `SUMMARY:${escapeText(entry.isDone ? `✓ ${summary}` : summary)}`,
            `DESCRIPTION:${escapeText(description)}`,
            `URL:${url}`,
            'CLASS:PRIVATE',
            'TRANSP:TRANSPARENT',
            ...alarmOf(entry, copy)
        );
        lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.map(foldLine).join('\r\n') + '\r\n';
}

/** Feed language from an account locale (`EN`, `NL`, …). */
export function feedLanguageOf(locale: string | null | undefined): FeedLanguage {
    return locale?.toUpperCase() === 'NL' ? 'nl' : 'en';
}

// ====================================================================
// Private
// ====================================================================

function summaryOf(
    entry: CourseScheduleEntry,
    copy: FeedCopy,
    language: FeedLanguage
): string | null {
    const done = entry.doneCount ?? 0;
    const total = entry.totalCount ?? 0;
    switch (entry.kind) {
        case CourseScheduleKind.FOCUS_WEEK: {
            const week = `W${Number((entry.period ?? '').slice(6))}`;
            return entry.isMine
                ? copy.yourWeek(week, done, total)
                : copy.sharedWeek(week, done, total);
        }
        case CourseScheduleKind.FOCUS_DAY:
            return entry.isMine ? copy.yourDay(done, total) : copy.sharedDay(done, total);
        case CourseScheduleKind.RHYTHM:
            return entry.totalCount === null
                ? copy.habit(entry.names[0] ?? '')
                : copy.discipline(entry.names[0] ?? '', done, total);
        case CourseScheduleKind.GROWTH_WEEK_CHECK:
            return copy.growthWeekCheck;
        case CourseScheduleKind.MONEY_WEEK_CHECK:
            return copy.moneyWeekCheck;
        case CourseScheduleKind.MONTH_CLOSE: {
            const month = monthName(entry.period ?? '', language);
            return entry.isOverdue ? copy.monthCloseOverdue(month) : copy.monthClose(month);
        }
        case CourseScheduleKind.SLEEP: {
            if (entry.minutes === null) return null;
            return copy.sleep(
                formatHours(entry.minutes, language),
                formatHours(entry.adviceLowMinutes ?? 0, language),
                formatHours(entry.adviceHighMinutes ?? 0, language)
            );
        }
    }
}

/**
 * Reminders: an open month close fires at 09:00 on its reminder day (lead days before,
 * or the day itself once snoozed or overdue); an open week check at 10:00 on Sunday.
 */
function alarmOf(entry: CourseScheduleEntry, copy: FeedCopy): string[] {
    if (entry.isDone) return [];
    if (entry.kind === CourseScheduleKind.MONTH_CLOSE) {
        const daysBefore = entry.isOverdue
            ? 0
            : Math.max(0, daySpan(entry.reminderDate ?? entry.date, entry.date) - 1);
        return alarm(
            daysBefore === 0 ? 'PT9H' : `-P${daysBefore - 1}DT15H`,
            copy.monthCloseReminder
        );
    }
    if (
        entry.kind === CourseScheduleKind.GROWTH_WEEK_CHECK ||
        entry.kind === CourseScheduleKind.MONEY_WEEK_CHECK
    ) {
        return alarm(
            'PT10H',
            entry.kind === CourseScheduleKind.GROWTH_WEEK_CHECK
                ? copy.growthWeekCheck
                : copy.moneyWeekCheck
        );
    }
    return [];
}

function alarm(trigger: string, text: string): string[] {
    return [
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `TRIGGER:${trigger}`,
        `DESCRIPTION:${escapeText(text)}`,
        'END:VALARM',
    ];
}

function monthName(period: string, language: FeedLanguage): string {
    const index = Number(period.slice(5, 7)) - 1;
    return `${MONTHS[language][index] ?? period} ${period.slice(0, 4)}`;
}

function formatHours(minutes: number, language: FeedLanguage): string {
    const hours = minutesToHours(minutes);
    const text = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
    return language === 'nl' ? text.replace('.', ',') : text;
}

function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function compactDate(isoDate: string): string {
    return isoDate.replaceAll('-', '');
}

function formatStamp(date: Date): string {
    return date
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');
}

/** RFC 5545 TEXT: escape backslash, semicolon, comma and newlines. */
export function escapeText(text: string): string {
    return text
        .replaceAll('\\', '\\\\')
        .replaceAll(';', '\\;')
        .replaceAll(',', '\\,')
        .replaceAll(/\r?\n/g, '\\n');
}

/** Fold a content line at 75 octets (UTF-8), continuation lines start with a space. */
export function foldLine(line: string): string {
    const encoder = new TextEncoder();
    if (encoder.encode(line).length <= 75) return line;
    const parts: string[] = [];
    let current = '';
    let size = 0;
    for (const char of line) {
        const charSize = encoder.encode(char).length;
        const limit = parts.length === 0 ? 75 : 74;
        if (size + charSize > limit) {
            parts.push(current);
            current = '';
            size = 0;
        }
        current += char;
        size += charSize;
    }
    parts.push(current);
    return parts.join('\r\n ');
}
