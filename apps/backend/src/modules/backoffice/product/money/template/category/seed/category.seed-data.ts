import { JarKey } from '@rumtelo/contracts';

type CategorySeedRow = {
    key: string;
    name: string;
    /** Jars where this type is offered; first entry is primary. */
    jarKeys: readonly JarKey[];
    icon: string;
};

const allJars = [
    JarKey.NECESSITIES,
    JarKey.FINANCIAL_FREEDOM,
    JarKey.LONG_TERM_SAVINGS,
    JarKey.EDUCATION,
    JarKey.PLAY,
    JarKey.GIVE,
] as const;

/** English category spine — single source of truth for preset categoryTemplateKey. */
export const CATEGORY_TEMPLATE_SEED: readonly CategorySeedRow[] = [
    // NECESSITIES
    { key: 'HOUSING', name: 'Housing', jarKeys: [JarKey.NECESSITIES], icon: '🏠' },
    { key: 'GROCERIES', name: 'Groceries', jarKeys: [JarKey.NECESSITIES], icon: '🛒' },
    { key: 'UTILITIES', name: 'Utilities', jarKeys: [JarKey.NECESSITIES], icon: '💡' },
    { key: 'INSURANCE', name: 'Insurance', jarKeys: [JarKey.NECESSITIES], icon: '🛡️' },
    { key: 'TRANSPORT', name: 'Transport', jarKeys: [JarKey.NECESSITIES], icon: '🚌' },
    { key: 'SUBSCRIPTIONS', name: 'Subscriptions', jarKeys: [JarKey.NECESSITIES], icon: '📱' },
    { key: 'TAXES', name: 'Taxes', jarKeys: [JarKey.NECESSITIES], icon: '🧾' },
    { key: 'FINES', name: 'Fines & tickets', jarKeys: [JarKey.NECESSITIES], icon: '🚨' },
    { key: 'FAMILY', name: 'Family', jarKeys: [JarKey.NECESSITIES], icon: '👪' },
    {
        key: 'CHILD_ACTIVITIES',
        name: 'Kids activities',
        jarKeys: [JarKey.NECESSITIES],
        icon: '🧒',
    },
    { key: 'DEBT_PAYMENTS', name: 'Debt payments', jarKeys: [JarKey.NECESSITIES], icon: '💳' },
    { key: 'PHARMACY', name: 'Pharmacy', jarKeys: [JarKey.NECESSITIES], icon: '💊' },
    { key: 'DRUGSTORE', name: 'Drugstore', jarKeys: [JarKey.NECESSITIES], icon: '🧴' },
    { key: 'NUTRITION', name: 'Nutrition', jarKeys: [JarKey.NECESSITIES], icon: '🥗' },
    { key: 'MEDICAL', name: 'Medical', jarKeys: [JarKey.NECESSITIES], icon: '🏥' },
    { key: 'DENTAL', name: 'Dental', jarKeys: [JarKey.NECESSITIES], icon: '🦷' },
    { key: 'OPTICIAN', name: 'Optician', jarKeys: [JarKey.NECESSITIES], icon: '👓' },
    { key: 'THERAPY', name: 'Therapy', jarKeys: [JarKey.NECESSITIES], icon: '🧠' },
    { key: 'PETS', name: 'Pets', jarKeys: [JarKey.NECESSITIES], icon: '🐾' },
    { key: 'CLEANING', name: 'Cleaning & laundry', jarKeys: [JarKey.NECESSITIES], icon: '🧹' },
    { key: 'HOME_SERVICES', name: 'Home services', jarKeys: [JarKey.NECESSITIES], icon: '🔧' },
    { key: 'POST', name: 'Post & parcels', jarKeys: [JarKey.NECESSITIES], icon: '📦' },
    { key: 'BANKING', name: 'Banking', jarKeys: [JarKey.NECESSITIES], icon: '🏦' },
    { key: 'OTHER', name: 'Other', jarKeys: [...allJars], icon: '✨' },
    // FINANCIAL_FREEDOM
    { key: 'INDEX_FUNDS', name: 'Index funds', jarKeys: [JarKey.FINANCIAL_FREEDOM], icon: '📈' },
    { key: 'STOCKS', name: 'Stocks', jarKeys: [JarKey.FINANCIAL_FREEDOM], icon: '📊' },
    { key: 'BONDS', name: 'Bonds', jarKeys: [JarKey.FINANCIAL_FREEDOM], icon: '📉' },
    { key: 'BUSINESS', name: 'Business', jarKeys: [JarKey.FINANCIAL_FREEDOM], icon: '💼' },
    // LONG_TERM_SAVINGS
    {
        key: 'EMERGENCY_FUND',
        name: 'Emergency fund',
        jarKeys: [JarKey.LONG_TERM_SAVINGS],
        icon: '🛟',
    },
    {
        key: 'BIG_PURCHASES',
        name: 'Big purchases',
        jarKeys: [JarKey.LONG_TERM_SAVINGS],
        icon: '🎯',
    },
    {
        key: 'HOME_DEPOSIT',
        name: 'Home deposit',
        jarKeys: [JarKey.LONG_TERM_SAVINGS],
        icon: '🔑',
    },
    // EDUCATION (+ shared)
    { key: 'BOOKS', name: 'Books', jarKeys: [JarKey.EDUCATION, JarKey.PLAY], icon: '📖' },
    { key: 'COURSES', name: 'Courses', jarKeys: [JarKey.EDUCATION], icon: '🎓' },
    { key: 'MENTORS', name: 'Mentors', jarKeys: [JarKey.EDUCATION], icon: '🧭' },
    { key: 'TOOLS', name: 'Tools', jarKeys: [JarKey.EDUCATION], icon: '🛠️' },
    { key: 'TUITION', name: 'Tuition', jarKeys: [JarKey.EDUCATION], icon: '🏫' },
    // PLAY (+ shared)
    { key: 'EATING_OUT', name: 'Eating out', jarKeys: [JarKey.PLAY], icon: '🍽️' },
    { key: 'COFFEE', name: 'Coffee', jarKeys: [JarKey.PLAY], icon: '☕' },
    { key: 'BARS', name: 'Bars & nightlife', jarKeys: [JarKey.PLAY], icon: '🍻' },
    { key: 'FASHION', name: 'Fashion', jarKeys: [JarKey.PLAY], icon: '👗' },
    { key: 'SHOPPING', name: 'Shopping', jarKeys: [JarKey.PLAY], icon: '🛍️' },
    {
        key: 'ELECTRONICS',
        name: 'Electronics',
        jarKeys: [JarKey.PLAY, JarKey.EDUCATION],
        icon: '📱',
    },
    { key: 'ALCOHOL', name: 'Alcohol', jarKeys: [JarKey.PLAY], icon: '🍷' },
    { key: 'BEAUTY', name: 'Beauty products', jarKeys: [JarKey.PLAY], icon: '💄' },
    { key: 'HAIR', name: 'Hairdresser', jarKeys: [JarKey.PLAY], icon: '💇' },
    { key: 'NAILS', name: 'Nail salon', jarKeys: [JarKey.PLAY], icon: '💅' },
    { key: 'SPA', name: 'Spa & massage', jarKeys: [JarKey.PLAY], icon: '🧖' },
    { key: 'TATTOO', name: 'Tattoo & piercing', jarKeys: [JarKey.PLAY], icon: '🖋️' },
    { key: 'FLOWERS', name: 'Flowers', jarKeys: [JarKey.PLAY], icon: '💐' },
    { key: 'TRAVEL', name: 'Travel', jarKeys: [JarKey.PLAY, JarKey.EDUCATION], icon: '✈️' },
    { key: 'STAY', name: 'Stay', jarKeys: [JarKey.PLAY, JarKey.EDUCATION], icon: '🏨' },
    { key: 'EVENTS', name: 'Events', jarKeys: [JarKey.PLAY, JarKey.EDUCATION], icon: '🎟️' },
    { key: 'GAMING', name: 'Gaming', jarKeys: [JarKey.PLAY], icon: '🎮' },
    { key: 'HOBBIES', name: 'Hobbies', jarKeys: [JarKey.PLAY], icon: '🎨' },
    { key: 'MEDIA', name: 'Media', jarKeys: [JarKey.PLAY], icon: '🎬' },
    { key: 'SPORT', name: 'Sport', jarKeys: [JarKey.PLAY], icon: '⚽' },
    // GIVE
    { key: 'DONATIONS', name: 'Donations', jarKeys: [JarKey.GIVE], icon: '❤️' },
    /** Direct help to relatives — not charity, not a gift. */
    { key: 'FAMILY_SUPPORT', name: 'Family support', jarKeys: [JarKey.GIVE], icon: '🤝' },
    { key: 'GIFTS', name: 'Gifts', jarKeys: [JarKey.GIVE], icon: '🎁' },
];
