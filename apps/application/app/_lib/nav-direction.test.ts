import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
    BoardStage,
    CAPABILITIES,
    HouseholdPermissionSection,
    HouseholdRole,
    roleCanSee,
} from '@rumtelo/contracts';

import { buildNav, DIRECTION_PATH, type NavContext } from './nav';
import { hasCapability, PlanKey } from './plan';
import { routeAccessForPath } from './route-capabilities';

const env = process.env as Record<string, string | undefined>;
const originalEnv = env.NODE_ENV;
afterEach(() => {
    env.NODE_ENV = originalEnv;
});

const PLANS = [PlanKey.BASIC, PlanKey.PLUS, PlanKey.MAX] as const;
const ROLES = [HouseholdRole.OWNER, HouseholdRole.MEMBER, HouseholdRole.VIEWER] as const;
const ENVIRONMENTS = ['production', 'development'] as const;
const PAGE_PREVIEW = { active: false, showCoachNav: true, showSettings: true, showPageHelp: true };

function ctx(overrides: Partial<NavContext> = {}): NavContext {
    const plan = overrides.plan ?? PlanKey.PLUS;
    return {
        role: HouseholdRole.OWNER,
        membershipKnown: true,
        plan,
        planReady: true,
        has: key => hasCapability(key, plan),
        preview: PAGE_PREVIEW,
        isPracticeStaff: false,
        settingsHref: '/settings',
        stage: BoardStage.MONTH,
        stageReady: true,
        hasClosedMonth: false,
        now: new Date('2026-11-18T10:00:00Z'),
        ...overrides,
    };
}

test('every plan and role, in production and development: the Mindset tab opens Where you are going', () => {
    for (const environment of ENVIRONMENTS) {
        env.NODE_ENV = environment;
        for (const plan of PLANS) {
            for (const role of ROLES) {
                const label = `${environment} ${plan} ${role}`;
                const nav = buildNav(ctx({ plan, role }));
                const soulTab = nav.tabs.find(tab => tab.key === 'soul');
                assert.equal(soulTab?.href, DIRECTION_PATH, label);
                assert.equal(nav.soulSubnav[0]?.key, 'direction', label);
                assert.equal(nav.soulSubnav[0]?.state, 'open', label);
                // A person's own direction never carries a plan lock or a "later".
                assert.equal(
                    nav.soulSubnav.filter(item => item.key === 'direction').length,
                    1,
                    label
                );
            }
        }
    }
});

test('Learn follows the direction item and keeps its own plan and stage gates', () => {
    env.NODE_ENV = 'production';
    const basic = buildNav(ctx({ plan: PlanKey.BASIC }));
    assert.deepEqual(
        basic.soulSubnav.map(item => `${item.key}:${item.state}`),
        ['direction:open', 'learn:locked']
    );
    const plusEarly = buildNav(ctx({ plan: PlanKey.PLUS, stage: BoardStage.ROUTINE }));
    assert.deepEqual(
        plusEarly.soulSubnav.map(item => `${item.key}:${item.state}`),
        ['direction:open', 'learn:later']
    );
    // A VIEWER cannot see Planning, so Learn is gone and only their own direction is left.
    const viewer = buildNav(ctx({ plan: PlanKey.MAX, role: HouseholdRole.VIEWER }));
    assert.deepEqual(
        viewer.soulSubnav.map(item => item.key),
        ['direction']
    );
});

test('the first week has no Mindset tab, for every plan and role', () => {
    for (const environment of ENVIRONMENTS) {
        env.NODE_ENV = environment;
        for (const stage of [BoardStage.SPLIT, BoardStage.SORTING]) {
            for (const plan of PLANS) {
                for (const role of ROLES) {
                    const nav = buildNav(ctx({ plan, role, stage }));
                    assert.ok(
                        !nav.tabs.some(tab => tab.key === 'soul'),
                        `${environment} ${stage} ${plan} ${role}`
                    );
                }
            }
        }
    }
});

test('a Practice preview shows no direction item, tab or search entry, for every plan and role', () => {
    for (const environment of ENVIRONMENTS) {
        env.NODE_ENV = environment;
        for (const plan of PLANS) {
            for (const role of ROLES) {
                const nav = buildNav(
                    ctx({ plan, role, preview: { ...PAGE_PREVIEW, active: true } })
                );
                const label = `${environment} ${plan} ${role}`;
                assert.ok(!nav.soulSubnav.some(item => item.key === 'direction'), label);
                assert.ok(!nav.searchable.some(item => item.href === DIRECTION_PATH), label);
                assert.ok(!nav.tabs.some(tab => tab.href === DIRECTION_PATH), label);
            }
        }
    }
});

test('the direction route is gated by Home alone, and every plan and every role holds Home', () => {
    const access = routeAccessForPath(DIRECTION_PATH);
    assert.equal(access?.section, HouseholdPermissionSection.HOME);
    assert.equal(access?.capabilityKey, CAPABILITIES.homeOverview);
    for (const plan of PLANS) {
        assert.ok(hasCapability(CAPABILITIES.homeOverview, plan), plan);
    }
    for (const role of ROLES) {
        assert.ok(roleCanSee(role, HouseholdPermissionSection.HOME), role);
    }
});

test('the direction page is not reachable through a deferred Soul route', () => {
    // /product/soul redirects to Learn while Soul is deferred; the direction page must live elsewhere.
    assert.ok(!DIRECTION_PATH.startsWith('/product/soul'));
    assert.ok(!DIRECTION_PATH.startsWith('/product/growth'));
});
