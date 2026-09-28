/**
 * Curated Learn shelf helpers.
 * Books, films, series, videos, podcasts, and courses come from watch/book presets via the API.
 * Course school is filtered by plan via merchantKey (UDEMY vs MASTERCLASS); CTA labels use merchantKey dynamically.
 */

import type { IconName } from '@rumtelo/ui';
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

export type LearnFormat = 'BOOK' | 'FILM' | 'SERIES' | 'VIDEO' | 'PODCAST' | 'COURSE';
export type LearnStatus = 'NOW' | 'QUEUE' | 'DONE' | 'SHELF';

/** Stable keys for outbound link CTAs — resolved via `features.growth.learn.catalog.links.*`.
 * Platform names (Spotify, Udemy, …) come from `merchantKey`, not from this union. */
export type LearnLinkKey =
    | 'get_book'
    | 'read_free'
    | 'author'
    | 'watch'
    | 'trailer'
    | 'where_to_watch'
    | 'listen'
    | 'where_to_listen'
    /** Watch / listen / view on {merchant name}. */
    | 'watch_on'
    | 'listen_on'
    | 'view_on';

/** One link out. We recommend and point; we never host. */
export type LearnLink = {
    labelKey: LearnLinkKey;
    href: string;
    /** Overrides piece.merchantKey when this CTA’s home differs (e.g. Spotify primary, YouTube secondary). */
    merchantKey?: string;
};

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
    /** MerchantPreset.key when one company is the open-home (UDEMY, SPOTIFY, …). */
    merchantKey?: string;
    /** This household added it. The note is the coach, not a blurb. */
    added?: boolean;
    /** Learning section key. Not an enum. */
    topic?: string;
    minPlan?: PlanKey;
};

/**
 * The skills we teach. Add a row here. The stored value is the key, not a database enum.
 * Labels come from i18n (`catalog.skill.*`); tint is for UI chips.
 */
export const SKILLS = [
    {
        key: 'MONEY',
        name: 'Money',
        tint: 'var(--color-jar-ff)',
    },
    {
        key: 'COMMUNICATION',
        name: 'Communication',
        tint: 'var(--color-jar-edu)',
    },
    {
        key: 'MARKETING',
        name: 'Marketing',
        tint: 'var(--color-jar-play)',
    },
    {
        key: 'LEADERSHIP',
        name: 'Leadership',
        tint: 'var(--color-jar-lts)',
    },
] as const;

export type LearnSkill = (typeof SKILLS)[number]['key'];
export type LearnSkillDef = (typeof SKILLS)[number];

/**
 * Learning sections. Add a row here. The stored value is the key, like a category key.
 * Labels come from i18n (`catalog.section.*`).
 */
export const SECTIONS = [
    { key: 'MIND', name: 'Mindset' },
    { key: 'SAVE', name: 'Saving' },
    { key: 'SPEND', name: 'Spending' },
    { key: 'EARN', name: 'Earning more' },
    { key: 'RELATIONSHIPS', name: 'Relationships' },
    { key: 'HEALTH', name: 'Health' },
] as const;

export const FORMAT_ORDER: readonly LearnFormat[] = [
    'BOOK',
    'COURSE',
    'FILM',
    'SERIES',
    'VIDEO',
    'PODCAST',
];

/** Lucide names for format filter chips and section headings. */
export const FORMAT_ICON: Record<LearnFormat, IconName> = {
    BOOK: 'book-open',
    FILM: 'film',
    SERIES: 'tv',
    VIDEO: 'video',
    PODCAST: 'headphones',
    COURSE: 'graduation-cap',
};

export function skillDef(key: LearnSkill): LearnSkillDef {
    return SKILLS.find(skill => skill.key === key) ?? SKILLS[0];
}

/** English tokens for client search only — UI labels come from `useLearnCatalogLabels`. */
function formatSearchLabel(format: LearnFormat): string {
    if (format === 'BOOK') return 'Book';
    if (format === 'FILM') return 'Film';
    if (format === 'SERIES') return 'Series';
    if (format === 'VIDEO') return 'Video';
    if (format === 'PODCAST') return 'Podcast';
    return 'Course';
}

