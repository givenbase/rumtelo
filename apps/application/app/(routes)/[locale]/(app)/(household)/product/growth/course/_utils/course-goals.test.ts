import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    CourseHorizon,
    CourseItemStatus,
    type CourseItem,
    type GoalSummary,
} from '@rumtelo/contracts';

import {
    buildGoalNodes,
    countItems,
    focusSlotsOf,
    looseSteps,
    nextStepMonth,
    weekItemsOfGoal,
    weekParentFor,
} from './course-goals';

function item(partial: Partial<CourseItem> & Pick<CourseItem, 'id' | 'horizon' | 'period'>) {
    return {
        parentId: null,
        position: 1,
        name: partial.id,
        doneWhen: null,
        scope: null,
        status: CourseItemStatus.OPEN,
        goalId: null,
        moneyGoal: null,
        targetCount: null,
        accountId: 'a1',
        isMine: true,
        canEdit: true,
        progress: { done: 0, total: 0 },
        ...partial,
    } as CourseItem;
}

const goalA = item({
    id: 'goalA',
    horizon: CourseHorizon.YEAR,
    period: '2026',
    progress: { done: 1, total: 4 },
});
const goalB = item({ id: 'goalB', horizon: CourseHorizon.YEAR, period: '2026', position: 2 });
const stepB = item({
    id: 'stepB',
    horizon: CourseHorizon.MONTH,
    period: '2026-11',
    parentId: 'goalB',
});
const loose = item({ id: 'loose', horizon: CourseHorizon.MONTH, period: '2026-11' });
const old = item({
    id: 'old',
    horizon: CourseHorizon.MONTH,
    period: '2026-03',
    parentId: 'goalA',
});
const money = {
    id: 'm1',
    name: 'Holiday',
    saved: 50_00,
    target: 200_00,
} as GoalSummary;

test('goals needing a step come first, money goals last', () => {
    const nodes = buildGoalNodes({
        goals: [goalB, goalA],
        unlinked: [money],
        yearItems: [goalA, goalB, stepB, old],
        month: '2026-11',
        quarter: null,
    });
    assert.deepEqual(
        nodes.map(node => node.key),
        ['goalA', 'goalB', 'money:m1']
    );
    assert.equal(nodes[0]!.needsStep, true);
    assert.equal(nodes[0]!.percent, 25);
    assert.equal(nodes[1]!.needsStep, false);
    assert.equal(nodes[2]!.percent, 25);
    // March has a step under goalA; November under goalB.
    assert.equal(nodes[0]!.filledMonths[2], true);
    assert.equal(nodes[0]!.filledMonths[10], false);
    assert.equal(nodes[1]!.filledMonths[10], true);
});

test('loose steps are this month items no goal owns', () => {
    const rows = looseSteps({
        yearItems: [goalA, goalB, stepB, loose, old],
        month: '2026-11',
        quarter: null,
        accountId: undefined,
    });
    assert.deepEqual(
        rows.map(row => row.id),
        ['loose']
    );
});

test('dropped and moved-on items leave the count', () => {
    assert.deepEqual(
        countItems([
            { status: CourseItemStatus.DONE },
            { status: CourseItemStatus.OPEN },
            { status: CourseItemStatus.DROPPED },
        ]),
        { done: 1, total: 2 }
    );
});

test('a new week item hangs under the month step, else the goal', () => {
    // 2026-W46 is the Thursday-of-week rule: Nov 12.
    assert.equal(weekParentFor(goalB, [stepB], '2026-W46')?.id, 'stepB');
    assert.equal(weekParentFor(goalA, [], '2026-W46')?.id, 'goalA');
    assert.equal(weekParentFor(goalA, [], '2027-W02'), null);
});

test('week items of a goal are the ones under it or its steps', () => {
    const week = [
        item({ id: 'w1', horizon: CourseHorizon.WEEK, period: '2026-W46', parentId: 'stepB' }),
        item({ id: 'w2', horizon: CourseHorizon.WEEK, period: '2026-W46', parentId: 'goalB' }),
        item({ id: 'w3', horizon: CourseHorizon.WEEK, period: '2026-W46' }),
    ];
    assert.deepEqual(
        weekItemsOfGoal(goalB, [stepB], week).map(row => row.id),
        ['w1', 'w2']
    );
});

test('next step month stops at the end of the year', () => {
    assert.equal(nextStepMonth('2026-10'), '2026-11');
    assert.equal(nextStepMonth('2026-12'), null);
});

test('focus slots: three invited, five at most, a hint from the fourth', () => {
    assert.deepEqual(focusSlotsOf(3, 5, 1), {
        emptySlots: 2,
        canAddMore: true,
        isFull: false,
        isBeyondRecommended: false,
    });
    assert.deepEqual(focusSlotsOf(3, 5, 4), {
        emptySlots: 0,
        canAddMore: true,
        isFull: false,
        isBeyondRecommended: true,
    });
    assert.equal(focusSlotsOf(3, 5, 5).isFull, true);
    assert.equal(focusSlotsOf(3, 5, 5).canAddMore, false);
});
