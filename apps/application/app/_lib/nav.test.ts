import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { BoardStage, HouseholdRole } from '@rumtelo/contracts';

import {
    activeGrowthSubnavKey,
    activeMoneySubnavKey,
    activeSoulSubnavKey,
    activeTabForPath,
    activeYouRowKey,
    buildNav,
    nextVisibleStage,
    stageAdditions,
    type NavContext,
    type SubnavItem,
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

/** `key` or `key:state[:until]` for each subnav item, in order. */
function describeSubnav(items: readonly SubnavItem[]): string[] {
    return items.map(item => {
        if (item.state === 'open') return item.key;
        if (item.state === 'later') return `${item.key}:later:${item.laterUntil}`;
        return `${item.key}:locked`;
    });
}

/** `kind` or `key` for each You row, in order. */
function describeYou(nav: ReturnType<typeof buildNav>): string[] {
    return nav.youRows.map(row => {
        if (row.kind === 'link') return row.key;
        if (row.kind === 'coming_up') return `coming_up:${row.stage.toLowerCase()}`;
        return row.kind;
    });
}

const tabKeys = (nav: ReturnType<typeof buildNav>) => nav.tabs.map(tab => tab.key);

test("Plus OWNER: Home · Money · Growth · Soul · You; the Soul tab opens Where you're going, then Learn", () => {
    env.NODE_ENV = 'production';
    const nav = buildNav(ctx({ plan: PlanKey.PLUS }));
    assert.deepEqual(tabKeys(nav), ['home', 'money', 'growth', 'soul', 'you']);
    assert.equal(nav.tabs.find(tab => tab.key === 'growth')?.href, '/product/growth/course');
    // The tab opens "Where you're going" directly: the Soul overview is deferred in production.
    assert.equal(nav.tabs.find(tab => tab.key === 'soul')?.href, '/product/direction');
    assert.equal(nav.tabs.find(tab => tab.key === 'you')?.href, null);
    assert.deepEqual(describeSubnav(nav.moneySubnav), [
        'income',
        'jars',
        'fixed_costs',
        'transactions',
        'debt',
        'net_worth:locked',
    ]);
    assert.equal(nav.moneySubnav.find(item => item.key === 'transactions')?.badge, 'to_sort');
    assert.deepEqual(describeSubnav(nav.growthSubnav), ['course']);
    assert.deepEqual(describeSubnav(nav.soulSubnav), ['direction', 'learn']);
    assert.equal(nav.soulSubnav[0]?.href, '/product/direction');
    assert.equal(nav.soulSubnav[0]?.labelKey, 'pages.nav.children.direction');
    // No product feature and no upgrade row in You.
    assert.deepEqual(describeYou(nav), ['coach', 'why', 'settings', 'help']);
});

test('the label of the transactions page is literal: Transactions, not Inbox', () => {
    env.NODE_ENV = 'production';
    const nav = buildNav(ctx());
    assert.equal(
        nav.moneySubnav.find(item => item.key === 'transactions')?.labelKey,
        'pages.nav.children.transactions'
    );
});

test('Basic OWNER: Course and the paid Money pages show a lock; Goals is the landing page', () => {
    env.NODE_ENV = 'production';
    const nav = buildNav(ctx({ plan: PlanKey.BASIC }));
    assert.equal(nav.tabs.find(tab => tab.key === 'growth')?.href, '/product/growth/goals');
    assert.deepEqual(describeSubnav(nav.moneySubnav), [
        'income',
        'jars',
        'fixed_costs',
        'transactions',
        'debt:locked',
        'net_worth:locked',
    ]);
    assert.deepEqual(describeSubnav(nav.growthSubnav), ['goals']);
    // Direction needs no plan and comes first; Learn keeps its plan lock under the Soul tab.
    assert.deepEqual(describeSubnav(nav.soulSubnav), ['direction', 'learn:locked']);
    assert.equal(nav.tabs.find(tab => tab.key === 'soul')?.href, '/product/direction');
    // Locks still link to the page, which renders the LockCard.
    assert.equal(nav.moneySubnav.find(item => item.key === 'debt')?.href, '/product/money/debt');
    assert.deepEqual(describeYou(nav), ['coach', 'why', 'settings', 'help']);
});

test('Max OWNER: every Money and Growth page is open, no locks', () => {
    env.NODE_ENV = 'production';
    const nav = buildNav(ctx({ plan: PlanKey.MAX }));
    assert.deepEqual(describeSubnav(nav.moneySubnav), [
        'income',
        'jars',
        'fixed_costs',
        'transactions',
        'debt',
        'net_worth',
    ]);
    assert.deepEqual(describeSubnav(nav.growthSubnav), ['course']);
    assert.deepEqual(describeSubnav(nav.soulSubnav), ['direction', 'learn']);
});

test('locks are an upgrade path: MEMBER sees them, an unknown membership and a VIEWER do not', () => {
    env.NODE_ENV = 'production';
    const member = buildNav(ctx({ plan: PlanKey.BASIC, role: HouseholdRole.MEMBER }));
    assert.ok(describeSubnav(member.moneySubnav).includes('debt:locked'));
    const unknown = buildNav(ctx({ plan: PlanKey.BASIC, membershipKnown: false }));
    assert.ok(!describeSubnav(unknown.moneySubnav).some(item => item.endsWith(':locked')));
    assert.ok(!describeSubnav(unknown.growthSubnav).some(item => item.endsWith(':locked')));
    assert.ok(!describeSubnav(unknown.soulSubnav).some(item => item.endsWith(':locked')));
    // The Soul tab no longer waits for Learn: Direction needs neither plan nor membership.
    assert.deepEqual(describeSubnav(unknown.soulSubnav), ['direction']);
    assert.ok(tabKeys(unknown).includes('soul'));
});

test('VIEWER: no Growth tab, no Income, no Coach, no locks; the Soul tab holds only their own Direction', () => {
    env.NODE_ENV = 'production';
    const nav = buildNav(ctx({ plan: PlanKey.MAX, role: HouseholdRole.VIEWER }));
    // Direction is the person's own account text; a VIEWER may read Home, which is its gate.
    assert.deepEqual(tabKeys(nav), ['home', 'money', 'soul', 'you']);
    assert.equal(nav.tabs.find(tab => tab.key === 'soul')?.href, '/product/direction');
    assert.deepEqual(describeSubnav(nav.moneySubnav), [
        'jars',
        'fixed_costs',
        'transactions',
        'debt',
        'net_worth',
    ]);
    assert.deepEqual(nav.growthSubnav, []);
    assert.deepEqual(describeSubnav(nav.soulSubnav), ['direction']);
    assert.deepEqual(describeYou(nav), ['why', 'settings']);
    const viewerBasic = buildNav(ctx({ plan: PlanKey.BASIC, role: HouseholdRole.VIEWER }));
    assert.ok(!describeSubnav(viewerBasic.moneySubnav).some(item => item.endsWith(':locked')));
});

test('Practice preview: Back to practice first; no Settings, Help, Coach or locks', () => {
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
    assert.equal(nav.youRows[0]?.kind, 'exit_preview');
    assert.deepEqual(describeYou(nav), ['exit_preview']);
    // The coach's own direction is never part of a client's board.
    assert.ok(!describeSubnav(nav.soulSubnav).includes('direction'));
    assert.ok(!tabKeys(nav).includes('soul'));
    const previewPlus = buildNav(
        ctx({ plan: PlanKey.PLUS, preview: { ...FULL_PREVIEW, active: true } })
    );
    assert.ok(!describeSubnav(previewPlus.soulSubnav).includes('direction'));
    assert.ok(!previewPlus.searchable.some(item => item.href === '/product/direction'));
    assert.ok(!describeSubnav(nav.moneySubnav).some(item => item.endsWith(':locked')));
});

test('"Go to practice" shows only for practice staff outside a preview', () => {
    env.NODE_ENV = 'production';
    assert.deepEqual(describeYou(buildNav(ctx({ isPracticeStaff: true }))), [
        'coach',
        'why',
        'settings',
        'help',
        'practice',
    ]);
    assert.ok(!describeYou(buildNav(ctx({ isPracticeStaff: false }))).includes('practice'));
});

test('production never lists Energy or the Soul pages (You or search); staging lists Energy and the Soul pages under Preview', () => {
    env.NODE_ENV = 'production';
    const prod = buildNav(ctx());
    assert.ok(!describeYou(prod).includes('energy'));
    assert.ok(
        !prod.searchable.some(item => item.href.includes('/energy') || item.href.includes('/soul'))
    );
    // Direction and Learn are the Soul-tab pages that ship: findable, Learn still under its Growth URL.
    assert.ok(prod.searchable.some(item => item.href === '/product/growth/learn'));
    assert.ok(prod.searchable.some(item => item.href === '/product/direction'));

    env.NODE_ENV = 'development';
    const staging = buildNav(ctx());
    const preview = staging.youRows.filter(
        row => row.kind === 'link' && row.badgeKey === 'preview'
    );
    assert.deepEqual(
        preview.map(row => (row.kind === 'link' ? row.key : null)),
        ['energy', 'soul']
    );
    // The Mindset tab opens Direction then Learn, here too; the other Soul pages are a preview row in You.
    assert.deepEqual(tabKeys(staging), ['home', 'money', 'growth', 'soul', 'you']);
    assert.equal(staging.tabs.find(tab => tab.key === 'soul')?.href, '/product/direction');
    assert.deepEqual(describeSubnav(staging.soulSubnav), ['direction', 'learn']);
    assert.ok(!staging.searchable.some(item => item.href === '/product/soul/stillness'));
});

test('while the plan loads: Growth links to the redirect and nothing plan-dependent appears', () => {
    env.NODE_ENV = 'production';
    const nav = buildNav(ctx({ planReady: false, plan: PlanKey.BASIC }));
    assert.equal(nav.tabs.find(tab => tab.key === 'growth')?.href, '/product/growth');
    assert.deepEqual(describeSubnav(nav.moneySubnav), [
        'income',
        'jars',
        'fixed_costs',
        'transactions',
    ]);
    assert.deepEqual(nav.growthSubnav, []);
    assert.deepEqual(describeYou(nav), ['coach', 'why', 'settings', 'help']);
});

test('Quick add search covers Money pages, Course tabs, Learn and You rows', () => {
    env.NODE_ENV = 'production';
    const plus = new Set(
        buildNav(ctx({ plan: PlanKey.PLUS })).searchable.map(item => item.labelKey)
    );
    assert.ok(plus.has('pages.nav.children.transactions'));
    assert.ok(plus.has('pages.nav.search.course_today'));
    assert.ok(plus.has('pages.nav.search.course_week'));
    assert.ok(plus.has('pages.nav.search.course_goals'));
    assert.ok(plus.has('pages.nav.children.debt'));
    assert.ok(plus.has('pages.nav.children.learn'));
    assert.ok(plus.has('pages.nav.children.direction'));
    assert.ok(plus.has('pages.nav.children.coach'));
    assert.ok(!plus.has('pages.nav.children.stillness'));
    const basic = new Set(
        buildNav(ctx({ plan: PlanKey.BASIC })).searchable.map(item => item.labelKey)
    );
    assert.ok(!basic.has('pages.nav.search.course_today'));
    assert.ok(!basic.has('pages.nav.children.debt'));
    assert.ok(!basic.has('pages.nav.children.learn'));
    assert.ok(basic.has('pages.nav.children.direction'));
    assert.ok(basic.has('pages.nav.children.goals'));
});

test('the active tab follows the product: Debt is Money, Learn is Soul, You owns Coach, Why, Settings', () => {
    assert.equal(activeTabForPath('/'), 'home');
    assert.equal(activeTabForPath('/product/money'), 'money');
    assert.equal(activeTabForPath('/product/money/income/create'), 'money');
    assert.equal(activeTabForPath('/product/money/week-check'), 'money');
    assert.equal(activeTabForPath('/product/money/debt'), 'money');
    assert.equal(activeTabForPath('/product/money/net-worth/create'), 'money');
    assert.equal(activeTabForPath('/product/growth/net-worth'), 'money');
    assert.equal(activeTabForPath('/product/growth/course/2026-W47'), 'growth');
    assert.equal(activeTabForPath('/product/growth/learn'), 'soul');
    assert.equal(activeTabForPath('/product/growth/learn/library'), 'soul');
    assert.equal(activeTabForPath('/product/direction'), 'soul');
    assert.equal(activeTabForPath('/product/soul'), 'soul');
    assert.equal(activeTabForPath('/product/soul/stillness'), 'soul');
    for (const path of [
        '/product/coach',
        '/product/why',
        '/settings/general/plan',
        '/product/energy',
    ]) {
        assert.equal(activeTabForPath(path), 'you', path);
    }
    assert.equal(activeYouRowKey('/product/coach'), 'coach');
    assert.equal(activeYouRowKey('/product/money/debt'), null);
});

test('the active Money page: Jars by default, then Transactions, Fixed costs, Income, Debt, Net worth', () => {
    assert.equal(activeMoneySubnavKey('/product/money'), 'jars');
    assert.equal(activeMoneySubnavKey('/product/money/jars/NECESSITIES'), 'jars');
    assert.equal(activeMoneySubnavKey('/product/money/transactions/create'), 'transactions');
    assert.equal(activeMoneySubnavKey('/product/money/fixed-costs'), 'fixed_costs');
    assert.equal(activeMoneySubnavKey('/product/money/income'), 'income');
    assert.equal(activeMoneySubnavKey('/product/money/debt/create'), 'debt');
    assert.equal(activeMoneySubnavKey('/product/money/net-worth'), 'net_worth');
});

test('the active Growth page: Course by default, then Goals; Learn belongs to Soul', () => {
    assert.equal(activeGrowthSubnavKey('/product/growth'), 'course');
    assert.equal(activeGrowthSubnavKey('/product/growth/course/2026-W47'), 'course');
    assert.equal(activeGrowthSubnavKey('/product/growth/goals'), 'goals');
    assert.equal(activeGrowthSubnavKey('/product/growth/learn'), null);
    assert.equal(activeGrowthSubnavKey('/product/growth/income'), null);
});

test('the active Soul page: Direction, Learn (under its Growth URL) or one Soul page; the overview has none', () => {
    assert.equal(activeSoulSubnavKey('/product/direction'), 'direction');
    assert.equal(activeSoulSubnavKey('/nl/product/direction'), 'direction');
    assert.equal(activeSoulSubnavKey('/product/growth/learn'), 'learn');
    assert.equal(activeSoulSubnavKey('/product/growth/learn/library'), 'learn');
    assert.equal(activeSoulSubnavKey('/product/soul/stillness'), 'stillness');
    assert.equal(activeSoulSubnavKey('/product/soul/centers'), 'centers');
    assert.equal(activeSoulSubnavKey('/product/soul'), null);
    assert.equal(activeSoulSubnavKey('/product/growth/course'), null);
});

// ── The board ladder (Clarity 3): deferred pages stay in their subnav, muted ────

const WEEK_ONE_STAGES = [BoardStage.SPLIT, BoardStage.SORTING];

test('Basic OWNER in week 1: Home · Money · You; no locks, no upsell; Coming up in You', () => {
    env.NODE_ENV = 'production';
    for (const stage of WEEK_ONE_STAGES) {
        const nav = buildNav(ctx({ plan: PlanKey.BASIC, stage }));
        assert.deepEqual(tabKeys(nav), ['home', 'money', 'you']);
        assert.deepEqual(describeSubnav(nav.moneySubnav), [
            'income',
            'jars',
            'fixed_costs',
            'transactions',
        ]);
        // No Coach in week 1; Coming up points at the first stage that adds something.
        assert.deepEqual(describeYou(nav), ['why', 'settings', 'help', 'coming_up:routine']);
    }
});

test('Plus OWNER in week 1: Debt waits in Money, muted until the first closed month', () => {
    env.NODE_ENV = 'production';
    const nav = buildNav(ctx({ plan: PlanKey.PLUS, stage: BoardStage.SPLIT }));
    assert.deepEqual(describeSubnav(nav.moneySubnav), [
        'income',
        'jars',
        'fixed_costs',
        'transactions',
        'debt:later:month_close',
    ]);
    assert.deepEqual(tabKeys(nav), ['home', 'money', 'you']);
});

test('Basic OWNER at ROUTINE: Growth, The Coach and the locks arrive; Coming up points at the month', () => {
    env.NODE_ENV = 'production';
    const nav = buildNav(ctx({ plan: PlanKey.BASIC, stage: BoardStage.ROUTINE }));
    assert.deepEqual(tabKeys(nav), ['home', 'money', 'growth', 'soul', 'you']);
    assert.deepEqual(describeSubnav(nav.growthSubnav), ['goals']);
    assert.deepEqual(describeSubnav(nav.soulSubnav), ['direction', 'learn:locked']);
    assert.deepEqual(describeYou(nav), ['coach', 'why', 'settings', 'help', 'coming_up:month']);
});

test('Plus OWNER at ROUTINE: Debt and Learn are muted until the month closes; Course is open', () => {
    env.NODE_ENV = 'production';
    const nav = buildNav(ctx({ plan: PlanKey.PLUS, stage: BoardStage.ROUTINE }));
    assert.deepEqual(describeSubnav(nav.moneySubnav), [
        'income',
        'jars',
        'fixed_costs',
        'transactions',
        'debt:later:month_close',
        'net_worth:locked',
    ]);
    assert.deepEqual(describeSubnav(nav.growthSubnav), ['course']);
    assert.deepEqual(describeSubnav(nav.soulSubnav), ['direction', 'learn:later:month_close']);
    assert.equal(nav.tabs.find(tab => tab.key === 'growth')?.href, '/product/growth/course');
    assert.deepEqual(describeYou(nav), ['coach', 'why', 'settings', 'help', 'coming_up:month']);
});

test('Plus OWNER at MONTH: everything open, no Coming up', () => {
    env.NODE_ENV = 'production';
    const nav = buildNav(ctx({ plan: PlanKey.PLUS, stage: BoardStage.MONTH }));
    assert.ok(!describeSubnav(nav.moneySubnav).some(item => item.includes(':later')));
    assert.deepEqual(describeSubnav(nav.growthSubnav), ['course']);
    assert.deepEqual(describeSubnav(nav.soulSubnav), ['direction', 'learn']);
    assert.deepEqual(describeYou(nav), ['coach', 'why', 'settings', 'help']);
});

test('Basic at ROUTINE after a closed month: nothing is left to add, so no Coming up row', () => {
    env.NODE_ENV = 'production';
    const nav = buildNav(
        ctx({ plan: PlanKey.BASIC, stage: BoardStage.ROUTINE, hasClosedMonth: true })
    );
    assert.ok(!describeYou(nav).some(row => row.startsWith('coming_up')));
});

test('VIEWER and MEMBER: stage applies, Coming up only for writers', () => {
    env.NODE_ENV = 'production';
    const viewer = buildNav(
        ctx({ plan: PlanKey.MAX, role: HouseholdRole.VIEWER, stage: BoardStage.SPLIT })
    );
    assert.deepEqual(describeYou(viewer), ['why', 'settings']);
    assert.deepEqual(describeSubnav(viewer.moneySubnav), [
        'jars',
        'fixed_costs',
        'transactions',
        'debt:later:month_close',
        'net_worth:later:month_close',
    ]);
    const member = buildNav(
        ctx({ plan: PlanKey.BASIC, role: HouseholdRole.MEMBER, stage: BoardStage.SPLIT })
    );
    assert.ok(describeYou(member).includes('coming_up:routine'));
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
    assert.ok(!describeYou(preview).some(row => row.startsWith('coming_up')));
    const unknown = buildNav(
        ctx({ plan: PlanKey.BASIC, stage: BoardStage.SPLIT, membershipKnown: false })
    );
    assert.ok(!describeYou(unknown).some(row => row.startsWith('coming_up')));
});

test('while the stage loads: the Growth and Soul slots are reserved (pending), no Coming up yet', () => {
    env.NODE_ENV = 'production';
    const nav = buildNav(ctx({ plan: PlanKey.BASIC, stageReady: false }));
    const growth = nav.tabs.find(tab => tab.key === 'growth');
    assert.equal(growth?.pending, true);
    assert.equal(nav.tabs.find(tab => tab.key === 'soul')?.pending, true);
    assert.ok(!describeYou(nav).some(row => row.startsWith('coming_up')));
    const ready = buildNav(ctx({ plan: PlanKey.BASIC, stage: BoardStage.ROUTINE }));
    assert.equal(ready.tabs.find(tab => tab.key === 'growth')?.pending, undefined);
    assert.equal(ready.tabs.find(tab => tab.key === 'soul')?.pending, undefined);
    // A VIEWER has no Growth tab, so no slot is reserved for it; the Soul tab (their own
    // Direction) is reserved like anyone's.
    const viewer = buildNav(ctx({ role: HouseholdRole.VIEWER, stageReady: false }));
    assert.ok(!viewer.tabs.some(tab => tab.key === 'growth'));
    assert.equal(viewer.tabs.find(tab => tab.key === 'soul')?.pending, true);
});

test('stageAdditions and nextVisibleStage follow the nav on this plan and role', () => {
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

test('plan locks are never announced as something coming up', () => {
    env.NODE_ENV = 'production';
    const all = stageAdditions(ctx({ plan: PlanKey.BASIC }), BoardStage.SPLIT, BoardStage.MONTH);
    const keys = new Set(all.flatMap(item => (item.kind === 'nav' ? [item.key] : [])));
    assert.ok(!keys.has('debt') && !keys.has('net_worth') && !keys.has('learn'));
    assert.ok(all.length > 0);
});

test('deferred pages stay findable in search with what brings them to the front', () => {
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

test('production never lists Energy or a Soul page at any stage; the Soul tab carries Direction and Learn only', () => {
    env.NODE_ENV = 'production';
    for (const stage of [BoardStage.SPLIT, BoardStage.ROUTINE, BoardStage.MONTH]) {
        const nav = buildNav(ctx({ plan: PlanKey.MAX, stage }));
        assert.ok(!describeYou(nav).includes('energy'));
        assert.ok(nav.soulSubnav.every(item => item.key === 'learn' || item.key === 'direction'));
    }
});

test('the Soul tab: production Plus and Basic, staging Plus; from the first week check on', () => {
    env.NODE_ENV = 'production';
    const plus = buildNav(ctx({ plan: PlanKey.PLUS, stage: BoardStage.ROUTINE }));
    assert.deepEqual(describeSubnav(plus.soulSubnav), ['direction', 'learn:later:month_close']);
    const basic = buildNav(ctx({ plan: PlanKey.BASIC, stage: BoardStage.MONTH }));
    assert.deepEqual(describeSubnav(basic.soulSubnav), ['direction', 'learn:locked']);
    assert.equal(basic.tabs.find(tab => tab.key === 'soul')?.href, '/product/direction');
    const early = buildNav(ctx({ plan: PlanKey.PLUS, stage: BoardStage.SORTING }));
    assert.ok(!tabKeys(early).includes('soul'));
    // Both pages stay findable in search before the tab arrives; the tab comes with the week check.
    for (const href of ['/product/growth/learn', '/product/direction']) {
        assert.equal(
            early.searchable.find(item => item.href === href)?.deferredUntil,
            'week_check',
            href
        );
    }
    // While the plan loads the tab is already there (Direction needs no plan); Learn is not
    // resolved yet, so it can neither flash in nor show as a lock.
    const loading = buildNav(ctx({ plan: PlanKey.PLUS, planReady: false }));
    assert.equal(loading.tabs.find(tab => tab.key === 'soul')?.pending, undefined);
    assert.deepEqual(describeSubnav(loading.soulSubnav), ['direction']);
    assert.equal(loading.tabs.find(tab => tab.key === 'soul')?.href, '/product/direction');

    env.NODE_ENV = 'development';
    const staging = buildNav(ctx({ plan: PlanKey.PLUS, stage: BoardStage.ROUTINE }));
    // Outside production the tab is the same: Direction and Learn only.
    assert.deepEqual(describeSubnav(staging.soulSubnav), ['direction', 'learn:later:month_close']);
});

test('Growth shows one planner item named Course: Plus opens Course, Basic opens its goals list', () => {
    const plus = buildNav(ctx({ plan: PlanKey.PLUS }));
    const basic = buildNav(ctx({ plan: PlanKey.BASIC }));
    const labelOf = (nav: ReturnType<typeof buildNav>) =>
        nav.growthSubnav.filter(item => item.key === 'course' || item.key === 'goals');
    assert.equal(labelOf(plus).length, 1);
    assert.equal(labelOf(plus)[0]?.labelKey, 'pages.nav.children.course');
    assert.equal(labelOf(plus)[0]?.href, '/product/growth/course');
    assert.equal(labelOf(basic).length, 1);
    assert.equal(labelOf(basic)[0]?.labelKey, 'pages.nav.children.course');
    assert.equal(labelOf(basic)[0]?.href, '/product/growth/goals');
});
