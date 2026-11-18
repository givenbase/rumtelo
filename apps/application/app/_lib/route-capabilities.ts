/**
 * Route gating table — which capability and role section each app route needs.
 *
 * Plan and role gates read THIS table, never the visible nav. A page that leaves the nav
 * (Debt, Net worth and Learn moved into More) keeps its gate. Longest prefix wins, so
 * `/product/money/transactions/import` is `moneyImport` while `/product/money/transactions`
 * stays `moneySpending`.
 *
 * `/settings/**` is intentionally absent: settings pages gate themselves per section.
 */
import { CAPABILITIES, HouseholdPermissionSection, type CapabilityKey } from '@rumtelo/contracts';

import { normalizeAppPathname } from './path';

export interface RouteCapability {
    /** Path prefix without locale, e.g. `/product/money/debt`. `/` matches the root only. */
    prefix: string;
    capabilityKey: CapabilityKey;
    /** Role section that must be readable for the route. */
    section: HouseholdPermissionSection;
}

const { HOME, MONEY, GROWTH, COACH, ENERGY, SOUL } = HouseholdPermissionSection;

export const ROUTE_CAPABILITIES: readonly RouteCapability[] = [
    { prefix: '/', capabilityKey: CAPABILITIES.homeOverview, section: HOME },
    { prefix: '/product/coach', capabilityKey: CAPABILITIES.homeCoach, section: COACH },
    { prefix: '/product/why', capabilityKey: CAPABILITIES.homeWhy, section: HOME },

    { prefix: '/product/money', capabilityKey: CAPABILITIES.moneyOverview, section: MONEY },
    { prefix: '/product/money/jars', capabilityKey: CAPABILITIES.moneyJars, section: MONEY },
    {
        prefix: '/product/money/transactions',
        capabilityKey: CAPABILITIES.moneySpending,
        section: MONEY,
    },
    {
        prefix: '/product/money/transactions/import',
        capabilityKey: CAPABILITIES.moneyImport,
        section: MONEY,
    },
    {
        prefix: '/product/money/fixed-costs',
        capabilityKey: CAPABILITIES.moneyFixedCosts,
        section: MONEY,
    },
    // Income keeps the Growth role section: a VIEWER cannot read it today and still cannot
    // after it moves under Money (clarity-2 orchestrator answer 1).
    { prefix: '/product/money/income', capabilityKey: CAPABILITIES.growthIncome, section: GROWTH },
    {
        prefix: '/product/money/week-check',
        capabilityKey: CAPABILITIES.moneyOverview,
        section: MONEY,
    },
    { prefix: '/product/money/debt', capabilityKey: CAPABILITIES.moneyDebt, section: MONEY },
    {
        // Lives under Money in the nav, but its data comes from growth/* procedures the
        // server gates on the GROWTH section — keep the same section so a VIEWER isn't shown a shell.
        prefix: '/product/money/net-worth',
        capabilityKey: CAPABILITIES.growthNetWorth,
        section: GROWTH,
    },

    { prefix: '/product/growth', capabilityKey: CAPABILITIES.growthOverview, section: GROWTH },
    { prefix: '/product/growth/course', capabilityKey: CAPABILITIES.growthCourse, section: GROWTH },
    { prefix: '/product/growth/goals', capabilityKey: CAPABILITIES.growthGoals, section: GROWTH },
    { prefix: '/product/growth/learn', capabilityKey: CAPABILITIES.growthLearn, section: GROWTH },
    {
        prefix: '/product/growth/net-worth',
        capabilityKey: CAPABILITIES.growthNetWorth,
        section: GROWTH,
    },
    // Old Income URL: redirects to /product/money/income, kept so a stale link is still gated.
    { prefix: '/product/growth/income', capabilityKey: CAPABILITIES.growthIncome, section: GROWTH },

    { prefix: '/product/energy', capabilityKey: CAPABILITIES.energyOverview, section: ENERGY },
    { prefix: '/product/energy/sleep', capabilityKey: CAPABILITIES.energySleep, section: ENERGY },
    { prefix: '/product/energy/week', capabilityKey: CAPABILITIES.energyWeek, section: ENERGY },
    {
        prefix: '/product/energy/training',
        capabilityKey: CAPABILITIES.energyTraining,
        section: ENERGY,
    },
    { prefix: '/product/energy/food', capabilityKey: CAPABILITIES.energyFood, section: ENERGY },

    { prefix: '/product/soul', capabilityKey: CAPABILITIES.soulOverview, section: SOUL },
    { prefix: '/product/soul/stillness', capabilityKey: CAPABILITIES.soulStillness, section: SOUL },
    { prefix: '/product/soul/gratitude', capabilityKey: CAPABILITIES.soulGratitude, section: SOUL },
    { prefix: '/product/soul/intent', capabilityKey: CAPABILITIES.soulIntent, section: SOUL },
    { prefix: '/product/soul/giving', capabilityKey: CAPABILITIES.soulGiving, section: SOUL },
    { prefix: '/product/soul/centers', capabilityKey: CAPABILITIES.soulCenters, section: SOUL },
];

function prefixMatches(path: string, prefix: string): boolean {
    if (prefix === '/') return path === '/';
    return path === prefix || path.startsWith(`${prefix}/`);
}

/** Longest-prefix route entry for a pathname (locale prefix and query are ignored). */
export function routeAccessForPath(pathname: string): RouteCapability | null {
    const path = normalizeAppPathname(pathname);
    let best: RouteCapability | null = null;
    for (const entry of ROUTE_CAPABILITIES) {
        if (!prefixMatches(path, entry.prefix)) continue;
        if (!best || entry.prefix.length > best.prefix.length) best = entry;
    }
    return best;
}
