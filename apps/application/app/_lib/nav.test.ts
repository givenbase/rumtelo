import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { BoardStage, HouseholdRole } from '@rumtelo/contracts';

import {
    activeMoneySubnavKey,
    activeMoreRowKey,
    activeTabForPath,
    buildNav,
    nextVisibleStage,
    stageAdditions,
    type NavContext,
} from './nav';
import { hasCapability, PlanKey } from './plan';

const env = process.env as Record<string, string | undefined>;
const originalEnv = env.NODE_ENV;
afterEach(() => {
    env.NODE_ENV = originalEnv;
});

const FULL_PREVIEW = { active: false, showCoachNav: true, showSettings: true, showPageHelp: true };

function ctx(overrides: Partial<NavContext> = {}): NavContext {
    const plan = overrides.plan ?? PlanKey.PLUS;
    return {
        role: HouseholdRole.OWNER,
        membershipKnown: true,
        plan,
        planReady: true,
        has: key => hasCapability(key, plan),
        preview: FULL_PREVIEW,
        isPracticeStaff: false,
        settingsHref: '/settings',
        // The full board unless a test walks the ladder.
        stage: BoardStage.MONTH,
        stageReady: true,
        hasClosedMonth: false,
        now: new Date('2026-11-18T10:00:00Z'),
        ...overrides,
    };
}

/** `kind` or `kind:key` for each More row, in order. */
function describeRows(nav: ReturnType<typeof buildNav>): string[] {
    return nav.moreRows.map(row => {
        if (row.kind === 'link') return row.key;
        if (row.kind === 'plan_gains') return `plan_gains:${row.plan.toLowerCase()}`;
        if (row.kind === 'coming_up') return `coming_up:${row.stage.toLowerCase()}`;
        return row.kind;
    });
}

test('Plus OWNER: Home · Money · Growth · More, four Money sections, Growth opens on Course', () => {
    env.NODE_ENV = 'production';
    const nav = buildNav(ctx({ plan: PlanKey.PLUS }));
    assert.deepEqual(
        nav.tabs.map(tab => tab.key),
        ['home', 'money', 'growth', 'more']
    );
    assert.equal(nav.tabs.find(tab => tab.key === 'growth')?.href, '/product/growth/course');
    assert.equal(nav.tabs.find(tab => tab.key === 'more')?.href, null);
    assert.deepEqual(
        nav.moneySubnav.map(item => item.key),
        ['jars', 'inbox', 'fixed_costs', 'income']
    );
    assert.equal(nav.moneySubnav.find(item => item.key === 'inbox')?.badge, 'inbox');
    assert.deepEqual(describeRows(nav), [
        'debt',
        'learn',
        'plan_gains:max',
        'coach',
        'why',
        'settings',
        'help',
    ]);
});

test('Basic OWNER: one "More with Plus" row, no faded Debt, Learn or Course rows', () => {
    env.NODE_ENV = 'production';
    const nav = buildNav(ctx({ plan: PlanKey.BASIC }));
    assert.deepEqual(describeRows(nav), ['plan_gains:plus', 'coach', 'why', 'settings', 'help']);
    // Growth opens on the 1-goal list, not on a Course lock wall.
    assert.equal(nav.tabs.find(tab => tab.key === 'growth')?.href, '/product/growth/goals');
});

test('Max OWNER sees Net worth in More and no upgrade row', () => {
    env.NODE_ENV = 'production';
    const nav = buildNav(ctx({ plan: PlanKey.MAX }));
    assert.deepEqual(describeRows(nav), [
        'debt',
        'net_worth',
        'learn',
        'coach',
        'why',
        'settings',
        'help',
    ]);
});

