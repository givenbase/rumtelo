import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CourseHorizon, CourseRhythmCadence, CourseRhythmKind } from '../enums';
import {
    isCountingRhythm,
    isRhythmDueOn,
    isRhythmTargetValid,
    rhythmPeriodTarget,
    rhythmShapeFor,
} from './course-rules';
import {
    datesBetween,
    lastDayOfMonth,
    monthCloseStage,
    periodRange,
    rhythmPeriodOf,
    weekCheckDayOf,
    weekCheckWeekFor,
} from './schedule-rules';

describe('schedule rules', () => {
    it('plans next week on Sunday, this week otherwise', () => {
        // 2026-10-25 is a Sunday in W43; Monday 2026-10-26 starts W44.
        assert.equal(weekCheckWeekFor('2026-10-25'), '2026-W44');
        assert.equal(weekCheckWeekFor('2026-10-21'), '2026-W43');
        assert.equal(weekCheckDayOf('2026-W44'), '2026-10-25');
    });

    it('knows month ends, including February in a leap year', () => {
        assert.equal(lastDayOfMonth('2028-02'), '2028-02-29');
        assert.equal(lastDayOfMonth('2026-10'), '2026-10-31');
        assert.deepEqual(periodRange(CourseHorizon.QUARTER, '2026-Q4'), {
            from: '2026-10-01',
            to: '2026-12-31',
        });
        assert.equal(datesBetween('2026-10-30', '2026-11-02').length, 4);
    });

    it('steps the month-close reminder: lead, snoozed to the day, then overdue', () => {
        const base = { month: '2026-10', isClosed: false, leadDays: 3 };
        const early = monthCloseStage({ ...base, today: '2026-10-27', isSnoozed: false });
        assert.equal(early.reminderDate, '2026-10-28');
        assert.equal(early.isReminding, false);

        const lead = monthCloseStage({ ...base, today: '2026-10-28', isSnoozed: false });
        assert.equal(lead.isReminding, true);

        const snoozed = monthCloseStage({ ...base, today: '2026-10-29', isSnoozed: true });
        assert.equal(snoozed.reminderDate, '2026-10-31');
        assert.equal(snoozed.isReminding, false);

        const late = monthCloseStage({ ...base, today: '2026-11-04', isSnoozed: true });
        assert.equal(late.isOverdue, true);
        assert.equal(late.isReminding, true);

        const closed = monthCloseStage({
            ...base,
            today: '2026-11-04',
            isSnoozed: false,
            isClosed: true,
        });
        assert.equal(closed.isOverdue, false);
    });

    it('counts monthly rhythms in the month that holds the week', () => {
        // W44 of 2026 runs 26 Oct – 1 Nov; its Thursday is 29 Oct.
        assert.deepEqual(rhythmPeriodOf(CourseRhythmCadence.MONTHLY, '2026-W44'), {
            horizon: CourseHorizon.MONTH,
            period: '2026-10',
        });
        assert.deepEqual(rhythmPeriodOf(CourseRhythmCadence.WEEKLY, '2026-W44'), {
            horizon: CourseHorizon.WEEK,
            period: '2026-W44',
        });
    });
});

describe('rhythm rules', () => {
    it('bounds the target per cadence', () => {
        assert.equal(isRhythmTargetValid(CourseRhythmCadence.DAILY, 1), true);
        assert.equal(isRhythmTargetValid(CourseRhythmCadence.DAILY, 2), false);
        assert.equal(isRhythmTargetValid(CourseRhythmCadence.WEEKLY, 7), true);
        assert.equal(isRhythmTargetValid(CourseRhythmCadence.WEEKLY, 8), false);
        assert.equal(isRhythmTargetValid(CourseRhythmCadence.MONTHLY, 12), true);
    });

    it('asks a daily rhythm once per pattern day', () => {
        assert.equal(rhythmPeriodTarget(CourseRhythmCadence.DAILY, 1, null), 7);
        assert.equal(rhythmPeriodTarget(CourseRhythmCadence.DAILY, 1, [1, 2, 3, 4, 5]), 5);
        assert.equal(rhythmPeriodTarget(CourseRhythmCadence.WEEKLY, 3, [1, 3, 5]), 3);
    });

    it('shows a rhythm on its pattern days, or until the count is reached', () => {
        const monday = '2026-10-26';
        const tuesday = '2026-10-27';
        const pattern = { cadence: CourseRhythmCadence.WEEKLY, weekdays: [1, 3, 5] };
        assert.equal(
            isRhythmDueOn({ ...pattern, isoDate: monday, periodCount: 0, periodTarget: 3 }),
            true
        );
        assert.equal(
            isRhythmDueOn({ ...pattern, isoDate: tuesday, periodCount: 0, periodTarget: 3 }),
            false
        );
        const free = { cadence: CourseRhythmCadence.WEEKLY, weekdays: null };
        assert.equal(
            isRhythmDueOn({ ...free, isoDate: tuesday, periodCount: 2, periodTarget: 3 }),
            true
        );
        assert.equal(
            isRhythmDueOn({ ...free, isoDate: tuesday, periodCount: 3, periodTarget: 3 }),
            false
        );
    });

    it('keeps a habit daily and uncounted; a discipline counts', () => {
        assert.deepEqual(rhythmShapeFor(CourseRhythmKind.HABIT, CourseRhythmCadence.WEEKLY, 3), {
            cadence: CourseRhythmCadence.DAILY,
            target: 1,
        });
        assert.deepEqual(
            rhythmShapeFor(CourseRhythmKind.DISCIPLINE, CourseRhythmCadence.WEEKLY, 3),
            { cadence: CourseRhythmCadence.WEEKLY, target: 3 }
        );
        assert.equal(isCountingRhythm(CourseRhythmKind.HABIT), false);
        assert.equal(isCountingRhythm(CourseRhythmKind.DISCIPLINE), true);
    });
});
