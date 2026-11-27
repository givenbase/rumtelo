import {
    DEFAULT_GROUP_SPLIT,
    JarKey,
    JAR_CAPABILITIES,
    jarGroupFor,
    OPTIONAL_JAR_SHARE,
    type JarGuide,
} from '@rumtelo/contracts';

/**
 * Canonical jar catalog seed data — Rumtelo-owned defaults.
 * Loaded into backoffice.reference_money_jar_template by JarTemplateSeeder.
 * Capabilities mirror contracts JAR_CAPABILITIES; percentages mirror DEFAULT_GROUP_SPLIT
 * (main pots) and OPTIONAL_JAR_SHARE (optional pots), so the numbers live in one place.
 *
 * Rows are in group order (Basics, Future, Free; main pot first) — sortOrder = array index,
 * and onboarding copies it onto the household's jars.
 *
 * Names are not renamed in place: the app swaps a stored name for the translated pot name only
 * while it matches a default it knows (`LEGACY_DEFAULT_JAR_NAMES` in the application's
 * `jar-copy.ts`, `JarTemplateService.englishDefaultsFor`). Renaming here would freeze new
 * households on a hard-coded English name.
 *
 * The same rows are written on staging/production by
 * `Migration20261123100100_JarTemplateMainPots` — keep both in step.
 */

type Seed = {
    key: JarKey;
    name: string;
    subtitle: string;
    icon: string;
    percentage: string;
    /** One of the three main pots a new household starts with. */
    isDefault: boolean;
    capabilities: (typeof JAR_CAPABILITIES)[JarKey];
    guide: JarGuide;
};

/** Default share of a main pot: its whole group, before any optional pot is carved out. */
function mainPercentage(key: JarKey): string {
    return DEFAULT_GROUP_SPLIT[jarGroupFor(key)].toFixed(2);
}

/** Share an optional pot takes out of its group's main pot when it is turned on. */
function optionalPercentage(key: keyof typeof OPTIONAL_JAR_SHARE): string {
    return OPTIONAL_JAR_SHARE[key].toFixed(2);
}

