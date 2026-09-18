/**
 * Curated Learn shelf. Courses stay here.
 * Books, films, series, and videos we recommend live in the preset catalogs.
 *
 * Courses follow the plan: Udemy on Basic and Plus, Masterclass on Max.
 */

import {
    type LearnBookPreset,
    type LearnBook,
    type LearnWatchPreset,
    LearnWatchKind,
    Locale,
    PLAN_RANK,
    PlanKey,
    SpendingStyle,
} from '@rumtelo/contracts';

export type LearnFormat = 'BOOK' | 'FILM' | 'SERIES' | 'VIDEO' | 'COURSE';
export type LearnStatus = 'NOW' | 'QUEUE' | 'DONE' | 'SHELF';

/** One link out. We recommend and point; we never host. */
export type LearnLink = { label: string; href: string };

export type LearnPiece = {
    id: string;
    format: LearnFormat;
    skill: LearnSkill;
    title: string;
    by: string;
    use: string;
    status: LearnStatus;
    /** Open Library cover id — https://covers.openlibrary.org/b/id/{id}-L.jpg */
    coverId?: number;
    /** YouTube id — poster is https://i.ytimg.com/vi/{id}/hqdefault.jpg */
    youtubeId?: string;
    /** Where to get it: the store, the streaming page, the class. */
    primary: LearnLink;
    /** The free text, the trailer, or the author. */
    secondary?: LearnLink;
    partner?: string;
    /** Learning section key. Not an enum. */
    topic?: string;
    minPlan?: PlanKey;
};

/**
 * The skills we teach. Add a row here. The stored value is the key, not a database enum.
 * Labels and the type both come from this list — do not copy the keys elsewhere.
 */
export const SKILLS = [
    {
        key: 'MONEY',
        name: 'Money',
        why: 'Behaviour changes slow progress faster than a better strategy.',
        tint: 'var(--color-jar-ff)',
        line: 'How you decide',
    },
    {
        key: 'COMMUNICATION',
        name: 'Communication',
        why: 'Earning power follows how clearly you can ask, explain, and hold a room.',
        tint: 'var(--color-jar-edu)',
        line: 'How it lands',
    },
    {
        key: 'MARKETING',
        name: 'Marketing',
        why: 'A skill nobody hears about stays a hobby. This is how the work pays the Education jar back.',
        tint: 'var(--color-jar-play)',
        line: 'How the work is found',
    },
    {
        key: 'LEADERSHIP',
        name: 'Leadership',
        why: 'A team moves when someone owns the decision and says it plainly.',
        tint: 'var(--color-jar-lts)',
        line: 'How the room is led',
    },
] as const;

export type LearnSkill = (typeof SKILLS)[number]['key'];
export type LearnSkillDef = (typeof SKILLS)[number];

/**
 * Learning sections. Add a row here. The stored value is the key, like a category key.
 * Labels come from this list — not from an enum.
 */
export const SECTIONS = [
    { key: 'MIND', name: 'Mindset' },
    { key: 'SAVE', name: 'Saving' },
    { key: 'SPEND', name: 'Spending' },
    { key: 'EARN', name: 'Earning more' },
    { key: 'RELATIONSHIPS', name: 'Relationships' },
    { key: 'HEALTH', name: 'Health' },
] as const;

/** Where a course is bought. A key, so the next school is a row, not a union. */
export const PARTNERS = [
    { key: 'UDEMY', name: 'Udemy' },
    { key: 'MASTERCLASS', name: 'Masterclass' },
] as const;

export const FORMAT_ORDER: readonly LearnFormat[] = ['BOOK', 'FILM', 'SERIES', 'VIDEO', 'COURSE'];

