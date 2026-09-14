import { JarKey } from '@rumtelo/contracts';

/** English category spine — single source of truth for preset categoryTemplateKey. */
export const CATEGORY_TEMPLATE_SEED = [
    // NECESSITIES
    { key: 'HOUSING', name: 'Housing', jarKey: JarKey.NECESSITIES, icon: '🏠' },
    { key: 'GROCERIES', name: 'Groceries', jarKey: JarKey.NECESSITIES, icon: '🛒' },
    { key: 'UTILITIES', name: 'Utilities', jarKey: JarKey.NECESSITIES, icon: '💡' },
    { key: 'INSURANCE', name: 'Insurance', jarKey: JarKey.NECESSITIES, icon: '🛡️' },
    { key: 'TRANSPORT', name: 'Transport', jarKey: JarKey.NECESSITIES, icon: '🚌' },
    { key: 'SUBSCRIPTIONS', name: 'Subscriptions', jarKey: JarKey.NECESSITIES, icon: '📱' },
    { key: 'TAXES', name: 'Taxes', jarKey: JarKey.NECESSITIES, icon: '🧾' },
    { key: 'FINES', name: 'Fines & tickets', jarKey: JarKey.NECESSITIES, icon: '🚨' },
    { key: 'FAMILY', name: 'Family', jarKey: JarKey.NECESSITIES, icon: '👪' },
    { key: 'DEBT_PAYMENTS', name: 'Debt payments', jarKey: JarKey.NECESSITIES, icon: '💳' },
    { key: 'CARE', name: 'Care', jarKey: JarKey.NECESSITIES, icon: '💊' },
    { key: 'PETS', name: 'Pets', jarKey: JarKey.NECESSITIES, icon: '🐾' },
    { key: 'BANKING', name: 'Banking', jarKey: JarKey.NECESSITIES, icon: '🏦' },
    { key: 'OTHER', name: 'Other', jarKey: JarKey.NECESSITIES, icon: '✨' },
    // FINANCIAL_FREEDOM
    { key: 'INDEX_FUNDS', name: 'Index funds', jarKey: JarKey.FINANCIAL_FREEDOM, icon: '📈' },
    { key: 'STOCKS', name: 'Stocks', jarKey: JarKey.FINANCIAL_FREEDOM, icon: '📊' },
    { key: 'BONDS', name: 'Bonds', jarKey: JarKey.FINANCIAL_FREEDOM, icon: '📉' },
    { key: 'BUSINESS', name: 'Business', jarKey: JarKey.FINANCIAL_FREEDOM, icon: '💼' },
    // LONG_TERM_SAVINGS
    {
        key: 'EMERGENCY_FUND',
        name: 'Emergency fund',
        jarKey: JarKey.LONG_TERM_SAVINGS,
        icon: '🛟',
    },
    {
        key: 'BIG_PURCHASES',
        name: 'Big purchases',
        jarKey: JarKey.LONG_TERM_SAVINGS,
        icon: '🎯',
    },
    { key: 'HOME_DEPOSIT', name: 'Home deposit', jarKey: JarKey.LONG_TERM_SAVINGS, icon: '🔑' },
    // EDUCATION
    { key: 'BOOKS', name: 'Books', jarKey: JarKey.EDUCATION, icon: '📖' },
    { key: 'COURSES', name: 'Courses', jarKey: JarKey.EDUCATION, icon: '🎓' },
    { key: 'MENTORS', name: 'Mentors', jarKey: JarKey.EDUCATION, icon: '🧭' },
    { key: 'TOOLS', name: 'Tools', jarKey: JarKey.EDUCATION, icon: '🛠️' },
    { key: 'TUITION', name: 'Tuition', jarKey: JarKey.EDUCATION, icon: '🏫' },
    // PLAY
    { key: 'EATING_OUT', name: 'Eating out', jarKey: JarKey.PLAY, icon: '🍽️' },
    { key: 'FASHION', name: 'Fashion', jarKey: JarKey.PLAY, icon: '👗' },
    { key: 'SHOPPING', name: 'Shopping', jarKey: JarKey.PLAY, icon: '🛍️' },
    { key: 'BEAUTY', name: 'Beauty', jarKey: JarKey.PLAY, icon: '💄' },
    { key: 'TRAVEL', name: 'Travel', jarKey: JarKey.PLAY, icon: '✈️' },
    { key: 'EVENTS', name: 'Events', jarKey: JarKey.PLAY, icon: '🎟️' },
    { key: 'GAMING', name: 'Gaming', jarKey: JarKey.PLAY, icon: '🎮' },
    { key: 'HOBBIES', name: 'Hobbies', jarKey: JarKey.PLAY, icon: '🎨' },
    { key: 'MEDIA', name: 'Media', jarKey: JarKey.PLAY, icon: '🎬' },
    { key: 'SPORT', name: 'Sport', jarKey: JarKey.PLAY, icon: '⚽' },
    // GIVE
    { key: 'DONATIONS', name: 'Donations', jarKey: JarKey.GIVE, icon: '❤️' },
    { key: 'GIFTS', name: 'Gifts', jarKey: JarKey.GIVE, icon: '🎁' },
] as const;
