import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CourseHorizon } from '../enums';
import {
    ancestorPeriodOf,
    childPeriodsOf,
    isCoursePeriod,
    nextCoursePeriod,
    parentPeriodOf,
    coursePeriodOf,
    shiftCoursePeriod,
} from './course-period';

describe('isCoursePeriod', () => {
    it('accepts each horizon format and rejects the others', () => {
        assert.equal(isCoursePeriod(CourseHorizon.YEAR, '2027'), true);
        assert.equal(isCoursePeriod(CourseHorizon.QUARTER, '2027-Q4'), true);
        assert.equal(isCoursePeriod(CourseHorizon.QUARTER, '2027-Q5'), false);
        assert.equal(isCoursePeriod(CourseHorizon.MONTH, '2027-13'), false);
        assert.equal(isCoursePeriod(CourseHorizon.DAY, '2027-02-29'), false);
        assert.equal(isCoursePeriod(CourseHorizon.DAY, '2028-02-29'), true);
        assert.equal(isCoursePeriod(CourseHorizon.MONTH, '2027'), false);
    });

    it('only accepts week 53 in years that have one', () => {
        assert.equal(isCoursePeriod(CourseHorizon.WEEK, '2026-W53'), true);
        assert.equal(isCoursePeriod(CourseHorizon.WEEK, '2027-W53'), false);
    });
});

describe('parentPeriodOf', () => {
    it('places a week in the month of its Thursday', () => {
        // 2027-W09: Mon 1 Mar … Thu 4 Mar.
        assert.equal(parentPeriodOf(CourseHorizon.WEEK, '2027-W09'), '2027-03');
        // 2027-W13: Mon 29 Mar … Thu 1 Apr → April.
        assert.equal(parentPeriodOf(CourseHorizon.WEEK, '2027-W13'), '2027-04');
    });

    it('handles the year change', () => {
        // 2026-W01 starts Mon 29 Dec 2025; its Thursday is 1 Jan 2026.
        assert.equal(parentPeriodOf(CourseHorizon.WEEK, '2026-W01'), '2026-01');
        // 2026-W53: Thursday 31 Dec 2026.
        assert.equal(parentPeriodOf(CourseHorizon.WEEK, '2026-W53'), '2026-12');
        // Fri 1 Jan 2027 still belongs to 2026-W53.
        assert.equal(parentPeriodOf(CourseHorizon.DAY, '2027-01-01'), '2026-W53');
    });

    it('maps months to quarters and quarters to years', () => {
        assert.equal(parentPeriodOf(CourseHorizon.MONTH, '2027-03'), '2027-Q1');
        assert.equal(parentPeriodOf(CourseHorizon.MONTH, '2027-10'), '2027-Q4');
        assert.equal(parentPeriodOf(CourseHorizon.QUARTER, '2027-Q2'), '2027');
        assert.equal(parentPeriodOf(CourseHorizon.YEAR, '2027'), null);
    });
});

describe('shiftCoursePeriod', () => {
    it('rolls every horizon over its boundary', () => {
        assert.equal(nextCoursePeriod(CourseHorizon.QUARTER, '2027-Q4'), '2028-Q1');
        assert.equal(nextCoursePeriod(CourseHorizon.MONTH, '2027-12'), '2028-01');
        assert.equal(nextCoursePeriod(CourseHorizon.WEEK, '2026-W53'), '2027-W01');
        assert.equal(nextCoursePeriod(CourseHorizon.DAY, '2028-02-28'), '2028-02-29');
        assert.equal(shiftCoursePeriod(CourseHorizon.MONTH, '2027-01', -1), '2026-12');
    });
});

describe('childPeriodsOf', () => {
    it('lists the weeks whose Thursday falls in the month', () => {
        assert.deepEqual(childPeriodsOf(CourseHorizon.MONTH, '2027-03'), [
            '2027-W09',
            '2027-W10',
            '2027-W11',
            '2027-W12',
        ]);
        assert.deepEqual(childPeriodsOf(CourseHorizon.MONTH, '2026-01'), [
            '2026-W01',
            '2026-W02',
            '2026-W03',
            '2026-W04',
            '2026-W05',
        ]);
    });

    it('lists Monday to Sunday for a week', () => {
        const days = childPeriodsOf(CourseHorizon.WEEK, '2027-W10');
        assert.equal(days[0], '2027-03-08');
        assert.equal(days[6], '2027-03-14');
    });

    it('agrees with parentPeriodOf for every child', () => {
        for (const horizon of [CourseHorizon.YEAR, CourseHorizon.QUARTER, CourseHorizon.MONTH]) {
            const period = coursePeriodOf(horizon, new Date(Date.UTC(2026, 11, 31)));
            const child =
                horizon === CourseHorizon.YEAR
                    ? CourseHorizon.QUARTER
                    : horizon === CourseHorizon.QUARTER
                      ? CourseHorizon.MONTH
                      : CourseHorizon.WEEK;
            for (const key of childPeriodsOf(horizon, period)) {
                assert.equal(parentPeriodOf(child, key), period, `${horizon} ${period} → ${key}`);
            }
        }
    });
});

describe('ancestorPeriodOf', () => {
    it('walks any number of layers up', () => {
        assert.equal(ancestorPeriodOf(CourseHorizon.WEEK, '2027-W10', CourseHorizon.YEAR), '2027');
        assert.equal(
            ancestorPeriodOf(CourseHorizon.WEEK, '2027-W10', CourseHorizon.MONTH),
            '2027-03'
        );
        assert.equal(
            ancestorPeriodOf(CourseHorizon.DAY, '2027-01-01', CourseHorizon.MONTH),
            '2026-12'
        );
    });

    it('returns null for the same or a lower layer', () => {
        assert.equal(ancestorPeriodOf(CourseHorizon.MONTH, '2027-03', CourseHorizon.MONTH), null);
        assert.equal(ancestorPeriodOf(CourseHorizon.MONTH, '2027-03', CourseHorizon.WEEK), null);
    });
});