export const PIECES: readonly LearnPiece[] = [
    {
        id: 'udemy-communication',
        format: 'COURSE',
        skill: 'COMMUNICATION',
        title: 'Communication Skills Master Class',
        by: 'TJ Walker · Udemy',
        use: 'Interviews, raises, rooms, and the one-to-one. A practical class, not a lecture series.',
        status: 'SHELF',
        primary: {
            label: 'View on Udemy',
            href: 'https://www.udemy.com/course/the-complete-communication-skills-master-class-for-life/',
        },
        partner: 'UDEMY',
    },
    {
        id: 'udemy-marketing',
        format: 'COURSE',
        skill: 'MARKETING',
        title: 'Marketing Strategy: Winning Messages',
        by: 'TJ Walker · Udemy',
        use: 'Cut a hundred messages down to the three a stranger can repeat.',
        status: 'SHELF',
        primary: {
            label: 'View on Udemy',
            href: 'https://www.udemy.com/course/how-to-create-winning-messages/',
        },
        partner: 'UDEMY',
    },
    {
        id: 'mc-voss',
        format: 'COURSE',
        skill: 'COMMUNICATION',
        title: 'The Art of Negotiation',
        by: 'Chris Voss · Masterclass',
        use: 'Tactical empathy for the conversations where the number, or the no, actually matters.',
        status: 'SHELF',
        primary: {
            label: 'View on Masterclass',
            href: 'https://www.masterclass.com/classes/chris-voss-teaches-the-art-of-negotiation',
        },
        partner: 'MASTERCLASS',
    },
    {
        id: 'mc-pink',
        format: 'COURSE',
        skill: 'MARKETING',
        title: 'Sales and Persuasion',
        by: 'Daniel Pink · Masterclass',
        use: 'How to frame an offer so the right person can say yes without being pushed.',
        status: 'SHELF',
        primary: {
            label: 'View on Masterclass',
            href: 'https://www.masterclass.com/classes/daniel-pink-teaches-sales-and-persuasion',
        },
        partner: 'MASTERCLASS',
    },
    {
        id: 'mc-blakely',
        format: 'COURSE',
        skill: 'MONEY',
        title: 'Self-Made Entrepreneurship',
        by: 'Sara Blakely · Masterclass',
        use: 'Invent, sell, and get a product known — bootstrapped, not borrowed.',
        status: 'SHELF',
        primary: {
            label: 'View on Masterclass',
            href: 'https://www.masterclass.com/classes/sara-blakely-teaches-self-made-entrepreneurship',
        },
        partner: 'MASTERCLASS',
        topic: 'EARN',
    },
    {
        id: 'mc-iger',
        format: 'COURSE',
        skill: 'LEADERSHIP',
        title: 'Business Strategy and Leadership',
        topic: 'EARN',
        by: 'Bob Iger · Masterclass',
        use: 'Three priorities, then the capital follows. How Disney was steered, not decorated.',
        status: 'SHELF',
        primary: {
            label: 'View on Masterclass',
            href: 'https://www.masterclass.com/classes/bob-iger-teaches-business-strategy-and-leadership',
        },
        partner: 'MASTERCLASS',
    },
    {
        id: 'mc-wintour',
        format: 'COURSE',
        skill: 'LEADERSHIP',
        title: 'Creativity and Leadership',
        topic: 'EARN',
        by: 'Anna Wintour · Masterclass',
        use: 'A point of view, a room that can hold it, and the edit that makes the work recognizable.',
        status: 'SHELF',
        primary: {
            label: 'View on Masterclass',
            href: 'https://www.masterclass.com/classes/anna-wintour-teaches-creativity-and-leadership',
        },
        partner: 'MASTERCLASS',
    },
    {
        id: 'mc-gladwell',
        format: 'COURSE',
        skill: 'COMMUNICATION',
        title: 'Writing',
        by: 'Malcolm Gladwell · Masterclass',
        use: 'How a strange fact becomes a sentence someone else can retell.',
        status: 'SHELF',
        primary: {
            label: 'View on Masterclass',
            href: 'https://www.masterclass.com/classes/malcolm-gladwell-teaches-writing',
        },
        partner: 'MASTERCLASS',
    },
    {
        id: 'mc-sorkin',
        format: 'COURSE',
        skill: 'COMMUNICATION',
        title: 'Screenwriting',
        by: 'Aaron Sorkin · Masterclass',
        use: 'Intention and obstacle. The same shape as a hard conversation.',
        status: 'SHELF',
        primary: {
            label: 'View on Masterclass',
            href: 'https://www.masterclass.com/classes/aaron-sorkin-teaches-screenwriting',
        },
        partner: 'MASTERCLASS',
    },
    {
        id: 'mc-rhimes',
        format: 'COURSE',
        skill: 'COMMUNICATION',
        title: 'Writing for Television',
        by: 'Shonda Rhimes · Masterclass',
        use: 'Say the thing, then say it so the room stays. A class on holding attention.',
        status: 'SHELF',
        primary: {
            label: 'View on Masterclass',
            href: 'https://www.masterclass.com/classes/shonda-rhimes-teaches-writing-for-television',
        },
        partner: 'MASTERCLASS',
    },
    {
        id: 'mc-dvf',
        format: 'COURSE',
        skill: 'MARKETING',
        title: 'Building a Fashion Business',
        by: 'Diane von Furstenberg · Masterclass',
        use: 'One product people can name, then the discipline to keep it that.',
        status: 'SHELF',
        primary: {
            label: 'View on Masterclass',
            href: 'https://www.masterclass.com/classes/diane-von-furstenberg-teaches-building-a-fashion-business',
        },
        partner: 'MASTERCLASS',
    },
    {
        id: 'udemy-digital-marketing',
        format: 'COURSE',
        skill: 'MARKETING',
        title: 'The Complete Digital Marketing Course',
        by: 'Rob Percival · Udemy',
        use: 'Search, ads, and the page a stranger lands on. Practical, not a brand manifesto.',
        status: 'SHELF',
        primary: {
            label: 'View on Udemy',
            href: 'https://www.udemy.com/course/the-complete-digital-marketing-course-12-courses-in-1/',
        },
        partner: 'UDEMY',
    },
];

