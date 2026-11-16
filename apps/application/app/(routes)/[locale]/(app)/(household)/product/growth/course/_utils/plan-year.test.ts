import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    CourseRhythmCadence,
    CourseRhythmKind,
    CourseScope,
    GoalKind,
    GoalStatus,
    JarKey,
    WorkSituation,
    coursePresetByKey,
} from '@rumtelo/contracts';

import { createPlanFormSchema, type PlanGoalDraft } from './plan-form';
import {
    PLAN_AREAS,
    PLAN_NO_JAR,
    balanceOf,
    blankDraft,
    buildChain,
    draftFromPreset,
    hasRemainingWork,
    initialProgress,
    minorUnitsToInput,
    monthlyShareFor,
    nextStage,
    parseMinorUnits,
    planAreaByKey,
    planAreasOfScope,
    planMonthOf,
    presetsForArea,
    summarizeProgress,
} from './plan-year';

const COPY = {
    name: 'Name',
    doneWhen: 'Done when',
    firstStep: 'First step',
    rhythmName: 'Routine',
};
const JAR_ID = 'jar-lts';
const jarIdOf = (key: JarKey) => (key === JarKey.LONG_TERM_SAVINGS ? JAR_ID : null);
const CTX = { year: '2027', month: '2027-03' };

function presetDraft(key: string, id = key): PlanGoalDraft {
    const preset = coursePresetByKey(key)!;
    const area = PLAN_AREAS.find(
        candidate =>
            candidate.scope === preset.scope &&
            candidate.area === preset.area &&
            (!candidate.presetKeys || candidate.presetKeys.includes(key))
    )!;
    return draftFromPreset({ id, area, preset, copy: COPY, jarIdOf, canHaveAmount: true });
}

test('chips: two groups of five, every preset reachable through exactly one chip', () => {
    assert.equal(planAreasOfScope(CourseScope.PERSONAL).length, 5);
    assert.equal(planAreasOfScope(CourseScope.BUSINESS).length, 5);
    const reached = PLAN_AREAS.flatMap(area => presetsForArea(area, null).map(p => p.key));
    assert.equal(new Set(reached).size, reached.length);
    assert.equal(reached.length, 16);
});

test('chips: a chip filters presets by scope, area and the chip keys', () => {
    const keys = (area: string, situation: WorkSituation | null) =>
        presetsForArea(planAreaByKey(area as never), situation).map(preset => preset.key);
    assert.deepEqual(keys('health', null), ['run_10k', 'sleep_7h']);
    assert.deepEqual(keys('relationships', null), ['weekly_date', 'family_time']);
    assert.deepEqual(keys('meaning', null), ['gratitude_routine']);
    assert.deepEqual(keys('freedom', null), ['emergency_buffer', 'pay_off_debt', 'holiday']);
    assert.deepEqual(keys('income', null), ['raise_income']);
    assert.deepEqual(keys('balance', null), ['stop_at_18']);
});

test('chips: the work situation decides which business presets show', () => {
    const keys = (area: string, situation: WorkSituation) =>
        presetsForArea(planAreaByKey(area as never), situation).map(preset => preset.key);
    assert.deepEqual(keys('clients', WorkSituation.SELF_EMPLOYED), ['new_clients']);
    assert.deepEqual(keys('clients', WorkSituation.EMPLOYED), []);
    assert.deepEqual(keys('career', WorkSituation.EMPLOYED), ['promotion_raise']);
    assert.deepEqual(keys('career', WorkSituation.SEEKING), ['find_work']);
    assert.deepEqual(keys('career', WorkSituation.BOTH), ['promotion_raise']);
});

test('amounts: typed text becomes integer minor units without float maths', () => {
    assert.equal(parseMinorUnits('12'), 1200);
    assert.equal(parseMinorUnits('12,5'), 1250);
    assert.equal(parseMinorUnits('12.50'), 1250);
    assert.equal(parseMinorUnits('1.250'), 125000);
    assert.equal(parseMinorUnits('1.250,75'), 125075);
    assert.equal(parseMinorUnits('1 250'), 125000);
    assert.equal(parseMinorUnits('0,05'), 5);
    assert.equal(parseMinorUnits('19.99'), 1999);
    assert.equal(parseMinorUnits(''), null);
    assert.equal(parseMinorUnits('abc'), null);
    assert.equal(parseMinorUnits('-5'), null);
    assert.equal(parseMinorUnits('9'.repeat(30)), null);
    assert.equal(minorUnitsToInput(125000), '1250');
    assert.equal(minorUnitsToInput(1250), '12,50');
});