test('MEMBER gets the upgrade row; an unknown membership does not (fail closed)', () => {
    env.NODE_ENV = 'production';
    const member = buildNav(ctx({ plan: PlanKey.BASIC, role: HouseholdRole.MEMBER }));
    assert.ok(describeRows(member).includes('plan_gains:plus'));
    const unknown = buildNav(ctx({ plan: PlanKey.BASIC, membershipKnown: false }));
    assert.ok(!describeRows(unknown).some(row => row.startsWith('plan_gains')));
});

test('VIEWER: no Growth tab, no Income, no Coach, no upgrade rows; keeps Debt and Net worth on Max', () => {
    env.NODE_ENV = 'production';
    const nav = buildNav(ctx({ plan: PlanKey.MAX, role: HouseholdRole.VIEWER }));
    assert.deepEqual(
        nav.tabs.map(tab => tab.key),
        ['home', 'money', 'more']
    );
    assert.deepEqual(
        nav.moneySubnav.map(item => item.key),
        ['jars', 'inbox', 'fixed_costs']
    );
    assert.deepEqual(describeRows(nav), ['debt', 'net_worth', 'why', 'settings']);
    const viewerBasic = buildNav(ctx({ plan: PlanKey.BASIC, role: HouseholdRole.VIEWER }));
    assert.ok(!describeRows(viewerBasic).some(row => row.startsWith('plan_gains')));
});

test('Practice preview: Back to practice first; no Settings, Help, upgrade rows or Coach', () => {
    env.NODE_ENV = 'production';
    const nav = buildNav(
        ctx({
            plan: PlanKey.BASIC,
            role: HouseholdRole.VIEWER,
            membershipKnown: false,
            isPracticeStaff: true,
            preview: {
                active: true,
                showCoachNav: false,
                showSettings: false,
                showPageHelp: false,
            },
        })
    );
    assert.equal(nav.moreRows[0]?.kind, 'exit_preview');
    assert.deepEqual(describeRows(nav), ['exit_preview']);
});

test('"Go to practice" shows only for practice staff outside a preview', () => {
    env.NODE_ENV = 'production';
    assert.ok(describeRows(buildNav(ctx({ isPracticeStaff: true }))).includes('practice'));
    assert.ok(!describeRows(buildNav(ctx({ isPracticeStaff: false }))).includes('practice'));
});

test('production never lists Energy or Soul (rows or search); staging lists them as Preview', () => {
    env.NODE_ENV = 'production';
    const prod = buildNav(ctx());
    assert.ok(!describeRows(prod).includes('energy'));
    assert.ok(!describeRows(prod).includes('soul'));
    assert.ok(
        !prod.searchable.some(item => item.href.includes('/energy') || item.href.includes('/soul'))
    );

    env.NODE_ENV = 'development';
    const staging = buildNav(ctx());
    const preview = staging.moreRows.filter(
        row => row.kind === 'link' && row.badgeKey === 'preview'
    );
    assert.deepEqual(
        preview.map(row => (row.kind === 'link' ? row.key : null)),
        ['energy', 'soul']
    );
});

test('while the plan loads: Growth links to the redirect and no plan-dependent rows appear', () => {
    env.NODE_ENV = 'production';
    const nav = buildNav(ctx({ planReady: false, plan: PlanKey.BASIC }));
    assert.equal(nav.tabs.find(tab => tab.key === 'growth')?.href, '/product/growth');
    assert.deepEqual(describeRows(nav), ['coach', 'why', 'settings', 'help']);
});

test('Quick add search covers Money sections, Course tabs and More rows', () => {
    env.NODE_ENV = 'production';
    const plus = new Set(
        buildNav(ctx({ plan: PlanKey.PLUS })).searchable.map(item => item.labelKey)
    );
    assert.ok(plus.has('pages.nav.children.inbox'));
    assert.ok(plus.has('pages.nav.search.course_today'));
    assert.ok(plus.has('pages.nav.search.course_week'));
    assert.ok(plus.has('pages.nav.search.course_goals'));
    assert.ok(plus.has('pages.nav.children.debt'));
    const basic = new Set(
        buildNav(ctx({ plan: PlanKey.BASIC })).searchable.map(item => item.labelKey)
    );
    assert.ok(!basic.has('pages.nav.search.course_today'));
    assert.ok(!basic.has('pages.nav.children.debt'));
    assert.ok(basic.has('pages.nav.children.goals'));
});

