import { PlanKey, SpendingStyle, type LearnBookPreset } from '@rumtelo/contracts';

import { BOOK_PRESET_EXTRA } from './book-extra.seed-data';
import { BOOK_PRESET_LANES } from './book-lanes.seed-data';

/**
 * Canonical Learn book shelf — Rumtelo-owned recommendations.
 * Loaded into backoffice.reference_growth_book_preset.
 * Covers are Open Library ids. isbn13 is the edition the store link buys.
 * The url points at the author, foundation, or a free public-domain text.
 */
const BOOK_PRESET_CORE: readonly (Omit<LearnBookPreset, 'sortOrder' | 'skill'> & {
    skill?: string;
})[] = [
    {
        key: 'think-and-grow-rich',
        name: 'Think and Grow Rich',
        author: 'Napoleon Hill',
        description:
            'Read it for aim and persistence. The Napoleon Hill Foundation keeps the work in print.',
        topic: 'MIND',
        minPlan: PlanKey.BASIC,
        spendingStyles: [],
        coverId: 14542536,
        isbn13: '9781585424337',
        url: 'https://www.naphill.org/',
    },
    {
        key: 'the-secret',
        name: 'The Secret',
        author: 'Rhonda Byrne',
        description:
            'Attention follows what you rehearse. Useful as a prompt to name what you want, not as a plan.',
        topic: 'MIND',
        minPlan: PlanKey.BASIC,
        spendingStyles: [],
        coverId: 845815,
        isbn13: '9781582701707',
        url: 'https://www.thesecret.tv/',
    },
    {
        key: 'millionaire-mind',
        name: 'Secrets of the Millionaire Mind',
        author: 'T. Harv Eker',
        description:
            'Names the beliefs that decide what you do with money, so you can choose them.',
        topic: 'MIND',
        minPlan: PlanKey.BASIC,
        spendingStyles: [],
        coverId: 492620,
        isbn13: '9780060763282',
        url: 'https://www.harveker.com/',
    },
    {
        key: 'psychology-of-money',
        name: 'The Psychology of Money',
        author: 'Morgan Housel',
        description:
            'Good decisions look strange when you make them. This book shows how to make them anyway.',
        topic: 'SAVE',
        minPlan: PlanKey.BASIC,
        spendingStyles: [SpendingStyle.SAVER, SpendingStyle.BALANCED],
        coverId: 10389354,
        isbn13: '9780857197689',
        url: 'https://www.morganhousel.com/',
    },
    {
        key: 'richest-man-babylon',
        name: 'The Richest Man in Babylon',
        author: 'George S. Clason',
        description:
            'Pay yourself first. A short parable for the part of the split that must leave before you spend.',
        topic: 'SAVE',
        minPlan: PlanKey.BASIC,
        spendingStyles: [SpendingStyle.SAVER],
        coverId: 10491331,
        isbn13: '9780451205360',
        url: 'https://en.wikisource.org/wiki/The_Richest_Man_In_Babylon_and_Other_Stories',
    },
    {
        key: 'rich-dad',
        name: 'Rich Dad Poor Dad',
        author: 'Robert Kiyosaki',
        description: 'Assets pay you. Liabilities cost you. The distinction is the whole book.',
        topic: 'EARN',
        minPlan: PlanKey.BASIC,
        spendingStyles: [],
        coverId: 8315603,
        isbn13: '9781612680194',
        url: 'https://www.richdad.com/',
    },
    {
        key: 'iwt',
        name: 'I Will Teach You to Be Rich',
        author: 'Ramit Sethi',
        description:
            'Concrete steps for automating saving and investing. Less thinking, more doing.',
        topic: 'SAVE',
        minPlan: PlanKey.PLUS,
        spendingStyles: [SpendingStyle.SAVER, SpendingStyle.BALANCED],
        coverId: 10089296,
        isbn13: '9781523505746',
        url: 'https://www.iwillteachyoutoberich.com/',
    },
    {
        key: 'your-money-or-your-life',
        name: 'Your Money or Your Life',
        author: 'Vicki Robin',
        description:
            'Every purchase is hours of your life. The question is whether that trade was worth it.',
        topic: 'SPEND',
        minPlan: PlanKey.PLUS,
        spendingStyles: [SpendingStyle.SPENDER, SpendingStyle.BALANCED],
        coverId: 6975229,
        isbn13: '9780143115762',
        url: 'https://yourmoneyoryourlife.com/',
    },
    {
        key: 'total-money-makeover',
        name: 'The Total Money Makeover',
        author: 'Dave Ramsey',
        description:
            'Stop the leaks first. A hard order for debt and spending when the jars keep losing.',
        topic: 'SPEND',
        minPlan: PlanKey.PLUS,
        spendingStyles: [SpendingStyle.SPENDER],
        coverId: 6873839,
        isbn13: '9781595555274',
        url: 'https://www.ramseysolutions.com/',
    },
    {
        key: 'profit-first',
        name: 'Profit First',
        author: 'Mike Michalowicz',
        description:
            'Give every euro a job before it is spent. The same move as the jars, written for a business.',
        topic: 'SPEND',
        minPlan: PlanKey.PLUS,
        spendingStyles: [SpendingStyle.SPENDER, SpendingStyle.BALANCED],
        coverId: 13193805,
        isbn13: '9780735214149',
        url: 'https://mikemichalowicz.com/',
    },
    {
        key: 'millionaire-fastlane',
        name: 'The Millionaire Fastlane',
        author: 'MJ DeMarco',
        description:
            'Saving works, and takes decades. This is the faster route — and the cost that comes with it.',
        topic: 'EARN',
        minPlan: PlanKey.MAX,
        spendingStyles: [],
        coverId: 7892520,
        isbn13: '9780984358106',
        url: 'https://www.themillionairefastlane.com/',
    },
    {
        key: 'simple-path',
        name: 'The Simple Path to Wealth',
        author: 'J. L. Collins',
        description:
            'Own the market, keep fees tiny, and leave it alone. Saving that does not need a new decision every month.',
        topic: 'SAVE',
        minPlan: PlanKey.MAX,
        spendingStyles: [SpendingStyle.SAVER],
        coverId: 10448941,
        isbn13: '9781533667922',
        url: 'https://jlcollinsnh.com/',
    },
    {
        key: 'die-with-zero',
        name: 'Die With Zero',
        author: 'Bill Perkins',
        description:
            'Saving has a point, and then it has a cost. Spend on the life while you can still use it.',
        topic: 'SPEND',
        minPlan: PlanKey.MAX,
        spendingStyles: [SpendingStyle.SPENDER, SpendingStyle.SAVER],
        coverId: 10433791,
        isbn13: '9780358099765',
        url: 'https://www.diewithzerobook.com/',
    },
    {
        key: 'science-of-getting-rich',
        name: 'The Science of Getting Rich',
        author: 'Wallace D. Wattles',
        description:
            'The short book The Secret is standing on. Aim, then act in the way that aim requires.',
        topic: 'MIND',
        minPlan: PlanKey.MAX,
        spendingStyles: [],
        coverId: 854989,
        isbn13: '9781585093038',
        url: 'https://www.gutenberg.org/ebooks/59844',
    },
];

/** The original shelf, then the wider one, then the later lanes. Same shape: a pointer, not the book. */
export const BOOK_PRESET_SEED = [...BOOK_PRESET_CORE, ...BOOK_PRESET_EXTRA, ...BOOK_PRESET_LANES];