test('amounts: the monthly share runs from the plan month to December, rounded up', () => {
    assert.equal(monthlyShareFor(120000, '2027-01'), 10000);
    assert.equal(monthlyShareFor(100000, '2027-03'), 10000);
    assert.equal(monthlyShareFor(100001, '2027-03'), 10001);
    assert.equal(monthlyShareFor(5000, '2027-12'), 5000);
});

test('plan month: this month in the current year, January otherwise', () => {
    const now = new Date(2027, 5, 15);
    assert.equal(planMonthOf('2027', now), '2027-06');
    assert.equal(planMonthOf('2028', now), '2028-01');
});

test('drafts: a preset fills copy, scope, jar, amount switch and routine', () => {
    const buffer = presetDraft('emergency_buffer');
    assert.equal(buffer.name, 'Name');
    assert.equal(buffer.scope, CourseScope.PERSONAL);
    assert.equal(buffer.hasAmount, true);
    assert.equal(buffer.amountKind, GoalKind.SAVE);
    assert.equal(buffer.jarId, JAR_ID);
    assert.equal(buffer.routineOn, false);

    const run = presetDraft('run_10k');
    assert.equal(run.hasAmount, false);
    assert.equal(run.routineOn, true);
    assert.equal(run.routineKind, CourseRhythmKind.DISCIPLINE);
    assert.equal(run.routineCadence, CourseRhythmCadence.WEEKLY);
    assert.equal(run.routineTarget, '3');

    const income = presetDraft('raise_income');
    assert.equal(income.amountKind, GoalKind.EARN);
    assert.equal(income.jarId, PLAN_NO_JAR);

    const own = blankDraft({ id: 'own', area: planAreaByKey('skills') });
    assert.equal(own.presetKey, '');
    assert.equal(own.scope, CourseScope.BUSINESS);
    assert.equal(own.routineOn, false);
});

test('drafts: without the Money goals capability the amount switch starts off', () => {
    const preset = coursePresetByKey('holiday')!;
    const draft = draftFromPreset({
        id: 'h',
        area: planAreaByKey('freedom'),
        preset,
        copy: COPY,
        jarIdOf,
        canHaveAmount: false,
    });
    assert.equal(draft.hasAmount, false);
});

test('chain: a SAVE goal runs money, year, step and routine in that order', () => {
    const draft = { ...presetDraft('holiday'), amount: '1.200', routineOn: true };
    const chain = buildChain({ ...draft, routineName: 'Put money aside' }, CTX);
    assert.deepEqual(chain.money, {
        kind: GoalKind.SAVE,
        jarId: JAR_ID,
        name: 'Name',
        icon: null,
        target: 120000,
        monthlyContribution: 12000,
        targetOn: '2027-12-31',
        status: GoalStatus.ACTIVE,
        why: null,
    });
    assert.deepEqual(chain.year, {
        name: 'Name',
        doneWhen: 'Done when',
        scope: CourseScope.PERSONAL,
    });
    assert.deepEqual(chain.step, { name: 'First step', month: '2027-03' });
    assert.equal(chain.routine?.name, 'Put money aside');
});

test('chain: an EARN goal has a monthly target, no jar and no contribution', () => {
    const chain = buildChain({ ...presetDraft('raise_income'), amount: '5000' }, CTX);
    assert.equal(chain.money?.kind, GoalKind.EARN);
    assert.equal(chain.money?.jarId, null);
    assert.equal(chain.money?.target, 500000);
    assert.equal(chain.money?.monthlyContribution, 0);
});

test('chain: no amount, no step and no routine leave only the year goal', () => {
    const draft = {
        ...blankDraft({ id: 'own', area: planAreaByKey('learning') }),
        name: '  Learn piano ',
    };
    const chain = buildChain(draft, CTX);
    assert.equal(chain.money, null);
    assert.equal(chain.step, null);
    assert.equal(chain.routine, null);
    assert.deepEqual(chain.year, {
        name: 'Learn piano',
        doneWhen: null,
        scope: CourseScope.PERSONAL,
    });
    assert.deepEqual(initialProgress(chain).stages, {
        money: 'skipped',
        year: 'pending',
        step: 'skipped',
        routine: 'skipped',
    });
});

