/**
 * Static copy for jar helper cards — English default (Kluis JAR_DEFS / JAR_USE).
 * Keys match contract jar keys (NECESSITIES, …).
 */

export type JarGuideKey =
    | 'NECESSITIES'
    | 'FINANCIAL_FREEDOM'
    | 'LONG_TERM_SAVINGS'
    | 'EDUCATION'
    | 'PLAY'
    | 'GIVE';

export type JarGuideItem = {
    label: string;
    icon: string;
};

export type JarGuideLink = {
    href: string;
    label: string;
    icon: string;
};

export interface JarGuide {
    note: string;
    allowed: JarGuideItem[];
    notAllowed: string;
    links: JarGuideLink[];
    subs?: { label: string; pct: number; icon?: string }[];
    subNote?: string;
}

export const JAR_GUIDE: Record<JarGuideKey, JarGuide> = {
    NECESSITIES: {
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
    FINANCIAL_FREEDOM: {
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
            { href: '/product/growth/net-worth', label: 'Net worth', icon: '💎' },
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
    EDUCATION: {
        note: 'Books, courses, mentors, tools. The only spend that raises your earning power.',
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
            { href: '/product/money/transactions', label: 'Transactions', icon: '↔' },
            { href: '/product/growth/goals', label: 'Goals', icon: '🎯' },
        ],
    },
    LONG_TERM_SAVINGS: {
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
    PLAY: {
        note: 'Spend it every month. A plan with no joy in it does not survive.',
        allowed: [
            { label: 'Eating & drinking out', icon: '🍽️' },
            { label: 'Outings & concerts', icon: '🎭' },
            { label: 'Clothes', icon: '👕' },
            { label: 'Spontaneous buys', icon: '✨' },
            { label: 'Gifts to yourself', icon: '🎁' },
        ],
        notAllowed: 'No brakes, no guilt — but no top-up from another jar when it is empty either.',
        links: [{ href: '/product/money/transactions', label: 'Transactions', icon: '↔' }],
    },
    GIVE: {
        note: 'Giving keeps money a tool and not a master. Transferred automatically.',
        allowed: [
            { label: 'Your foundation', icon: '🏛️' },
            { label: 'Charities', icon: '💚' },
            { label: 'Church or community', icon: '⛪' },
            { label: 'Helping someone who needs it', icon: '🤝' },
        ],
        notAllowed: 'No favours expected, no tax-deduction thinking. Giving keeps money a tool.',
        links: [
            { href: '/product/soul/giving', label: 'Why & where', icon: '✦' },
            { href: '/product/money/fixed-costs', label: 'Fixed costs', icon: '📌' },
            { href: '/product/money/transactions', label: 'Transactions', icon: '↔' },
        ],
    },
};