export function skillDef(key: LearnSkill): LearnSkillDef {
    return SKILLS.find(skill => skill.key === key) ?? SKILLS[0];
}

export function formatLabel(format: LearnFormat): string {
    if (format === 'BOOK') return 'Book';
    if (format === 'FILM') return 'Film';
    if (format === 'SERIES') return 'Series';
    if (format === 'VIDEO') return 'Video';
    return 'Course';
}

export function partnerLabel(partner: string | undefined): string {
    return PARTNERS.find(row => row.key === partner)?.name ?? 'Recommend';
}

export function pickLabel(format: LearnFormat, status: LearnStatus): string {
    const watch = format === 'FILM' || format === 'SERIES' || format === 'VIDEO';
    if (status === 'QUEUE') {
        if (format === 'BOOK') return 'Need to read';
        if (watch) return 'Need to watch';
        return 'Need to take';
    }
    if (status === 'NOW') {
        if (format === 'BOOK') return 'Reading';
        if (watch) return 'Watching';
        return 'Taking';
    }
    if (status === 'DONE') {
        if (format === 'BOOK') return 'Read';
        if (watch) return 'Watched';
        return 'Finished';
    }
    return 'Shelf';
}

/** A few titles start already in motion so the board is not empty. */
export const BOOK_STARTER: Partial<Record<string, LearnStatus>> = {
    'psychology-of-money': 'NOW',
    'millionaire-mind': 'QUEUE',
    'millionaire-fastlane': 'QUEUE',
    iwt: 'DONE',
};

export const TOPIC_ORDER: readonly string[] = SECTIONS.map(section => section.key);

export function topicLabel(topic: string): string {
    return SECTIONS.find(section => section.key === topic)?.name ?? topic;
}

/**
 * One plain answer to "what is this about?". A section key, or a skill that is
 * not Money. Both lists live above. A new row shows up here without a second copy.
 */
export type LearnAbout = string;

export const ABOUT_ORDER: readonly string[] = [
    ...TOPIC_ORDER,
    ...SKILLS.flatMap(skill => (skill.key === 'MONEY' ? [] : [skill.key])),
];

export function aboutOf(piece: LearnPiece): string {
    const skill = SKILLS.find(row => row.key === piece.skill);
    if (skill && skill.key !== 'MONEY') return skill.key;
    return piece.topic ?? 'MIND';
}

export function aboutLabel(about: string): string {
    const skill = SKILLS.find(row => row.key === about);
    if (skill) return skill.name;
    return topicLabel(about);
}

/** File an "about" chip as a section key plus a skill key. Money is the default skill. */
export function aboutFields(about: string): { topic: string; skill: LearnSkill } {
    const skill = SKILLS.find(row => row.key === about);
    if (skill && skill.key !== 'MONEY') return { topic: 'MIND', skill: skill.key };
    return { topic: about, skill: 'MONEY' };
}

/** Plural, for the "what" filter row. */
export function formatPlural(format: LearnFormat): string {
    if (format === 'BOOK') return 'Books';
    if (format === 'FILM') return 'Films';
    if (format === 'SERIES') return 'Series';
    if (format === 'VIDEO') return 'Videos';
    return 'Courses';
}

export function matchesSearch(piece: LearnPiece, query: string): boolean {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [piece.title, piece.by, piece.use, formatLabel(piece.format), aboutLabel(aboutOf(piece))]
        .join(' ')
        .toLowerCase()
        .includes(needle);
}

export function bookVisible(minPlan: PlanKey, plan: PlanKey): boolean {
    return PLAN_RANK[plan] >= PLAN_RANK[minPlan];
}

/** Suggestion, not a lock. Unknown style sees the mindset canon. */
export function bookSuggested(
    topic: string,
    styles: readonly SpendingStyle[],
    style: SpendingStyle
): boolean {
    if (style === SpendingStyle.SAVER) {
        return topic === 'SAVE' || styles.includes(SpendingStyle.SAVER);
    }
    if (style === SpendingStyle.SPENDER) {
        return topic === 'SPEND' || styles.includes(SpendingStyle.SPENDER);
    }
    if (style === SpendingStyle.BALANCED) {
        return styles.includes(SpendingStyle.BALANCED) || topic === 'MIND';
    }
    return topic === 'MIND';
}

