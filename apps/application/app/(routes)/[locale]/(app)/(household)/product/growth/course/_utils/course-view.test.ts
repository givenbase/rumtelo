import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    CourseArea,
    CourseHorizon,
    CourseLane,
    CourseRhythmKind,
    CourseScheduleKind,
    type CourseScheduleEntry,
} from '@rumtelo/contracts';

import { parseCourseView, weekOfDay } from './course-route';
import {
    badgeKindOf,
    checksForDay,
    isCurrentStep,
    monthCloseStateOf,
    quarterOfMonth,
    todayRange,
} from './course-view';

function row(partial: Partial<CourseScheduleEntry>): CourseScheduleEntry {
    return {
        key: 'k',
        lane: CourseLane.CHECK,
        kind: CourseScheduleKind.MONTH_CLOSE,
        area: CourseArea.MONEY,
        date: '2026-10-31',
        endDate: '2026-10-31',
        names: [],
        sourceIds: [],
        isDone: false,
        rhythmKind: null,
        doneCount: null,
        totalCount: null,
        period: '2026-10',
        isOverdue: false,
        reminderDate: '2026-10-28',
        ritual: null,
        isSnoozed: false,
        minutes: null,
        adviceLowMinutes: null,
        adviceHighMinutes: null,
        accountId: null,
        isMine: true,
        href: '/',
        ...partial,
    };
}

test('parseCourseView: nothing is Today, a day is Today, a week is Week, the rest is Goals', () => {
    const now = new Date(Date.UTC(2026, 9, 21, 12));
    assert.deepEqual(parseCourseView(undefined, now), { tab: 'today', day: '2026-10-21' });
    assert.deepEqual(parseCourseView('nope', now), { tab: 'today', day: '2026-10-21' });
    assert.deepEqual(parseCourseView('2026-10-19', now), { tab: 'today', day: '2026-10-19' });
    assert.deepEqual(parseCourseView('2026-W43', now), { tab: 'week', week: '2026-W43' });
    assert.deepEqual(parseCourseView('2026-10', now), {
        tab: 'goals',
        horizon: CourseHorizon.MONTH,
        period: '2026-10',
    });
    assert.deepEqual(parseCourseView('2026', now), {
        tab: 'goals',
        horizon: CourseHorizon.YEAR,
        period: '2026',
    });
    assert.equal(weekOfDay('2026-10-25'), '2026-W43');
});

test('todayRange looks six days ahead; quarterOfMonth finds the quarter', () => {
    assert.deepEqual(todayRange('2026-10-29'), { from: '2026-10-29', to: '2026-11-04' });
    assert.equal(quarterOfMonth('2026-11'), '2026-Q4');
});

test('month close reads later, reminder, due, overdue or done', () => {
    assert.equal(monthCloseStateOf(row({}), '2026-10-27'), 'later');
    assert.equal(monthCloseStateOf(row({}), '2026-10-28'), 'reminder');
    assert.equal(monthCloseStateOf(row({}), '2026-10-31'), 'due');
    assert.equal(
        monthCloseStateOf(row({ isOverdue: true, date: '2026-11-03' }), '2026-11-03'),
        'overdue'
    );
    assert.equal(monthCloseStateOf(row({ isDone: true }), '2026-10-31'), 'done');
});

test('checksForDay keeps the day’s own checks and a reminding month close', () => {
    const sunday = row({
        kind: CourseScheduleKind.GROWTH_WEEK_CHECK,
        date: '2026-10-25',
        reminderDate: null,
    });
    const close = row({});
    const overdue = row({ key: 'o', isOverdue: true, date: '2026-10-29', period: '2026-09' });
    assert.deepEqual(checksForDay([sunday, close], '2026-10-25'), [sunday]);
    assert.deepEqual(checksForDay([sunday, close], '2026-10-29'), [close]);
    assert.deepEqual(checksForDay([overdue], '2026-10-29'), [overdue]);
    assert.deepEqual(checksForDay([overdue], '2026-10-30'), []);
});

test('badgeKindOf shows a routine as Habit or Discipline', () => {
    assert.equal(
        badgeKindOf({ lane: CourseLane.RHYTHM, rhythmKind: CourseRhythmKind.HABIT }),
        'HABIT'
    );
    assert.equal(
        badgeKindOf({ lane: CourseLane.RHYTHM, rhythmKind: CourseRhythmKind.DISCIPLINE }),
        'DISCIPLINE'
    );
    assert.equal(badgeKindOf({ lane: CourseLane.FOCUS, rhythmKind: null }), 'FOCUS');
    assert.equal(badgeKindOf({ lane: CourseLane.CHECK, rhythmKind: null }), 'CHECK');
    assert.equal(badgeKindOf({ lane: CourseLane.ADVICE, rhythmKind: null }), 'ADVICE');
});

test('isCurrentStep keeps only this month and this quarter under a goal', () => {
    const month = { horizon: CourseHorizon.MONTH, period: '2026-10' };
    assert.equal(isCurrentStep(month, '2026-10', '2026-Q4'), true);
    assert.equal(isCurrentStep({ ...month, period: '2026-11' }, '2026-10', '2026-Q4'), false);
    assert.equal(
        isCurrentStep({ horizon: CourseHorizon.QUARTER, period: '2026-Q4' }, '2026-10', null),
        false
    );
    assert.equal(
        isCurrentStep({ horizon: CourseHorizon.QUARTER, period: '2026-Q4' }, '2026-10', '2026-Q4'),
        true
    );
});
