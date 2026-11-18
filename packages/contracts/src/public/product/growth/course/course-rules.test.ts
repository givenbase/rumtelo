import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CourseHorizon } from '../enums';
import {
    COURSE_FOCUS_MAX,
    COURSE_FOCUS_RECOMMENDED,
    COURSE_POSITION_MAX,
    canHaveScope,
    courseSlotLimit,
    isCoursePositionValid,
    nextFreeCoursePosition,
} from './course-rules';

describe('soft limits', () => {
    it('recommends 3 and caps at 5 for week and day only', () => {
        assert.equal(COURSE_FOCUS_RECOMMENDED, 3);
        assert.equal(COURSE_FOCUS_MAX, 5);
        assert.equal(courseSlotLimit(CourseHorizon.WEEK), 5);
        assert.equal(courseSlotLimit(CourseHorizon.DAY), 5);
        for (const horizon of [CourseHorizon.YEAR, CourseHorizon.QUARTER, CourseHorizon.MONTH]) {
            assert.equal(courseSlotLimit(horizon), null);
        }
    });

    it('hands out the lowest free position; a week or day refuses a sixth', () => {
        assert.equal(nextFreeCoursePosition(CourseHorizon.WEEK, []), 1);
        assert.equal(nextFreeCoursePosition(CourseHorizon.WEEK, [1, 3]), 2);
        assert.equal(nextFreeCoursePosition(CourseHorizon.DAY, [1, 2, 3, 4]), 5);
        assert.equal(nextFreeCoursePosition(CourseHorizon.DAY, [1, 2, 3, 4, 5]), null);
    });

    it('never fills a year, quarter or month', () => {
        const taken = Array.from({ length: 12 }, (_, index) => index + 1);
        assert.equal(nextFreeCoursePosition(CourseHorizon.YEAR, taken), 13);
        assert.equal(nextFreeCoursePosition(CourseHorizon.MONTH, [1, 2, 3, 4, 5]), 6);
    });

    it('validates a position per layer', () => {
        assert.equal(isCoursePositionValid(CourseHorizon.WEEK, 5), true);
        assert.equal(isCoursePositionValid(CourseHorizon.WEEK, 6), false);
        assert.equal(isCoursePositionValid(CourseHorizon.DAY, 0), false);
        assert.equal(isCoursePositionValid(CourseHorizon.QUARTER, 40), true);
        assert.equal(isCoursePositionValid(CourseHorizon.QUARTER, COURSE_POSITION_MAX + 1), false);
        assert.equal(isCoursePositionValid(CourseHorizon.YEAR, 1.5), false);
    });
});

describe('scope', () => {
    it('labels outcomes only', () => {
        assert.equal(canHaveScope(CourseHorizon.YEAR), true);
        assert.equal(canHaveScope(CourseHorizon.QUARTER), true);
        assert.equal(canHaveScope(CourseHorizon.MONTH), true);
        assert.equal(canHaveScope(CourseHorizon.WEEK), false);
        assert.equal(canHaveScope(CourseHorizon.DAY), false);
    });
});
