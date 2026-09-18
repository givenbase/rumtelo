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
];
