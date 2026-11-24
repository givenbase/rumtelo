import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    CourseHorizon,
    CourseItemStatus,
    GoalKind,
    GoalStatus,
    Visibility,
    type CourseItem,
    type Goal,
    type GoalSummary,
} from '@rumtelo/contracts';

import {
    DIRECTION_GOALS_MAX,
    firstStepOf,
    pickCourseDirectionGoals,
    pickMoneyDirectionGoals,
} from './direction-goals';

let counter = 0;

function item(overrides: Partial<CourseItem> & Pick<CourseItem, 'horizon' | 'period'>): CourseItem {
    counter += 1;
    return {
        id: `item-${counter}`,
        householdId: 'household',
        parentId: null,
        position: counter,
        name: `Item ${counter}`,
        doneWhen: null,
        scope: null,
        status: CourseItemStatus.OPEN,
        reviewNote: null,
        carriedFromId: null,
        carryCount: 0,
        goalId: null,
        moneyGoal: null,
        skill: null,
        targetCount: null,
        progress: { done: 0, total: 0 },
        hiddenChildCount: 0,
        accountId: 'me',
        visibility: Visibility.HOUSEHOLD,
        isMine: true,
        canEdit: true,
        ...overrides,
    };
}

function summary(id: string, name: string): GoalSummary {
    return {
        id,
        kind: GoalKind.SAVE,
        name,
        icon: null,
        status: GoalStatus.ACTIVE,
        target: 100_000,
        saved: 0,
        targetOn: null,
        jarId: null,
        jarKey: null,
        jarName: null,
        projectedDate: null,
    };
}

function moneyGoal(id: string, name: string, overrides: Partial<Goal> = {}): Goal {
    return {
        id,
        householdId: 'household',
        kind: GoalKind.SAVE,
        jarId: null,
        name,
        icon: null,
        target: 100_000,
        saved: 0,
        monthlyContribution: 0,
        targetOn: null,
        status: GoalStatus.ACTIVE,
        why: null,
        cause: null,
        givingOrganizationKey: null,
        fulfilledOn: null,
        sortOrder: 0,
        ...overrides,
    };
}

test('the first step is the earliest open month step from this month on', () => {
    const goal = item({ horizon: CourseHorizon.YEAR, period: '2026', name: 'Goal' });
    const past = item({
        horizon: CourseHorizon.MONTH,
        period: '2026-09',
        parentId: goal.id,
        name: 'September step',
    });
    const done = item({
        horizon: CourseHorizon.MONTH,
        period: '2026-11',
        parentId: goal.id,
        status: CourseItemStatus.DONE,
        name: 'Done step',
    });
    const next = item({
        horizon: CourseHorizon.MONTH,
        period: '2026-12',
        parentId: goal.id,
        name: 'December step',
    });
    const later = item({
        horizon: CourseHorizon.MONTH,
        period: '2027-01',
        parentId: goal.id,
        name: 'January step',
    });
    assert.equal(firstStepOf(goal.id, [goal, past, done, later, next], '2026-11'), 'December step');
});

test('a month step under a quarter still belongs to the goal; a quarter step is the fallback', () => {
    const goal = item({ horizon: CourseHorizon.YEAR, period: '2026' });
    const quarter = item({
        horizon: CourseHorizon.QUARTER,
        period: '2026-Q4',
        parentId: goal.id,
        name: 'Quarter step',
    });
    const month = item({
        horizon: CourseHorizon.MONTH,
        period: '2026-12',
        parentId: quarter.id,
        name: 'Month under quarter',
    });
    assert.equal(firstStepOf(goal.id, [goal, quarter, month], '2026-11'), 'Month under quarter');
    assert.equal(firstStepOf(goal.id, [goal, quarter], '2026-11'), 'Quarter step');
    // A step of another goal is not this goal's first step.
    const other = item({ horizon: CourseHorizon.YEAR, period: '2026' });
    assert.equal(firstStepOf(other.id, [goal, quarter, month, other], '2026-11'), null);
    assert.equal(firstStepOf(goal.id, [goal], '2026-11'), null);
});

test('Plus and Max: own and together goals in position order, with their first step', () => {
    const second = item({
        horizon: CourseHorizon.YEAR,
        period: '2026',
        position: 2,
        name: 'Second',
    });
    const first = item({ horizon: CourseHorizon.YEAR, period: '2026', position: 1, name: 'First' });
    const together = item({
        horizon: CourseHorizon.YEAR,
        period: '2026',
        position: 3,
        name: 'Together',
        isMine: false,
        accountId: null,
    });
    const step = item({
        horizon: CourseHorizon.MONTH,
        period: '2026-11',
        parentId: first.id,
        name: 'Call the bank',
    });
    const picked = pickCourseDirectionGoals({
        goals: [second, together, first],
        unlinked: [],
        yearItems: [first, second, together, step],
        month: '2026-11',
    });
    assert.deepEqual(
        picked.map(goal => [goal.name, goal.firstStep]),
        [
            ['First', 'Call the bank'],
            ['Second', null],
            ['Together', null],
        ]
    );
    assert.ok(picked.every(goal => goal.target.kind === 'course'));
});

test("another member's goal and a finished or dropped goal are not shown", () => {
    const theirs = item({
        horizon: CourseHorizon.YEAR,
        period: '2026',
        isMine: false,
        accountId: 'partner',
        name: 'Theirs',
    });
    const finished = item({
        horizon: CourseHorizon.YEAR,
        period: '2026',
        status: CourseItemStatus.DONE,
        name: 'Finished',
    });
    const dropped = item({
        horizon: CourseHorizon.YEAR,
        period: '2026',
        status: CourseItemStatus.DROPPED,
        name: 'Dropped',
    });
    const picked = pickCourseDirectionGoals({
        goals: [theirs, finished, dropped],
        unlinked: [],
        yearItems: [],
        month: '2026-11',
    });
    assert.deepEqual(picked, []);
});

test('at most three, own Course goals before unlinked Money goals', () => {
    const goals = [1, 2].map(position =>
        item({ horizon: CourseHorizon.YEAR, period: '2026', position, name: `Goal ${position}` })
    );
    const picked = pickCourseDirectionGoals({
        goals,
        unlinked: [summary('a', 'Money A'), summary('b', 'Money B')],
        yearItems: goals,
        month: '2026-11',
    });
    assert.equal(picked.length, DIRECTION_GOALS_MAX);
    assert.deepEqual(
        picked.map(goal => goal.name),
        ['Goal 1', 'Goal 2', 'Money A']
    );
    assert.deepEqual(picked[2]?.target, { kind: 'money', goalId: 'a' });
});

test('Basic: active Money goals in focus order, at most three, no first step', () => {
    const picked = pickMoneyDirectionGoals([
        moneyGoal('reached', 'Reached', { status: GoalStatus.REACHED }),
        moneyGoal('c', 'Charlie', { sortOrder: 2 }),
        moneyGoal('b', 'Bravo', { sortOrder: 1 }),
        moneyGoal('a', 'Alpha', { sortOrder: 1 }),
        moneyGoal('d', 'Delta', { sortOrder: 3 }),
        moneyGoal('paused', 'Paused', { status: GoalStatus.PAUSED }),
    ]);
    assert.deepEqual(
        picked.map(goal => goal.name),
        ['Alpha', 'Bravo', 'Charlie']
    );
    assert.ok(picked.every(goal => goal.firstStep === null && goal.target.kind === 'money'));
    assert.deepEqual(pickMoneyDirectionGoals([]), []);
});
