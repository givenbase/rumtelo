/**
 * Navigation model — mirrors design `GROUPS` (Kluis Finance App.dc.html:2942).
 *
 * Product routes live under `/product/…` (visible slug).
 * Platform settings stay at `/settings/…`. Auth stays unprefixed.
 *
 * `capabilityKey`: always a catalog key from CAPABILITIES (`{product}-{feature}`).
 * Labels are i18n keys under `pages.nav.*` — resolve with `t(labelKey)` in the shell.
 */
import { isProductEnabled } from './launch-products';
import { CAPABILITIES } from './plan';
import { productPath } from './routes';

/** Full portal IA — filtered by launch surface for `NAV_GROUPS` / `BOTTOM_TABS`. */
const ALL_NAV_GROUPS = [
    {
        key: 'home',
        labelKey: 'pages.nav.groups.home',
        icon: '◇',
        href: '/',
        children: [
            {
                href: '/',
                labelKey: 'pages.nav.children.home_overview',
                capabilityKey: CAPABILITIES.homeOverview,
            },
            {
                href: productPath('coach'),
                labelKey: 'pages.nav.children.coach',
                capabilityKey: CAPABILITIES.homeCoach,
            },
            {
                href: productPath('why'),
                labelKey: 'pages.nav.children.why',
                capabilityKey: CAPABILITIES.homeWhy,
            },
        ],
    },
    {
        key: 'money',
        labelKey: 'pages.nav.groups.money',
        icon: '◈',
        href: productPath('money'),
        children: [
            {
                href: productPath('money'),
                labelKey: 'pages.nav.children.money_overview',
                capabilityKey: CAPABILITIES.moneyOverview,
            },
            {
                href: productPath('money/jars'),
                labelKey: 'pages.nav.children.jars',
                capabilityKey: CAPABILITIES.moneyJars,
            },
            {
                href: productPath('money/transactions'),
                labelKey: 'pages.nav.children.transactions',
                capabilityKey: CAPABILITIES.moneySpending,
            },
            {
                href: productPath('money/debt'),
                labelKey: 'pages.nav.children.debt',
                capabilityKey: CAPABILITIES.moneyDebt,
            },
            {
                href: productPath('money/fixed-costs'),
                labelKey: 'pages.nav.children.fixed_costs',
                capabilityKey: CAPABILITIES.moneyFixedCosts,
            },
        ],
    },
    {
        key: 'growth',
        labelKey: 'pages.nav.groups.growth',
        icon: '↗',
        href: productPath('growth'),
        children: [
            {
                href: productPath('growth'),
                labelKey: 'pages.nav.children.growth_overview',
                capabilityKey: CAPABILITIES.growthOverview,
            },
            {
                href: productPath('growth/goals'),
                labelKey: 'pages.nav.children.goals',
                capabilityKey: CAPABILITIES.growthGoals,
            },
            {
                href: productPath('growth/income'),
                labelKey: 'pages.nav.children.income',
                capabilityKey: CAPABILITIES.growthIncome,
            },
            {
                href: productPath('growth/learn'),
                labelKey: 'pages.nav.children.learn',
                capabilityKey: CAPABILITIES.growthLearn,
            },
            {
                href: productPath('growth/net-worth'),
                labelKey: 'pages.nav.children.net_worth',
                capabilityKey: CAPABILITIES.growthNetWorth,
            },
        ],
    },
    {
        key: 'energy',
        labelKey: 'pages.nav.groups.energy',
        // U+2733 + VS15 (text) — bare ✳ becomes the green ❇️ emoji on Apple fonts
        icon: '✳\uFE0E',
        href: productPath('energy'),
        children: [
            {
                href: productPath('energy'),
                labelKey: 'pages.nav.children.energy_overview',
                capabilityKey: CAPABILITIES.energyOverview,
            },
            {
                href: productPath('energy/week'),
                labelKey: 'pages.nav.children.week',
                capabilityKey: CAPABILITIES.energyWeek,
            },
            {
                href: productPath('energy/sleep'),
                labelKey: 'pages.nav.children.sleep',
                capabilityKey: CAPABILITIES.energySleep,
            },
            {
                href: productPath('energy/training'),
                labelKey: 'pages.nav.children.training',
                capabilityKey: CAPABILITIES.energyTraining,
            },
            {
                href: productPath('energy/food'),
                labelKey: 'pages.nav.children.food',
                capabilityKey: CAPABILITIES.energyFood,
            },
        ],
    },
    {
        key: 'soul',
        labelKey: 'pages.nav.groups.soul',
        icon: '✦',
        href: productPath('soul'),
        children: [
            {
                href: productPath('soul'),
                labelKey: 'pages.nav.children.soul_overview',
                capabilityKey: CAPABILITIES.soulOverview,
            },
            {
                href: productPath('soul/stillness'),
                labelKey: 'pages.nav.children.stillness',
                capabilityKey: CAPABILITIES.soulStillness,
            },
            {
                href: productPath('soul/gratitude'),
                labelKey: 'pages.nav.children.gratitude',
                capabilityKey: CAPABILITIES.soulGratitude,
            },
            {
                href: productPath('soul/giving'),
                labelKey: 'pages.nav.children.giving',
                capabilityKey: CAPABILITIES.soulGiving,
            },
            {
                href: productPath('soul/intent'),
                labelKey: 'pages.nav.children.intent',
                capabilityKey: CAPABILITIES.soulIntent,
            },
            {
                href: productPath('soul/centres'),
                labelKey: 'pages.nav.children.centres',
                capabilityKey: CAPABILITIES.soulCentres,
            },
        ],
    },
] as const;

