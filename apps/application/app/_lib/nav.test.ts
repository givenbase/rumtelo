import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { HouseholdRole } from '@rumtelo/contracts';

import {
    activeMoneySubnavKey,
    activeMoreRowKey,
    activeTabForPath,
    buildNav,
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
        now: new Date('2026-11-18T10:00:00Z'),
        ...overrides,
    };
}

/** `kind` or `kind:key` for each More row, in order. */
function describeRows(nav: ReturnType<typeof buildNav>): string[] {
    return nav.moreRows.map(row => {
        if (row.kind === 'link') return row.key;
        if (row.kind === 'plan_gains') return `plan_gains:${row.plan.toLowerCase()}`;
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
