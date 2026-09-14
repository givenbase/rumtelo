import { JarKey } from '@rumtelo/contracts';

/**
 * Goal name presets for “New goal”.
 * Mapped to jar destinations people actually save toward — not spend categories.
 */
export const GOAL_PRESET_SEED = [
    // ── Long-term savings — safety & big life buys ─────────────────────
    {
        key: 'EMERGENCY_FUND',
        name: 'Emergency fund',
        jarKey: JarKey.LONG_TERM_SAVINGS,
        categoryTemplateKey: 'EMERGENCY_FUND',
        icon: '🛟',
    },
    {
        key: 'HOME',
        name: 'A place of my own',
        jarKey: JarKey.LONG_TERM_SAVINGS,
        categoryTemplateKey: 'HOME_DEPOSIT',
        icon: '🏠',
    },
    {
        key: 'CAR',
        name: 'Car fund',
        jarKey: JarKey.LONG_TERM_SAVINGS,
        categoryTemplateKey: 'BIG_PURCHASES',
        icon: '🚗',
    },
    {
        key: 'WEDDING',
        name: 'Wedding',
        jarKey: JarKey.LONG_TERM_SAVINGS,
        categoryTemplateKey: 'BIG_PURCHASES',
        icon: '💍',
    },
    {
        key: 'SABBATICAL',
        name: 'Sabbatical',
        jarKey: JarKey.LONG_TERM_SAVINGS,
        categoryTemplateKey: 'BIG_PURCHASES',
        icon: '🌅',
    },

    // ── Play — once-in-a-lifetime & adventure ──────────────────────────
    {
        key: 'ADVENTURE_VACATION',
        name: 'Adventure vacation',
        jarKey: JarKey.PLAY,
        categoryTemplateKey: 'TRAVEL',
        icon: '🏔️',
    },
    {
        key: 'DREAM_TRIP',
        name: 'Dream trip',
        jarKey: JarKey.PLAY,
        categoryTemplateKey: 'TRAVEL',
        icon: '✈️',
    },

    // ── Financial freedom — investors & entrepreneurs ──────────────────
    {
        key: 'INVESTMENT_BUFFER',
        name: 'Investment buffer',
        jarKey: JarKey.FINANCIAL_FREEDOM,
        categoryTemplateKey: 'INDEX_FUNDS',
        icon: '📈',
    },
    {
        key: 'PORTFOLIO_START',
        name: 'Start investing',
        jarKey: JarKey.FINANCIAL_FREEDOM,
        categoryTemplateKey: 'STOCKS',
        icon: '📊',
    },
    {
        key: 'BUSINESS_SEED',
        name: 'Launch a business',
        jarKey: JarKey.FINANCIAL_FREEDOM,
        categoryTemplateKey: 'BUSINESS',
        icon: '🚀',
    },
    {
        key: 'BUSINESS_RUNWAY',
        name: 'Business runway',
        jarKey: JarKey.FINANCIAL_FREEDOM,
        categoryTemplateKey: 'BUSINESS',
        icon: '💼',
    },

    // ── Education — ambition & skills ──────────────────────────────────
    {
        key: 'EDUCATION_FUND',
        name: 'Education fund',
        jarKey: JarKey.EDUCATION,
        categoryTemplateKey: 'COURSES',
        icon: '📚',
    },
    {
        key: 'TUITION',
        name: 'Tuition',
        jarKey: JarKey.EDUCATION,
        categoryTemplateKey: 'TUITION',
        icon: '🏫',
    },
    {
        key: 'CAREER_SWITCH',
        name: 'Career switch',
        jarKey: JarKey.EDUCATION,
        categoryTemplateKey: 'COURSES',
        icon: '🧭',
    },

    // ── Give ───────────────────────────────────────────────────────────
    {
        key: 'GIVING_PLEDGE',
        name: 'Giving pledge',
        jarKey: JarKey.GIVE,
        categoryTemplateKey: 'DONATIONS',
        icon: '❤️',
    },

    // ── Catch-all ──────────────────────────────────────────────────────
    {
        key: 'OTHER',
        name: 'Other',
        jarKey: JarKey.LONG_TERM_SAVINGS,
        categoryTemplateKey: null,
        icon: '✨',
    },
] as const;
