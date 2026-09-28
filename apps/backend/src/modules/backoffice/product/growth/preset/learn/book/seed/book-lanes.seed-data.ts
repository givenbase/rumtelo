import { PlanKey } from '@rumtelo/contracts';

import { book } from './book-row';

/**
 * Later lanes: relationships, health, leadership.
 * Same pointer shape as the rest of the shelf.
 */
export const BOOK_PRESET_LANES = [
    book(
        'five-love-languages',
        'The 5 Love Languages',
        'Gary Chapman',
        'Five ways a person hears that they matter. A relationship spends from the same habits as a jar.',
        'RELATIONSHIPS',
        PlanKey.BASIC,
        'MONEY',
        8314183,
        '9780802412706',
        'https://en.wikipedia.org/wiki/Gary_Chapman_(author)'
    ),
    book(
        'attached',
        'Attached',
        'Amir Levine',
        'How you reach for someone under stress. The pattern shows up in money conversations too.',
        'RELATIONSHIPS',
        PlanKey.PLUS,
        'MONEY',
        8620497,
        '9781585428489',
        'https://en.wikipedia.org/wiki/Amir_Levine'
    ),
    book(
        'hold-me-tight',
        'Hold Me Tight',
        'Sue Johnson',
        'The conversation a couple keeps avoiding. Repair it before it becomes a bill.',
        'RELATIONSHIPS',
        PlanKey.PLUS,
        'MONEY',
        2379203,
        '9780316113014',
        'https://en.wikipedia.org/wiki/Sue_Johnson'
    ),
    book(
        'why-we-sleep',
        'Why We Sleep',
        'Matthew Walker',
        'Sleep is not a luxury line. The next decision is worse when the night was short.',
        'HEALTH',
        PlanKey.PLUS,
        'MONEY',
        8814155,
        '9780141983776',
        'https://en.wikipedia.org/wiki/Matthew_Walker_(scientist)'
    ),
    book(
        'outlive',
        'Outlive',
        'Peter Attia',
        'The long game for a body that still has decades of earning and caring left.',
        'HEALTH',
        PlanKey.MAX,
        'MONEY',
        13191259,
        '9780593236604',
        'https://en.wikipedia.org/wiki/Peter_Attia'
    ),
    book(
        'body-keeps-the-score',
        'The Body Keeps the Score',
        'Bessel van der Kolk',
        'What the body stored does not stay in the past. It shows up in the month you are trying to run.',
        'HEALTH',
        PlanKey.PLUS,
        'MONEY',
        8315367,
        '9780141978611',
        'https://en.wikipedia.org/wiki/Bessel_van_der_Kolk'
    ),
    book(
        'food-rules',
        'Food Rules',
        'Michael Pollan',
        'Eat food. Not too much. Mostly plants. Short rules for the plate, not another diet war.',
        'HEALTH',
        PlanKey.BASIC,
        'MONEY',
        6305235,
        '9780143116387',
        'https://en.wikipedia.org/wiki/Michael_Pollan'
    ),
    book(
        'in-defense-of-food',
        'In Defense of Food',
        'Michael Pollan',
        'Real food before nutritionism. The cultural meal is older than the label on the box.',
        'HEALTH',
        PlanKey.PLUS,
        'MONEY',
        2960867,
        '9781594201455',
        'https://en.wikipedia.org/wiki/Michael_Pollan'
    ),
    book(
        'how-not-to-die',
        'How Not to Die',
        'Michael Greger',
        'What the research keeps saying about plants and the diseases that cut a working life short.',
        'HEALTH',
        PlanKey.PLUS,
        'MONEY',
        7398330,
        '9781250066114',
        'https://en.wikipedia.org/wiki/Michael_Greger'
    ),
    book(
        'limitless',
        'Limitless',
        'Jim Kwik',
        'The owner’s manual after the broken-brain story. Focus, memory, and reading faster on purpose.',
        'MIND',
        PlanKey.BASIC,
        'MONEY',
        9360116,
        '9781401958237',
        'https://en.wikipedia.org/wiki/Jim_Kwik'
    ),
    book(
        'silva-mind-control',
        'The Silva Mind Control Method',
        'José Silva',
        'Meditation and visualization as a practice. Quieter mind, clearer next move.',
        'MIND',
        PlanKey.BASIC,
        'MONEY',
        11998404,
        '9781982185602',
        'https://en.wikipedia.org/wiki/Jos%C3%A9_Silva'
    ),
    book(
        'five-second-rule',
        'The 5 Second Rule',
        'Mel Robbins',
        'Count five, then move. A small habit for the moment you almost talk yourself out of it.',
        'MIND',
        PlanKey.BASIC,
        'MONEY',
        8114155,
        '9781682612385',
        'https://en.wikipedia.org/wiki/Mel_Robbins'
    ),
    book(
        'extreme-ownership',
        'Extreme Ownership',
        'Jocko Willink',
        'The result is yours, including the one you would rather blame. A leadership book, not a slogan.',
        'EARN',
        PlanKey.PLUS,
        'LEADERSHIP',
        12835042,
        '9781250067050',
        'https://en.wikipedia.org/wiki/Jocko_Willink'
    ),
    book(
        'dare-to-lead',
        'Dare to Lead',
        'Brené Brown',
        'Clear is kinder than a room that guesses. Say the hard thing once, cleanly.',
        'EARN',
        PlanKey.PLUS,
        'LEADERSHIP',
        10304768,
        '9781785042140',
        'https://en.wikipedia.org/wiki/Bren%C3%A9_Brown'
    ),
    book(
        'radical-candor',
        'Radical Candor',
        'Kim Scott',
        'Care personally, then say the thing. A team cannot fix what nobody will name.',
        'EARN',
        PlanKey.PLUS,
        'LEADERSHIP',
        8088432,
        '9781509845385',
        'https://en.wikipedia.org/wiki/Kim_Scott'
    ),
    book(
        'making-of-a-manager',
        'The Making of a Manager',
        'Julie Zhuo',
        'The job changes the day people depend on your decisions. This is the first year of that.',
        'EARN',
        PlanKey.PLUS,
        'LEADERSHIP',
        8805106,
        '9780735219564',
        'https://en.wikipedia.org/wiki/Julie_Zhuo'
    ),
    book(
        'wisdom-of-insecurity',
        'The Wisdom of Insecurity',
        'Alan Watts',
        'Anxiety is trying to nail down a future that will not hold still. Sit in the present long enough to choose.',
        'MIND',
        PlanKey.PLUS,
        'MONEY',
        15107747,
        '9780394704685',
        'https://en.wikipedia.org/wiki/Alan_Watts'
    ),
    book(
        'way-of-zen',
        'The Way of Zen',
        'Alan Watts',
        'Zen without the costume. Attention as a practice, not a brand.',
        'MIND',
        PlanKey.PLUS,
        'MONEY',
        12697943,
        '9781473590878',
        'https://en.wikipedia.org/wiki/Alan_Watts'
    ),
    book(
        'the-book-watts',
        'The Book',
        'Alan Watts',
        'On the taboo against knowing who you are. A short cut through the story you tell about yourself.',
        'MIND',
        PlanKey.PLUS,
        'MONEY',
        419830,
        '9780679723004',
        'https://en.wikipedia.org/wiki/Alan_Watts'
    ),
    book(
        'natural-cures-trudeau',
        'Natural Cures "They" Don\'t Want You to Know About',
        'Kevin Trudeau',
        'A loud claim about hidden cures. Read it for the questions it raises about who profits from illness — not as a protocol.',
        'HEALTH',
        PlanKey.MAX,
        'MONEY',
        741393,
        '9780975599518',
        'https://en.wikipedia.org/wiki/Kevin_Trudeau'
    ),
    book(
        'debt-cures-trudeau',
        'Debt Cures "They" Don\'t Want You to Know About',
        'Kevin Trudeau',
        'Debt marketing with a hard sell. Use it to spot the pitch — not to follow the pitch.',
        'SPEND',
        PlanKey.MAX,
        'MONEY',
        12472080,
        '9780982513712',
        'https://en.wikipedia.org/wiki/Kevin_Trudeau'
    ),
];