test('chain: a habit is stored daily with target 1, whatever was typed', () => {
    const draft = {
        ...presetDraft('sleep_7h'),
        routineKind: CourseRhythmKind.HABIT,
        routineCadence: CourseRhythmCadence.WEEKLY,
        routineTarget: '4',
    };
    const routine = buildChain(draft, CTX).routine!;
    assert.equal(routine.cadence, CourseRhythmCadence.DAILY);
    assert.equal(routine.target, 1);
});

test('chain: switching the routine off drops it', () => {
    const chain = buildChain({ ...presetDraft('run_10k'), routineOn: false }, CTX);
    assert.equal(chain.routine, null);
});

test('progress: stages wait for the year goal, retry what failed, never retry the amount', () => {
    const chain = buildChain(
        { ...presetDraft('holiday'), amount: '600', routineOn: true, routineName: 'R' },
        CTX
    );
    const progress = initialProgress(chain);
    assert.equal(nextStage(progress), 'money');

    // The amount fails: the goal is kept, the amount is not retried.
    progress.stages.money = 'failed';
    progress.moneyError = 'limit';
    assert.equal(nextStage(progress), 'year');

    // The year goal fails: retried, and step / routine do not run before it.
    progress.stages.year = 'failed';
    assert.equal(nextStage(progress), 'year');

    progress.stages.year = 'done';
    progress.yearItemId = 'y1';
    assert.equal(nextStage(progress), 'step');
    progress.stages.step = 'done';
    assert.equal(nextStage(progress), 'routine');
    progress.stages.routine = 'failed';
    assert.equal(nextStage(progress), 'routine');
    progress.stages.routine = 'done';
    assert.equal(nextStage(progress), null);
    assert.equal(hasRemainingWork([progress]), false);
    assert.deepEqual(summarizeProgress([progress]), {
        goalsSaved: 1,
        goalsOpen: 0,
        amountsMissed: 1,
    });
});

test('progress: a step is blocked while there is no year goal', () => {
    const progress = initialProgress(buildChain(presetDraft('run_10k'), CTX));
    progress.stages.year = 'done';
    // Year marked done without an id cannot happen, but the guard holds.
    assert.equal(nextStage(progress), null);
});

test('balance: information about one-sided plans, never a rule', () => {
    const personal = { scope: CourseScope.PERSONAL };
    const business = { scope: CourseScope.BUSINESS };
    assert.deepEqual(balanceOf([]), { personal: 0, business: 0, missing: null });
    assert.deepEqual(balanceOf([business, business, business, business, business]), {
        personal: 0,
        business: 5,
        missing: CourseScope.PERSONAL,
    });
    assert.deepEqual(balanceOf([personal]), {
        personal: 1,
        business: 0,
        missing: CourseScope.BUSINESS,
    });
    assert.equal(balanceOf([personal, business]).missing, null);
});

test('schema: name, amount, jar and routine target are checked', () => {
    const schema = createPlanFormSchema(code => code);
    const base = presetDraft('holiday');
    const values = (goal: PlanGoalDraft) => ({
        workSituation: null,
        yearIntention: null,
        areas: ['freedom' as const],
        goals: [goal],
    });
    const issues = (goal: PlanGoalDraft) => {
        const result = schema.safeParse(values(goal));
        return result.success ? [] : result.error.issues.map(issue => issue.message);
    };

    assert.deepEqual(issues({ ...base, amount: '800' }), []);
    assert.deepEqual(issues({ ...base, name: '  ', amount: '800' }), ['name_required']);
    assert.deepEqual(issues({ ...base, amount: '' }), ['amount_invalid']);
    assert.deepEqual(issues({ ...base, amount: '0' }), ['amount_invalid']);
    assert.deepEqual(issues({ ...base, amount: '800', jarId: PLAN_NO_JAR }), ['jar_required']);
    assert.deepEqual(issues({ ...base, hasAmount: false, amount: '' }), []);

    const run = presetDraft('run_10k');
    assert.deepEqual(issues(run), []);
    assert.deepEqual(issues({ ...run, routineTarget: '9' }), ['target_invalid']);
    assert.deepEqual(issues({ ...run, routineName: '' }), ['routine_name_required']);
    assert.deepEqual(
        issues({ ...run, routineOn: false, routineTarget: '99', routineName: '' }),
        []
    );
});