/** A few titles start already in motion so the board is not empty. */
export const BOOK_STARTER: Partial<Record<string, LearnStatus>> = {
    'psychology-of-money': 'NOW',
    'millionaire-mind': 'QUEUE',
    'millionaire-fastlane': 'QUEUE',
    iwt: 'DONE',
};

export const TOPIC_ORDER: readonly string[] = SECTIONS.map(section => section.key);

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

function aboutSearchLabel(about: string): string {
    const skill = SKILLS.find(row => row.key === about);
    if (skill) return skill.name;
    return SECTIONS.find(section => section.key === about)?.name ?? about;
}

/** File an "about" chip as a section key plus a skill key. Money is the default skill. */
export function aboutFields(about: string): { topic: string; skill: LearnSkill } {
    const skill = SKILLS.find(row => row.key === about);
    if (skill && skill.key !== 'MONEY') return { topic: 'MIND', skill: skill.key };
    return { topic: about, skill: 'MONEY' };
}

export function matchesSearch(piece: LearnPiece, query: string): boolean {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [
        piece.title,
        piece.by,
        piece.use,
        piece.merchantKey,
        formatSearchLabel(piece.format),
        aboutSearchLabel(aboutOf(piece)),
    ]
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
        return { labelKey: 'get_book', href };
    }
    const isbn10 = isbn13To10(isbn13);
    const url = new URL(isbn10 ? `https://www.amazon.nl/dp/${isbn10}` : 'https://www.amazon.nl/s');
    if (!isbn10) url.searchParams.set('k', isbn13);
    if (tags.amazonTag) url.searchParams.set('tag', tags.amazonTag);
    return { labelKey: 'get_book', href: url.toString() };
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
        labelKey: isFreeText(book.url) ? 'read_free' : 'author',
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
    return {
        ...bookToPiece(
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
        ),
        added: true,
    };
}

export function watchToPiece(watch: LearnWatchPreset): LearnPiece {
    const merchantKey = watch.merchantKey ?? undefined;
    if (watch.format === LearnWatchKind.COURSE) {
        return {
            id: watch.key,
            format: 'COURSE',
            skill: asLearnSkill(watch.skill),
            title: watch.name,
            by: watch.creator,
            use: watch.description,
            status: 'SHELF',
            youtubeId: watch.youtubeId ?? undefined,
            primary: {
                labelKey: 'view_on',
                href: watch.url,
                merchantKey,
            },
            merchantKey,
            topic: watch.topic,
            minPlan: watch.minPlan,
        };
    }
    if (watch.format === LearnWatchKind.PODCAST) {
        return {
            id: watch.key,
            format: 'PODCAST',
            skill: asLearnSkill(watch.skill),
            title: watch.name,
            by: watch.creator,
            use: watch.description,
            status: 'SHELF',
            youtubeId: watch.youtubeId ?? undefined,
            primary: watch.watchUrl
                ? {
                      labelKey: merchantKey ? 'listen_on' : 'where_to_listen',
                      href: watch.watchUrl,
                      merchantKey,
                  }
                : { labelKey: 'listen', href: watch.url, merchantKey },
            secondary: watch.watchUrl ? { labelKey: 'watch', href: watch.url } : undefined,
            merchantKey,
            topic: watch.topic,
            minPlan: watch.minPlan,
        };
    }
    const video = watch.format === LearnWatchKind.VIDEO;
    const pointer: LearnLink = {
        labelKey: video ? 'watch' : 'trailer',
        href: watch.url,
        merchantKey,
    };
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
            ? { labelKey: 'where_to_watch', href: watch.watchUrl }
            : merchantKey
              ? { labelKey: 'watch_on', href: watch.url, merchantKey }
              : { labelKey: video ? 'watch' : 'trailer', href: watch.url },
        secondary: watch.watchUrl ? pointer : undefined,
        merchantKey,
        topic: watch.topic,
        minPlan: watch.minPlan,
    };
}
