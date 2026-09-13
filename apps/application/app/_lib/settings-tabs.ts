/**
 * Settings IA — product prefs under `/settings/product/{money|growth|energy|soul}/…`.
 * Cross-cutting prefs under `/settings/general/…` and `/settings/data/…`.
 * Account stays at `/settings`.
 */
export type SettingsTab =
    | 'account'
    | 'plan'
    | 'export'
    | 'jars'
    | 'debt'
    | 'bank'
    | 'automation'
    | 'goals'
    | 'week'
    | 'stillness';

export const DEFAULT_TAB: SettingsTab = 'account';

export type SettingsNavItem = {
    key: SettingsTab;
    label: string;
    sub: string;
    /** Product child / screen this settings page configures, when applicable. */
    productChild?: string;
};

export type SettingsNavSection = {
    title: string;
    /** `platform` / `data` or a product key. */
    product: 'platform' | 'money' | 'growth' | 'energy' | 'soul' | 'data';
    items: SettingsNavItem[];
};

/** Absolute href for each settings tab. */
export const SETTINGS_HREF: Record<SettingsTab, string> = {
    account: '/settings',
    plan: '/settings/general/plan',
    export: '/settings/data/export',
    jars: '/settings/product/money/jars',
    debt: '/settings/product/money/debt',
    bank: '/settings/product/money/bank',
    automation: '/settings/product/money/automation',
    goals: '/settings/product/growth/goals',
    week: '/settings/product/energy/week',
    stillness: '/settings/product/soul/stillness',
};

/** Grouped nav — general first, then products, then data. */
export const SETTINGS_SECTIONS: SettingsNavSection[] = [
    {
        title: 'General',
        product: 'platform',
        items: [
            { key: 'account', label: 'Account', sub: 'Profile, sign-in, language' },
            { key: 'plan', label: 'Plan', sub: 'What you use and pay' },
        ],
    },
    {
        title: 'Money',
        product: 'money',
        items: [
            { key: 'jars', label: 'Jars', sub: 'Split, accounts, coach', productChild: 'jars' },
            { key: 'debt', label: 'Debt', sub: 'Payoff method', productChild: 'debt' },
            { key: 'bank', label: 'Bank', sub: 'Accounts and PSD2', productChild: 'account' },
            {
                key: 'automation',
                label: 'Automation',
                sub: 'Rules without asking',
                productChild: 'rule',
            },
        ],
    },
    {
        title: 'Growth',
        product: 'growth',
        items: [{ key: 'goals', label: 'Goals', sub: 'Planning horizon', productChild: 'goals' }],
    },
    {
        title: 'Energy',
        product: 'energy',
        items: [
            {
                key: 'week',
                label: 'Week',
                sub: 'Hours, sleep and weight',
                productChild: 'week',
            },
        ],
    },
    {
        title: 'Soul',
        product: 'soul',
        items: [
            {
                key: 'stillness',
                label: 'Stillness',
                sub: 'Minutes a day and reminders',
                productChild: 'stillness',
            },
        ],
    },
    {
        title: 'Data',
        product: 'data',
        items: [{ key: 'export', label: 'Export', sub: 'Excel or CSV' }],
    },
];

/** Flat list for lookups — order follows sections. */
export const SETTINGS_TABS: SettingsNavItem[] = SETTINGS_SECTIONS.flatMap(section => section.items);

const TAB_KEYS = new Set<string>(SETTINGS_TABS.map(tab => tab.key));
const HREF_TO_TAB = new Map(
    (Object.entries(SETTINGS_HREF) as [SettingsTab, string][]).map(([tab, href]) => [href, tab])
);

export function isSettingsTab(value: string | undefined | null): value is SettingsTab {
    return Boolean(value && TAB_KEYS.has(value));
}

/** Active section from pathname (supports nested `/settings/product/…`). */
export function settingsTabFromPathname(pathname: string): SettingsTab {
    const normalized = pathname.replace(/\/$/, '') || '/settings';
    if (normalized === '/settings') return DEFAULT_TAB;
    return HREF_TO_TAB.get(normalized) ?? DEFAULT_TAB;
}

/** Map portal nav group → default settings section for that product. */
export function settingsTabForNavGroup(groupKey: string | null | undefined): SettingsTab {
    switch (groupKey) {
        case 'money':
            return 'jars';
        case 'growth':
            return 'goals';
        case 'energy':
            return 'week';
        case 'soul':
            return 'stillness';
        case 'home':
            return 'account';
        default:
            return DEFAULT_TAB;
    }
}

/**
 * Prefer the settings page that matches the current product screen
 * (Debt → Debt settings, Jars → Jars settings, …). Fall back to the product group.
 */
export function settingsTabForPathname(pathname: string): SettingsTab {
    const path = pathname.replace(/\/$/, '') || '/';

    if (path.includes('/product/money/debt')) return 'debt';
    if (path.includes('/product/money/jars')) return 'jars';
    if (path.includes('/product/money/fixed-costs')) return 'jars';
    if (path.includes('/product/money/transactions')) return 'automation';
    if (path.includes('/product/money/accounts') || path.includes('/product/money/bank')) {
        return 'bank';
    }
    if (path.includes('/product/growth/goals')) return 'goals';
    if (path.includes('/product/energy/week')) return 'week';
    if (path.includes('/product/soul/stillness')) return 'stillness';

    if (path.startsWith('/product/money')) return 'jars';
    if (path.startsWith('/product/growth')) return 'goals';
    if (path.startsWith('/product/energy')) return 'week';
    if (path.startsWith('/product/soul')) return 'stillness';

    return DEFAULT_TAB;
}

export function settingsHref(tab: SettingsTab = DEFAULT_TAB): string {
    return SETTINGS_HREF[tab];
}

export function settingsHrefForNavGroup(groupKey: string | null | undefined): string {
    return settingsHref(settingsTabForNavGroup(groupKey));
}

export function settingsHrefForPathname(pathname: string): string {
    return settingsHref(settingsTabForPathname(pathname));
}
