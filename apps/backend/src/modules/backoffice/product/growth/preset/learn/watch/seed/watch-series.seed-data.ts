import { PlanKey, SpendingStyle } from '@rumtelo/contracts';

import { series, type WatchSeedRow } from './watch-row';

/**
 * Series we recommend — trailer on YouTube, stream via JustWatch.
 */
export const WATCH_SERIES_SEED: readonly WatchSeedRow[] = [
    series({
        key: 'how-to-get-rich',
        name: 'How to Get Rich',
        creator: 'Ramit Sethi',
        description:
            'Spend on what you named. Cut what you did not. A series about that split, not a lecture.',
        topic: 'SPEND',
        minPlan: PlanKey.PLUS,
        spendingStyles: [SpendingStyle.SPENDER, SpendingStyle.BALANCED],
        youtubeId: 'QlyDIP9jEck',
        url: 'https://www.youtube.com/watch?v=QlyDIP9jEck',
        watchUrl: 'https://www.justwatch.com/nl/tv-series/how-to-get-rich',
    }),
    series({
        key: 'the-fixer',
        name: 'The Fixer',
        creator: 'Marcus Lemonis',
        description:
            'A business is a set of leaks. This is someone walking the floor and naming them.',
        topic: 'SPEND',
        minPlan: PlanKey.MAX,
        spendingStyles: [SpendingStyle.SPENDER],
        youtubeId: 'janFurHb8t0',
        url: 'https://www.youtube.com/watch?v=janFurHb8t0',
        watchUrl: null,
    }),
    series({
        key: 'succession',
        name: 'Succession',
        creator: 'Jesse Armstrong',
        description:
            'Who holds the company when the founder will not let go. A warning about power, not a model.',
        skill: 'LEADERSHIP',
        topic: 'EARN',
        minPlan: PlanKey.MAX,
        spendingStyles: [],
        youtubeId: 'OzYxJV_rmE8',
        url: 'https://www.youtube.com/watch?v=OzYxJV_rmE8',
        watchUrl: 'https://www.justwatch.com/nl/tv-series/succession',
    }),
    series({
        key: 'silicon-valley',
        name: 'Silicon Valley',
        creator: 'Mike Judge',
        description:
            'A small team, a loud market, and the bills that arrive before the product does.',
        topic: 'EARN',
        minPlan: PlanKey.PLUS,
        spendingStyles: [],
        youtubeId: '69V__a49xtw',
        url: 'https://www.youtube.com/watch?v=69V__a49xtw',
        watchUrl: 'https://www.justwatch.com/nl/tv-series/silicon-valley',
    }),
    series({
        key: 'ted-lasso',
        name: 'Ted Lasso',
        creator: 'Bill Lawrence',
        description:
            'A room gets better when the person in charge stops performing and starts listening.',
        skill: 'LEADERSHIP',
        topic: 'EARN',
        minPlan: PlanKey.PLUS,
        spendingStyles: [],
        youtubeId: '3u7EIiohs6U',
        url: 'https://www.youtube.com/watch?v=3u7EIiohs6U',
        watchUrl: 'https://www.justwatch.com/nl/tv-series/ted-lasso',
    }),
    series({
        key: 'the-bear',
        name: 'The Bear',
        creator: 'Christopher Storer',
        description:
            'A kitchen with a clock on the money. Craft, cost, and the people who keep the doors open.',
        topic: 'EARN',
        minPlan: PlanKey.PLUS,
        spendingStyles: [],
        youtubeId: 'vOyRo-Yjr2Q',
        url: 'https://www.youtube.com/watch?v=vOyRo-Yjr2Q',
        watchUrl: 'https://www.justwatch.com/nl/tv-series/the-bear',
    }),
    series({
        key: 'mad-men',
        name: 'Mad Men',
        creator: 'Matthew Weiner',
        description: 'How a message is made, and what it costs the people who make it.',
        topic: 'EARN',
        minPlan: PlanKey.PLUS,
        spendingStyles: [],
        youtubeId: 'aLvQyu9oguE',
        url: 'https://www.youtube.com/watch?v=aLvQyu9oguE',
        watchUrl: 'https://www.justwatch.com/nl/tv-series/mad-men',
    }),
    series({
        key: 'halt-and-catch-fire',
        name: 'Halt and Catch Fire',
        creator: 'Christopher Cantwell',
        description:
            'Building the next machine before the market has a name for it. Ambition with a payroll.',
        topic: 'EARN',
        minPlan: PlanKey.PLUS,
        spendingStyles: [],
        youtubeId: '4NqNvBV8TCs',
        url: 'https://www.youtube.com/watch?v=4NqNvBV8TCs',
        watchUrl: 'https://www.justwatch.com/nl/tv-series/halt-and-catch-fire',
    }),
    series({
        key: 'money-explained',
        name: 'Money, Explained',
        creator: 'Vox',
        description: 'Debt, cards, and the tricks that make spending feel smaller than it is.',
        topic: 'SAVE',
        minPlan: PlanKey.BASIC,
        spendingStyles: [SpendingStyle.SAVER, SpendingStyle.SPENDER],
        youtubeId: 'lJHu-KCY9Fc',
        url: 'https://www.youtube.com/watch?v=lJHu-KCY9Fc',
        watchUrl: 'https://www.justwatch.com/nl/tv-series/money-explained',
    }),
];