test('the active tab follows the page: More owns Debt, Net worth, Learn, Coach, Why, Settings', () => {
    assert.equal(activeTabForPath('/'), 'home');
    assert.equal(activeTabForPath('/product/money'), 'money');
    assert.equal(activeTabForPath('/product/money/income/create'), 'money');
    assert.equal(activeTabForPath('/product/money/week-check'), 'money');
    assert.equal(activeTabForPath('/product/growth/course/2026-W47'), 'growth');
    for (const path of [
        '/product/money/debt',
        '/product/money/net-worth/create',
        '/product/growth/learn',
        '/product/coach',
        '/product/why',
        '/settings/general/plan',
    ]) {
        assert.equal(activeTabForPath(path), 'more', path);
    }
    assert.equal(activeMoreRowKey('/product/money/debt'), 'debt');
    assert.equal(activeMoreRowKey('/product/money'), null);
});

test('the active Money section: Jars by default, then Inbox, Fixed costs, Income', () => {
    assert.equal(activeMoneySubnavKey('/product/money'), 'jars');
    assert.equal(activeMoneySubnavKey('/product/money/jars/NECESSITIES'), 'jars');
    assert.equal(activeMoneySubnavKey('/product/money/transactions/create'), 'inbox');
    assert.equal(activeMoneySubnavKey('/product/money/fixed-costs'), 'fixed_costs');
    assert.equal(activeMoneySubnavKey('/product/money/income'), 'income');
});

// ── The board ladder (Clarity 3) ─────────────────────────────────────────────

const WEEK_ONE_STAGES = [BoardStage.SPLIT, BoardStage.SORTING];

test('Basic OWNER at SPLIT and SORTING: Home · Money · More; More is Why, Settings, Help, Coming up', () => {
    env.NODE_ENV = 'production';
    for (const stage of WEEK_ONE_STAGES) {
        const nav = buildNav(ctx({ plan: PlanKey.BASIC, stage }));
        assert.deepEqual(
            nav.tabs.map(tab => tab.key),
            ['home', 'money', 'more']
        );
        assert.deepEqual(
            nav.moneySubnav.map(item => item.key),
            ['jars', 'inbox', 'fixed_costs', 'income']
        );
        // No upgrade row and no Coach in week 1; Coming up points at the first stage that adds.
        assert.deepEqual(describeRows(nav), ['why', 'settings', 'help', 'coming_up:routine']);
    }
});

test('Basic OWNER at ROUTINE: Growth, The Coach and More with Plus arrive; Coming up points at the month', () => {
    env.NODE_ENV = 'production';
    const nav = buildNav(ctx({ plan: PlanKey.BASIC, stage: BoardStage.ROUTINE }));
    assert.deepEqual(
        nav.tabs.map(tab => tab.key),
        ['home', 'money', 'growth', 'more']
    );
    assert.deepEqual(describeRows(nav), [
        'plan_gains:plus',
        'coach',
        'why',
        'settings',
        'help',
        'coming_up:month',
    ]);
});

test('Basic OWNER at MONTH: no Coming up; Debt, Net worth and Learn stay absent (plan)', () => {
    env.NODE_ENV = 'production';
    const nav = buildNav(ctx({ plan: PlanKey.BASIC, stage: BoardStage.MONTH }));
    assert.deepEqual(describeRows(nav), ['plan_gains:plus', 'coach', 'why', 'settings', 'help']);
});