export const JAR_TEMPLATE_SEED: readonly Seed[] = [
    {
        key: JarKey.NECESSITIES,
        name: 'Necessity',
        subtitle: 'Must-pays',
        icon: '🏠',
        percentage: mainPercentage(JarKey.NECESSITIES),
        isDefault: true,
        capabilities: JAR_CAPABILITIES[JarKey.NECESSITIES],
        guide: {
            note: 'Rent, energy, insurance, groceries, transport. Staying under 55% is the whole game.',
            allowed: [
                { label: 'Rent', icon: '🏠' },
                { label: 'Energy & water', icon: '⚡' },
                { label: 'Groceries', icon: '🛒' },
                { label: 'Transport & fuel', icon: '🚗' },
                { label: 'Insurance', icon: '🛡️' },
                { label: 'Debt instalments', icon: '📉' },
                { label: 'Phone & internet', icon: '📱' },
            ],
            notAllowed: 'Not for eating out, clothes or fun — that is Play.',
            links: [
                { href: '/product/money/fixed-costs', label: 'Fixed costs', icon: '📌' },
                { href: '/product/money/debt', label: 'Debt', icon: '💳' },
                { href: '/product/money/transactions', label: 'Transactions', icon: '↔' },
            ],
        },
    },
    {
        key: JarKey.DAILY,
        name: 'Daily',
        subtitle: 'Groceries and getting around',
        icon: '🛒',
        percentage: optionalPercentage(JarKey.DAILY),
        isDefault: false,
        capabilities: JAR_CAPABILITIES[JarKey.DAILY],
        guide: {
            note: 'Everyday spending, split off Necessity so bills and the weekly shop stop hiding in one pot. Its share comes out of Necessity.',
            allowed: [
                { label: 'Groceries', icon: '🛒' },
                { label: 'Drugstore & pharmacy', icon: '🧴' },
                { label: 'Household supplies', icon: '🧹' },
                { label: 'Transport & fuel', icon: '🚗' },
            ],
            notAllowed: 'No bills here — rent, energy and insurance stay in Necessity.',
            links: [{ href: '/product/money/transactions', label: 'Transactions', icon: '↔' }],
        },
    },
    {
        key: JarKey.LONG_TERM_SAVINGS,
        name: 'Long Term Savings',
        subtitle: 'Big things',
        icon: '🛟',
        percentage: mainPercentage(JarKey.LONG_TERM_SAVINGS),
        isDefault: true,
        capabilities: JAR_CAPABILITIES[JarKey.LONG_TERM_SAVINGS],
        guide: {
            note: 'Emergency fund, car, down payment. Known, planned, not urgent.',
            allowed: [
                { label: 'Emergency fund', icon: '🛟' },
                { label: 'Car or big purchase', icon: '🚗' },
                { label: 'Down payment', icon: '🏡' },
                { label: 'Renovation', icon: '🔨' },
                { label: 'Tax bill', icon: '🧾' },
            ],
            notAllowed:
                'Known, planned, not urgent. Urgent and unexpected? That is exactly what the emergency fund is for.',
            links: [
                { href: '/product/growth/goals', label: 'Goals', icon: '🎯' },
                { href: '/product/money/transactions', label: 'Transactions', icon: '↔' },
            ],
        },
    },
    {
        key: JarKey.GOALS,
        name: 'Goals',
        subtitle: 'What you save for',
        icon: '🎯',
        percentage: optionalPercentage(JarKey.GOALS),
        isDefault: false,
        capabilities: JAR_CAPABILITIES[JarKey.GOALS],
        guide: {
            note: 'Named goals with a date: a car, a deposit, a renovation. Its share comes out of Long Term Savings, which stays your buffer.',
            allowed: [
                { label: 'Car or big purchase', icon: '🚗' },
                { label: 'Down payment', icon: '🏡' },
                { label: 'Renovation', icon: '🔨' },
                { label: 'A planned trip', icon: '🧳' },
            ],
            notAllowed: 'Not the emergency fund — that buffer stays in Long Term Savings.',
            links: [
                { href: '/product/growth/goals', label: 'Goals', icon: '🎯' },
                { href: '/product/money/transactions', label: 'Transactions', icon: '↔' },
            ],
        },
    },
    {
        key: JarKey.FINANCIAL_FREEDOM,
        name: 'Financial Freedom',
        subtitle: 'Never spend',
        icon: '🔒',
        percentage: optionalPercentage(JarKey.FINANCIAL_FREEDOM),
        isDefault: false,
        capabilities: JAR_CAPABILITIES[JarKey.FINANCIAL_FREEDOM],
        guide: {
            note: 'This jar buys assets. Money goes in and never comes out — only returns do.',
            allowed: [
                { label: 'Index funds & ETFs', icon: '📊' },
                { label: 'Long-term stocks', icon: '📈' },
                { label: 'Bonds', icon: '🏦' },
                { label: 'Property deposit', icon: '🔑' },
                { label: 'Your own business', icon: '🚀' },
            ],
            notAllowed:
                'Never withdraw to buy something. Only the return may leave — and better to leave that in too.',
            links: [
                { href: '/product/money/net-worth', label: 'Net worth', icon: '💎' },
                { href: '/product/growth/goals', label: 'Goals', icon: '🎯' },
            ],
            subs: [
                { label: 'Index funds', pct: 70, icon: '📊' },
                { label: 'Crypto', pct: 20, icon: '🪙' },
                { label: 'Trading & experiments', pct: 10, icon: '🧪' },
            ],
            subNote:
                'Trading is allowed, but only from this 10% corner — never from the rest. Lose it and you lose a month, not your future.',
        },
    },
    {
        key: JarKey.EDUCATION,
        name: 'Education',
        subtitle: 'Grow yourself',
        icon: '📚',
        percentage: optionalPercentage(JarKey.EDUCATION),
        isDefault: false,
        capabilities: JAR_CAPABILITIES[JarKey.EDUCATION],
        guide: {
            note: 'Books, courses, mentors, tools. The only spend that raises your earning power. Use Learn for what you are working through, browse the library for inspiration, and put a goal on this jar when you are ready to claim it.',
            allowed: [
                { label: 'Books', icon: '📖' },
                { label: 'Courses & training', icon: '🎓' },
                { label: 'Mentor or coach', icon: '🗣️' },
                { label: 'Tools & software', icon: '🛠️' },
                { label: 'Conferences', icon: '🎟️' },
            ],
            notAllowed:
                'Only if it raises your earning power. A course you never finish belongs in Play.',
            links: [
                { href: '/product/growth/learn', label: 'Learn', icon: '✦' },
                { href: '/product/growth/learn/library', label: 'Library', icon: '📚' },
                { href: '/product/growth/goals', label: 'Goals', icon: '🎯' },
                { href: '/product/money/transactions', label: 'Transactions', icon: '↔' },
            ],
        },
    },
    {
        key: JarKey.PLAY,
        name: 'Play',
        subtitle: 'Guilt-free',
        icon: '✨',
        percentage: mainPercentage(JarKey.PLAY),
        isDefault: true,
        capabilities: JAR_CAPABILITIES[JarKey.PLAY],
        guide: {
            note: 'Spend it every month. A plan with no joy in it does not survive.',
            allowed: [
                { label: 'Eating & drinking out', icon: '🍽️' },
                { label: 'Outings & concerts', icon: '🎭' },
                { label: 'Clothes', icon: '👕' },
                { label: 'Spontaneous buys', icon: '✨' },
                { label: 'Gifts to yourself', icon: '🎁' },
            ],
            notAllowed:
                'No brakes, no guilt — but no top-up from another jar when it is empty either.',
            links: [{ href: '/product/money/transactions', label: 'Transactions', icon: '↔' }],
        },
    },
    {
        key: JarKey.GIVE,
        name: 'Give / foundation',
        subtitle: 'Pass it on',
        icon: '🤲',
        percentage: optionalPercentage(JarKey.GIVE),
        isDefault: false,
        capabilities: JAR_CAPABILITIES[JarKey.GIVE],
        guide: {
            note: 'Giving keeps money a tool and not a master. Transferred automatically — the Coach helps you choose where.',
            allowed: [
                { label: 'Your foundation', icon: '🏛️' },
                { label: 'Charities', icon: '💚' },
                { label: 'Church or community', icon: '⛪' },
                { label: 'Helping someone who needs it', icon: '🤝' },
            ],
            notAllowed: 'No favors expected, no tax-deduction thinking. Giving keeps money a tool.',
            links: [
                { href: '/product/soul/giving', label: 'Why & where', icon: '✦' },
                { href: '/product/money/fixed-costs', label: 'Fixed costs', icon: '📌' },
                { href: '/product/money/transactions', label: 'Transactions', icon: '↔' },
            ],
        },
    },
];
