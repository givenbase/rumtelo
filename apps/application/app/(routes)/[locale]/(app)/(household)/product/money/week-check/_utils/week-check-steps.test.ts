import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { WeekCheckStage } from '@rumtelo/contracts';

import {
    buildWeekCheckSteps,
    resolveMoneyWeek,
    resumeIndex,
    type WeekCheckFacts,
} from './week-check-steps';

const keys = (hasSurplus: boolean, hasCourse: boolean) =>
    buildWeekCheckSteps({ hasSurplus, hasCourse }).map(step => step.key);

describe('buildWeekCheckSteps', () => {
    it('Basic without surplus is Look, Intend', () => {
        assert.deepEqual(keys(false, false), ['LOOK', 'INTEND']);
    });
    it('Basic with surplus adds Redirect', () => {
        assert.deepEqual(keys(true, false), ['LOOK', 'REDIRECT', 'INTEND']);
    });
    it('Plus appends the three Course stages', () => {
        assert.deepEqual(keys(true, true), [
            'LOOK',
            'REDIRECT',
            'INTEND',
            'COURSE_BACK',
            'COURSE_ROUTINES',
            'COURSE_AHEAD',
        ]);
        assert.equal(keys(false, true).length, 5);
    });
    it('groups Money before Course', () => {
        const steps = buildWeekCheckSteps({ hasSurplus: false, hasCourse: true });
        assert.deepEqual(
            steps.map(step => step.group),
            ['money', 'money', 'course', 'course', 'course']
        );
    });
});

describe('resumeIndex', () => {
    const plus = buildWeekCheckSteps({ hasSurplus: true, hasCourse: true });
    const basic = buildWeekCheckSteps({ hasSurplus: false, hasCourse: false });

    it('starts at Look for a fresh check', () => {
        assert.equal(
            resumeIndex({ steps: plus, moneyStage: WeekCheckStage.LOOK, fromCourse: false }),
            0
        );
        assert.equal(resumeIndex({ steps: plus, moneyStage: null, fromCourse: false }), 0);
    });
    it('reopens Redirect when the check stopped there', () => {
        assert.equal(
            resumeIndex({ steps: plus, moneyStage: WeekCheckStage.REDIRECT, fromCourse: false }),
            1
        );
    });
    it('lands on Intend when Redirect is skipped', () => {
        assert.equal(
            resumeIndex({ steps: basic, moneyStage: WeekCheckStage.REDIRECT, fromCourse: false }),
            1
        );
    });
    it('Plus at INTEND resumes at the first Course stage', () => {
        assert.equal(
            resumeIndex({ steps: plus, moneyStage: WeekCheckStage.INTEND, fromCourse: false }),
            3
        );
    });
    it('Basic at INTEND reopens Intend', () => {
        assert.equal(
            resumeIndex({ steps: basic, moneyStage: WeekCheckStage.INTEND, fromCourse: false }),
            1
        );
    });
    it('from=course opens Course only once Money is at INTEND or later', () => {
        assert.equal(
            resumeIndex({ steps: plus, moneyStage: WeekCheckStage.LOOK, fromCourse: true }),
            0
        );
        assert.equal(
            resumeIndex({ steps: plus, moneyStage: WeekCheckStage.DONE, fromCourse: true }),
            3
        );
    });
    it('from=course is ignored without Course', () => {
        assert.equal(
            resumeIndex({ steps: basic, moneyStage: WeekCheckStage.DONE, fromCourse: true }),
            1
        );
    });
});

describe('resolveMoneyWeek', () => {
    // 2026-11-16 Monday, W47. 2026-11-22 Sunday, W47.
    const open: WeekCheckFacts = {
        stage: WeekCheckStage.LOOK,
        completedAt: null,
        allocationCount: 0,
    };
    const done: WeekCheckFacts = {
        stage: WeekCheckStage.DONE,
        completedAt: '2026-11-15T10:00:00.000Z',
        allocationCount: 1,
    };

    it('opens last week on Monday when it was started and not done', () => {
        const result = resolveMoneyWeek({ today: '2026-11-16', lastWeek: open, thisWeek: null });
        assert.deepEqual(result, { moneyWeek: '2026-W46', graceOpen: true });
    });
    it('also on Saturday while this week is a bare Look', () => {
        const result = resolveMoneyWeek({ today: '2026-11-21', lastWeek: open, thisWeek: open });
        assert.equal(result.moneyWeek, '2026-W46');
    });
    it('does not apply on Sunday', () => {
        const result = resolveMoneyWeek({ today: '2026-11-22', lastWeek: open, thisWeek: null });
        assert.deepEqual(result, { moneyWeek: '2026-W47', graceOpen: false });
    });
    it('uses this week once it has moved past Look', () => {
        const started: WeekCheckFacts = {
            stage: WeekCheckStage.INTEND,
            completedAt: null,
            allocationCount: 0,
        };
        const result = resolveMoneyWeek({ today: '2026-11-18', lastWeek: open, thisWeek: started });
        assert.equal(result.moneyWeek, '2026-W47');
    });
    it('does not reopen a done week or one nobody started', () => {
        assert.equal(
            resolveMoneyWeek({ today: '2026-11-16', lastWeek: done, thisWeek: null }).graceOpen,
            false
        );
        assert.equal(
            resolveMoneyWeek({ today: '2026-11-16', lastWeek: null, thisWeek: null }).graceOpen,
            false
        );
    });
});
