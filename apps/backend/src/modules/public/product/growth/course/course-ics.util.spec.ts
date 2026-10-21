import { describe, expect, it } from 'vitest';

import {
    CourseArea,
    CourseLane,
    CourseRhythmKind,
    CourseRitual,
    CourseScheduleKind,
    type CourseScheduleEntry,
} from '@rumtelo/contracts';

import { isShown } from './course-feed.service';
import { escapeText, foldLine, renderCourseCalendar } from './course-ics.util';

function entry(partial: Partial<CourseScheduleEntry>): CourseScheduleEntry {
    return {
        key: 'focus-week:2026-W43:me',
        lane: CourseLane.FOCUS,
        kind: CourseScheduleKind.FOCUS_WEEK,
        area: CourseArea.GROWTH,
        date: '2026-10-19',
        endDate: '2026-10-25',
        names: [],
        sourceIds: [],
        isDone: false,
        doneCount: 1,
        totalCount: 3,
        period: '2026-W43',
        isOverdue: false,
        reminderDate: null,
        ritual: null,
        isSnoozed: false,
        minutes: null,
        adviceLowMinutes: null,
        adviceHighMinutes: null,
        rhythmKind: null,
        accountId: 'me',
        isMine: true,
        href: '/product/growth/course/2026-W43',
        ...partial,
    };
}

const now = new Date('2026-10-20T08:00:00Z');

describe('renderCourseCalendar', () => {
    it('writes the week focus as one all-day event with an exclusive end', () => {
        const ics = renderCourseCalendar({
            entries: [entry({ names: ['Train, then stretch', 'Read'] })],
            language: 'nl',
            appUrl: 'https://app.rumtelo.com',
            now,
        });
        expect(ics).toContain('BEGIN:VCALENDAR\r\n');
        expect(ics).toContain('X-WR-CALNAME:Rumtelo · Koers');
        expect(ics).toContain('UID:focus-week:2026-W43:me@rumtelo');
        expect(ics).toContain('DTSTART;VALUE=DATE:20261019');
        expect(ics).toContain('DTEND;VALUE=DATE:20261026');
        expect(ics).toContain('SUMMARY:Jouw 3 · W43 (1/3)');
        expect(ics).toContain('Train\\, then stretch');
        expect(ics).toContain('TRANSP:TRANSPARENT');
        expect(ics).not.toContain('BEGIN:VALARM');
        expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    });

    it('reminds an open month close three days before at 09:00', () => {
        const ics = renderCourseCalendar({
            entries: [
                entry({
                    key: 'month-close:2026-10',
                    lane: CourseLane.CHECK,
                    kind: CourseScheduleKind.MONTH_CLOSE,
                    area: CourseArea.MONEY,
                    date: '2026-10-31',
                    endDate: '2026-10-31',
                    period: '2026-10',
                    reminderDate: '2026-10-28',
                    ritual: CourseRitual.MONTH_CLOSE,
                    href: '/',
                }),
            ],
            language: 'en',
            appUrl: 'https://app.rumtelo.com',
            now,
        });
        expect(ics).toContain('SUMMARY:Close October 2026');
        expect(ics).toContain('TRIGGER:-P2DT15H');
        expect(ics).toContain('DESCRIPTION:Plan your month close');
    });

    it('moves a snoozed or overdue reminder to the day itself', () => {
        const ics = renderCourseCalendar({
            entries: [
                entry({
                    key: 'month-close:2026-09',
                    lane: CourseLane.CHECK,
                    kind: CourseScheduleKind.MONTH_CLOSE,
                    date: '2026-10-20',
                    endDate: '2026-10-20',
                    period: '2026-09',
                    isOverdue: true,
                    reminderDate: '2026-10-20',
                    href: '/',
                }),
            ],
            language: 'nl',
            appUrl: 'https://app.rumtelo.com',
            now,
        });
        expect(ics).toContain('SUMMARY:September 2026 staat nog open · sluit de maand af');
        expect(ics).toContain('TRIGGER:PT9H');
    });

    it('marks done rows and drops their reminders', () => {
        const ics = renderCourseCalendar({
            entries: [
                entry({
                    key: 'growth-week-check:2026-W44',
                    lane: CourseLane.CHECK,
                    kind: CourseScheduleKind.GROWTH_WEEK_CHECK,
                    date: '2026-10-25',
                    endDate: '2026-10-25',
                    isDone: true,
                }),
            ],
            language: 'en',
            appUrl: 'https://app.rumtelo.com',
            now,
        });
        expect(ics).toContain('SUMMARY:✓ Growth week check');
        expect(ics).not.toContain('BEGIN:VALARM');
    });
});

describe('routine rows', () => {
    it('counts a discipline and keeps a habit without a number', () => {
        const ics = renderCourseCalendar({
            entries: [
                entry({
                    key: 'rhythm:a:2026-10-20',
                    lane: CourseLane.RHYTHM,
                    kind: CourseScheduleKind.RHYTHM,
                    rhythmKind: CourseRhythmKind.DISCIPLINE,
                    date: '2026-10-20',
                    endDate: '2026-10-20',
                    names: ['Train'],
                    doneCount: 2,
                    totalCount: 3,
                }),
                entry({
                    key: 'rhythm:b:2026-10-20',
                    lane: CourseLane.RHYTHM,
                    kind: CourseScheduleKind.RHYTHM,
                    rhythmKind: CourseRhythmKind.HABIT,
                    date: '2026-10-20',
                    endDate: '2026-10-20',
                    names: ['Lezen'],
                    doneCount: null,
                    totalCount: null,
                }),
            ],
            language: 'nl',
            appUrl: 'https://app.rumtelo.com',
            now,
        });
        expect(ics).toContain('SUMMARY:Discipline · Train (2/3)');
        expect(ics).toContain('SUMMARY:Gewoonte · Lezen');
    });
});

describe('ics text', () => {
    it('escapes RFC 5545 specials', () => {
        expect(escapeText('a;b,c\\d\ne')).toBe(String.raw`a\;b\,c\\d\ne`);
    });

    it('folds long lines at 75 octets without splitting characters', () => {
        const folded = foldLine(`SUMMARY:${'é'.repeat(60)}`);
        const parts = folded.split('\r\n');
        expect(parts.length).toBeGreaterThan(1);
        for (const part of parts)
            expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
        expect(parts.map((part, index) => (index === 0 ? part : part.slice(1))).join('')).toBe(
            `SUMMARY:${'é'.repeat(60)}`
        );
    });
});

describe('feed switches', () => {
    const switches = {
        isFocusWeekShown: true,
        isFocusDayShown: true,
        isRhythmShown: false,
        isRitualsShown: true,
        isSleepShown: false,
        isPartnerShown: false,
    };

    it('follows the per-source switches', () => {
        expect(isShown(entry({}), switches)).toBe(true);
        expect(
            isShown(entry({ kind: CourseScheduleKind.RHYTHM, lane: CourseLane.RHYTHM }), switches)
        ).toBe(false);
        expect(
            isShown(entry({ kind: CourseScheduleKind.SLEEP, lane: CourseLane.ADVICE }), switches)
        ).toBe(false);
        expect(
            isShown(
                entry({ kind: CourseScheduleKind.MONTH_CLOSE, lane: CourseLane.CHECK }),
                switches
            )
        ).toBe(true);
    });

    it('keeps the rows of others out unless the partner switch is on', () => {
        const partnerRow = entry({ isMine: false, accountId: 'partner' });
        expect(isShown(partnerRow, switches)).toBe(false);
        expect(isShown(partnerRow, { ...switches, isPartnerShown: true })).toBe(true);
    });
});