/* ------------------------------------------------------------------ */
/* Store links                                                         */
/* ------------------------------------------------------------------ */

export type BookStore = 'BOL' | 'AMAZON';

export type StoreTags = {
    /** bol.com partner site id. Undefined = plain link. */
    bolPartnerId?: string;
    /** Amazon Associates tag. Undefined = plain link. */
    amazonTag?: string;
};

/** Dutch households buy at bol.com; everyone else is sent to Amazon. */
export function storeFor(locale: Locale): BookStore {
    return locale === Locale.NL ? 'BOL' : 'AMAZON';
}

export function storeName(store: BookStore): string {
    return store === 'BOL' ? 'bol.com' : 'Amazon';
}

/** ISBN-13 with a 978 prefix folds to the ISBN-10 Amazon uses as ASIN. */
export function isbn13To10(isbn13: string): string | null {
    if (!/^978\d{10}$/.test(isbn13)) return null;
    const core = isbn13.slice(3, 12);
    const sum = core.split('').reduce((acc, digit, i) => acc + Number(digit) * (10 - i), 0);
    const check = (11 - (sum % 11)) % 11;
    return core + (check === 10 ? 'X' : String(check));
}

export function storeLink(isbn13: string, store: BookStore, tags: StoreTags): LearnLink {
    if (store === 'BOL') {
        const target = `https://www.bol.com/nl/nl/s/?searchtext=${isbn13}`;
        const href = tags.bolPartnerId
            ? `https://partner.bol.com/click/click?p=2&t=url&s=${encodeURIComponent(tags.bolPartnerId)}&url=${encodeURIComponent(target)}&f=TXL`
            : target;
        return { label: 'Get the book', href };
    }
    const isbn10 = isbn13To10(isbn13);
    const url = new URL(isbn10 ? `https://www.amazon.nl/dp/${isbn10}` : 'https://www.amazon.nl/s');
    if (!isbn10) url.searchParams.set('k', isbn13);
    if (tags.amazonTag) url.searchParams.set('tag', tags.amazonTag);
    return { label: 'Get the book', href: url.toString() };
}

/** Public-domain hosts we point at with "Read free". */
function isFreeText(url: string): boolean {
    return /(^|\.)(gutenberg\.org|wikisource\.org)$/.test(new URL(url).hostname);
}

export function asLearnSkill(skill: string): LearnSkill {
    const found = SKILLS.find(row => row.key === skill);
    return found ? found.key : 'MONEY';
}

export function bookToPiece(book: LearnBookPreset, store: BookStore, tags: StoreTags): LearnPiece {
    const pointer: LearnLink = {
        label: isFreeText(book.url) ? 'Read free' : 'Author',
        href: book.url,
    };
    return {
        id: book.key,
        format: 'BOOK',
        skill: asLearnSkill(book.skill),
        title: book.name,
        by: book.author,
        use: book.description,
        status: BOOK_STARTER[book.key] ?? 'SHELF',
        coverId: book.coverId ?? undefined,
        primary: book.isbn13 ? storeLink(book.isbn13, store, tags) : pointer,
        secondary: book.isbn13 ? pointer : undefined,
        topic: book.topic,
        minPlan: book.minPlan,
    };
}

/** A household-added book uses the same card as a recommendation. Theirs is never plan-gated. */
export function addedBookToPiece(book: LearnBook, store: BookStore, tags: StoreTags): LearnPiece {
    return bookToPiece(
        {
            key: book.id,
            sortOrder: 0,
            name: book.name,
            author: book.author,
            description: book.description,
            skill: book.skill,
            topic: book.topic,
            minPlan: PlanKey.BASIC,
            spendingStyles: [],
            coverId: book.coverId,
            isbn13: book.isbn13,
            url: book.url,
        },
        store,
        tags
    );
}

export function watchToPiece(watch: LearnWatchPreset): LearnPiece {
    const video = watch.format === LearnWatchKind.VIDEO;
    const pointer: LearnLink = { label: video ? 'Watch' : 'Trailer', href: watch.url };
    return {
        id: watch.key,
        format: watch.format,
        skill: asLearnSkill(watch.skill),
        title: watch.name,
        by: watch.creator,
        use: watch.description,
        status: 'SHELF',
        youtubeId: watch.youtubeId ?? undefined,
        primary: watch.watchUrl
            ? { label: 'Where to watch', href: watch.watchUrl }
            : { label: video ? 'Watch' : 'Watch on YouTube', href: watch.url },
        secondary: watch.watchUrl ? pointer : undefined,
        topic: watch.topic,
        minPlan: watch.minPlan,
    };
}