test('Plus OWNER at SPLIT: Debt and Learn wait; at ROUTINE Growth, Coach and More with Max; at MONTH Debt and Learn', () => {
    env.NODE_ENV = 'production';
    const split = buildNav(ctx({ plan: PlanKey.PLUS, stage: BoardStage.SPLIT }));
    assert.deepEqual(
        split.tabs.map(tab => tab.key),
        ['home', 'money', 'more']
    );
    assert.deepEqual(describeRows(split), ['why', 'settings', 'help', 'coming_up:routine']);
    const routine = buildNav(ctx({ plan: PlanKey.PLUS, stage: BoardStage.ROUTINE }));
    assert.deepEqual(describeRows(routine), [
        'plan_gains:max',
        'coach',
        'why',
        'settings',
        'help',
        'coming_up:month',
    ]);
    assert.equal(routine.tabs.find(tab => tab.key === 'growth')?.href, '/product/growth/course');
    const month = buildNav(ctx({ plan: PlanKey.PLUS, stage: BoardStage.MONTH }));
    assert.deepEqual(describeRows(month), [
        'debt',
        'learn',
        'plan_gains:max',
        'coach',
        'why',
        'settings',
        'help',
    ]);
});

test('Basic at ROUTINE after a closed month: nothing is left to add, so no Coming up row', () => {
    env.NODE_ENV = 'production';
    const nav = buildNav(
        ctx({ plan: PlanKey.BASIC, stage: BoardStage.ROUTINE, hasClosedMonth: true })
    );
    assert.ok(!describeRows(nav).some(row => row.startsWith('coming_up')));
});

test('VIEWER and MEMBER: stage applies, Coming up only for writers', () => {
    env.NODE_ENV = 'production';
    const viewer = buildNav(
        ctx({ plan: PlanKey.MAX, role: HouseholdRole.VIEWER, stage: BoardStage.SPLIT })
    );
    assert.deepEqual(describeRows(viewer), ['why', 'settings']);
    const viewerMonth = buildNav(
        ctx({ plan: PlanKey.MAX, role: HouseholdRole.VIEWER, stage: BoardStage.MONTH })
    );
    assert.deepEqual(describeRows(viewerMonth), ['debt', 'net_worth', 'why', 'settings']);
    const member = buildNav(
        ctx({ plan: PlanKey.BASIC, role: HouseholdRole.MEMBER, stage: BoardStage.SPLIT })
    );
    assert.ok(describeRows(member).includes('coming_up:routine'));
});

test('Practice preview and an unknown membership never get Coming up', () => {
    env.NODE_ENV = 'production';
    const preview = buildNav(
        ctx({
            plan: PlanKey.BASIC,
            stage: BoardStage.SPLIT,
            preview: { ...FULL_PREVIEW, active: true },
        })
    );
    assert.ok(!describeRows(preview).some(row => row.startsWith('coming_up')));
    const unknown = buildNav(
        ctx({ plan: PlanKey.BASIC, stage: BoardStage.SPLIT, membershipKnown: false })
    );
    assert.ok(!describeRows(unknown).some(row => row.startsWith('coming_up')));
});

test('while the stage loads: the Growth slot is reserved (pending), no Coming up yet', () => {
    env.NODE_ENV = 'production';
    const nav = buildNav(ctx({ plan: PlanKey.BASIC, stageReady: false }));
    const growth = nav.tabs.find(tab => tab.key === 'growth');
    assert.equal(growth?.pending, true);
    assert.ok(!describeRows(nav).some(row => row.startsWith('coming_up')));
    const ready = buildNav(ctx({ plan: PlanKey.BASIC, stage: BoardStage.ROUTINE }));
    assert.equal(ready.tabs.find(tab => tab.key === 'growth')?.pending, undefined);
    // A VIEWER has no Growth tab, so nothing is reserved.
    const viewer = buildNav(ctx({ role: HouseholdRole.VIEWER, stageReady: false }));
    assert.ok(!viewer.tabs.some(tab => tab.key === 'growth'));
});