/** Compact labels for the desktop portal pill bar (design SHORT map). */
export const TOP_PILL_LABEL_KEYS: Record<string, string> = {
    home: 'pages.nav.pills.home',
    money: 'pages.nav.pills.money',
    growth: 'pages.nav.pills.growth',
    energy: 'pages.nav.pills.energy',
    soul: 'pages.nav.pills.soul',
};

export type NavGroup = (typeof ALL_NAV_GROUPS)[number];
export type NavChild = NavGroup['children'][number];

/** Launch-filtered portals — production hides Energy/Soul. */
export const NAV_GROUPS: readonly NavGroup[] = ALL_NAV_GROUPS.filter(group =>
    isProductEnabled(group.key)
);

/** Bottom tabs — design `SHORT` map (same launch filter as nav). */
export const BOTTOM_TABS = NAV_GROUPS.map(group => ({
    href: group.href,
    labelKey: TOP_PILL_LABEL_KEYS[group.key] ?? group.labelKey,
    glyph: group.icon,
}));

/** True when `pathname` is exactly `href` or a nested route under it. */
export function pathMatchesNavHref(pathname: string, href: string): boolean {
    const path = normalizeAppPathname(pathname);
    if (href === '/') return path === '/';
    return path === href || path.startsWith(`${href}/`);
}

/**
 * Strip locale prefix / trailing slash so gating matches nav hrefs.
 * Defensive: next/navigation can occasionally disagree with next-intl.
 */
export function normalizeAppPathname(pathname: string): string {
    let path = pathname.split(/[?#]/)[0] || '/';
    path = path.replace(/^\/(en|nl)(?=\/|$)/, '') || '/';
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return path || '/';
}

/**
 * Longest-prefix nav child for the current path.
 * Critical for plan gating: `/product/growth/income` → `growth-income`,
 * not the shorter Overview hub (`growth-overview`).
 */
export function resolveNavChildForPath(pathname: string): NavChild | null {
    const path = normalizeAppPathname(pathname);
    const matches: NavChild[] = [];
    for (const group of NAV_GROUPS) {
        for (const child of group.children) {
            if (pathMatchesNavHref(path, child.href)) matches.push(child);
        }
    }
    if (matches.length === 0) return null;
    return matches.reduce((best, child) => (child.href.length > best.href.length ? child : best));
}

export function resolveNavGroupForPath(pathname: string): NavGroup | null {
    const child = resolveNavChildForPath(pathname);
    if (child) {
        return (
            NAV_GROUPS.find(group =>
                group.children.some(navChild => navChild.href === child.href)
            ) ?? null
        );
    }
    return (
        NAV_GROUPS.find(group =>
            group.children.some(navChild => pathMatchesNavHref(pathname, navChild.href))
        ) ?? null
    );
}
