/**
 * One-line "why this screen" caption above page content.
 * Copy lives in `pages.why.routes` — keyed by stable slug, not raw path.
 */
import type { TranslateFn } from '@rumtelo/i18n';

import { normalizeAppPathname } from './nav';

/** Pathname → translation slug under `pages.why.routes`. */
const PATH_TO_WHY_SLUG = {
    '/': 'home',
    '/product/money/jars': 'money_jars',
    '/product/money/transactions': 'money_transactions',
    '/product/money/debt': 'money_debt',
    '/product/money/fixed-costs': 'money_fixed_costs',
    '/product/growth/goals': 'growth_goals',
    '/product/growth/net-worth': 'growth_net_worth',
    '/product/energy/week': 'energy_week',
    '/product/energy/sleep': 'energy_sleep',
    '/product/soul/stillness': 'soul_stillness',
    '/product/soul/gratitude': 'soul_gratitude',
    '/product/soul/giving': 'soul_giving',
    '/product/soul/intent': 'soul_intent',
    '/product/soul/centres': 'soul_centres',
    '/product/growth/income': 'growth_income',
    '/product/growth/learn': 'growth_learn',
    '/product/growth/learn/library': 'growth_learn_library',
    '/product/energy/training': 'energy_training',
    '/product/energy/food': 'energy_food',
    '/product/money/week-check': 'money_week_check',
    // No why-line on /product/coach — the page is already the Coach.
    '/product/why': 'why',
} as const;

/** Portal hubs use their own `line`; unknown paths show no caption. */
export function whyLineFor(pathname: string, t: TranslateFn): string | null {
    const slug = PATH_TO_WHY_SLUG[normalizeAppPathname(pathname) as keyof typeof PATH_TO_WHY_SLUG];
    if (!slug) return null;
    return t(slug);
}