test('stageAdditions and nextVisibleStage follow the menu on this plan and role', () => {
    env.NODE_ENV = 'production';
    const basic = ctx({ plan: PlanKey.BASIC, stage: BoardStage.SPLIT });
    assert.deepEqual(stageAdditions(basic, BoardStage.SPLIT, BoardStage.SORTING), []);
    assert.deepEqual(stageAdditions(basic, BoardStage.SPLIT, BoardStage.ROUTINE), [
        { kind: 'nav', key: 'goals' },
        { kind: 'nav', key: 'coach' },
    ]);
    assert.deepEqual(stageAdditions(basic, BoardStage.ROUTINE, BoardStage.MONTH), [
        { kind: 'levels' },
    ]);
    // SORTING adds nothing, so the next visible stage skips it.
    assert.equal(nextVisibleStage(basic)?.stage, BoardStage.ROUTINE);
    const plus = ctx({ plan: PlanKey.PLUS, stage: BoardStage.SPLIT });
    assert.deepEqual(stageAdditions(plus, BoardStage.SPLIT, BoardStage.ROUTINE), [
        { kind: 'nav', key: 'course' },
        { kind: 'nav', key: 'coach' },
    ]);
    assert.deepEqual(stageAdditions(plus, BoardStage.ROUTINE, BoardStage.MONTH), [
        { kind: 'nav', key: 'debt' },
        { kind: 'nav', key: 'learn' },
        { kind: 'levels' },
    ]);
    assert.equal(nextVisibleStage(ctx({ stage: BoardStage.MONTH })), null);
});

test('"More with Plus" is never announced as something coming up', () => {
    env.NODE_ENV = 'production';
    const all = stageAdditions(ctx({ plan: PlanKey.BASIC }), BoardStage.SPLIT, BoardStage.MONTH);
    assert.ok(all.every(item => item.kind === 'levels' || item.key !== ('plan_gains' as never)));
    assert.ok(all.length > 0);
});

test('deferred pages stay findable in search with what brings them up front', () => {
    env.NODE_ENV = 'production';
    const nav = buildNav(ctx({ plan: PlanKey.PLUS, stage: BoardStage.SPLIT }));
    const byHref = new Map(nav.searchable.map(item => [item.href, item]));
    assert.equal(byHref.get('/product/money/debt')?.deferredUntil, 'month_close');
    assert.equal(byHref.get('/product/coach')?.deferredUntil, 'week_check');
    assert.equal(byHref.get('/product/growth/course')?.deferredUntil, 'week_check');
    assert.equal(byHref.get('/product/money')?.deferredUntil, undefined);
    const routine = buildNav(ctx({ plan: PlanKey.PLUS, stage: BoardStage.ROUTINE }));
    assert.equal(
        routine.searchable.find(item => item.href === '/product/money/debt')?.deferredUntil,
        'month_close'
    );
    assert.equal(
        routine.searchable.find(item => item.href === '/product/coach')?.deferredUntil,
        undefined
    );
    // At MONTH nothing is deferred; a plan-locked page is never offered.
    const month = buildNav(ctx({ plan: PlanKey.BASIC, stage: BoardStage.MONTH }));
    assert.ok(month.searchable.every(item => item.deferredUntil === undefined));
    assert.ok(!month.searchable.some(item => item.href === '/product/money/debt'));
    const basicSplit = buildNav(ctx({ plan: PlanKey.BASIC, stage: BoardStage.SPLIT }));
    assert.ok(!basicSplit.searchable.some(item => item.href === '/product/money/debt'));
});

test('production never lists Energy or Soul at any stage', () => {
    env.NODE_ENV = 'production';
    for (const stage of [BoardStage.SPLIT, BoardStage.ROUTINE, BoardStage.MONTH]) {
        const nav = buildNav(ctx({ plan: PlanKey.MAX, stage }));
        assert.ok(!describeRows(nav).includes('energy'));
        assert.ok(!describeRows(nav).includes('soul'));
    }
});
