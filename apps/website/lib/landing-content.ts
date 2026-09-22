/**
 * Landing structure — keys, percentages, icons, media paths, demo numbers.
 *
 * Marketing copy lives in `@rumtelo/i18n` under `pages.landing.*`.
 * Feature claims and plan limits come from `@rumtelo/contracts`.
 */
import { DEFAULT_JAR_SPLIT, JarKey, PlanKey } from '@rumtelo/contracts';

/* ─────────────────────────── icons ─────────────────────────── */

export type IconName =
    | 'home'
    | 'trend'
    | 'book'
    | 'lock'
    | 'sparkle'
    | 'heart'
    | 'wallet'
    | 'shield'
    | 'eye'
    | 'db'
    | 'moon'
    | 'compass'
    | 'inbox'
    | 'clock'
    | 'flag'
    | 'users';

export const ICON_PATHS: Record<IconName, string[]> = {
    home: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
    trend: ['M22 7l-8.5 8.5-5-5L2 17', 'M16 7h6v6'],
    book: [
        'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z',
        'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z',
    ],
    lock: [
        'M7 11V7a5 5 0 0 1 10 0v4',
        'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z',
    ],
    sparkle: [
        'M12 3l-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z',
    ],
    heart: [
        'M19 14c1.5-1.4 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.1 3 5.5l7 7z',
    ],
    wallet: [
        'M21 12V7H5a2 2 0 0 1 0-4h14v4',
        'M3 5v14a2 2 0 0 0 2 2h16v-5',
        'M18 12a2 2 0 0 0 0 4h4v-4z',
    ],
    shield: [
        'M20 13c0 5-3.5 7.5-7.7 8.9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z',
    ],
    eye: [
        'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z',
        'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    ],
    db: [
        'M12 8c5 0 9-1.3 9-3s-4-3-9-3-9 1.3-9 3 4 3 9 3z',
        'M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5',
        'M3 12c0 1.7 4 3 9 3s9-1.3 9-3',
    ],
    moon: ['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'],
    compass: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M16.2 7.8l-2.1 6.3-6.3 2.1 2.1-6.3z'],
    inbox: [
        'M22 12h-6l-2 3h-4l-2-3H2',
        'M5.5 5.1L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z',
    ],
    clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2'],
    flag: ['M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z', 'M4 22v-7'],
    users: [
        'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2',
        'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
        'M23 21v-2a4 4 0 0 0-3-3.9',
        'M16 3.1a4 4 0 0 1 0 7.8',
    ],
};

/* ─────────────────────────── hero ─────────────────────────── */

/**
 * Ambient background video behind the hero. Decorative only — the scrim in
 * `landing-hero.tsx` keeps the copy readable over it.
 * TEMP — Pexels clip (free licence). Self-host the final in /public/media/ before launch.
 */
export const HERO_VIDEO = {
    src: 'https://videos.pexels.com/video-files/18069235/18069235-hd_1920_1080_24fps.mp4',
    poster: '/media/hero-poster.jpg',
} as const;

export const DEMO_INCOME_DEFAULT = 4300;

/* ─────────────────────────── jars ─────────────────────────── */

export interface Jar {
    key: string;
    pct: number;
    /** Theme token — `--color-jar-*` in packages/config/tailwind/theme.css. */
    colorVar: string;
    icon: IconName;
}

export const JARS: Jar[] = [
    {
        key: 'nec',
        pct: DEFAULT_JAR_SPLIT[JarKey.NECESSITIES],
        colorVar: 'var(--color-jar-nec)',
        icon: 'home',
    },
    {
        key: 'ff',
        pct: DEFAULT_JAR_SPLIT[JarKey.FINANCIAL_FREEDOM],
        colorVar: 'var(--color-jar-ff)',
        icon: 'trend',
    },
    {
        key: 'edu',
        pct: DEFAULT_JAR_SPLIT[JarKey.EDUCATION],
        colorVar: 'var(--color-jar-edu)',
        icon: 'book',
    },
    {
        key: 'lts',
        pct: DEFAULT_JAR_SPLIT[JarKey.LONG_TERM_SAVINGS],
        colorVar: 'var(--color-jar-lts)',
        icon: 'lock',
    },
    {
        key: 'play',
        pct: DEFAULT_JAR_SPLIT[JarKey.PLAY],
        colorVar: 'var(--color-jar-play)',
        icon: 'sparkle',
    },
    {
        key: 'give',
        pct: DEFAULT_JAR_SPLIT[JarKey.GIVE],
        colorVar: 'var(--color-jar-give)',
        icon: 'heart',
    },
];

/* ─────────────────────────── portals ─────────────────────────── */

export interface Portal {
    key: 'money' | 'growth' | 'energy' | 'soul';
    /** Tint — mirrors apps/application/app/_lib/portal-hubs.ts. */
    colorVar: string;
    icon: IconName;
    /** Optional screen recording; until then the landing renders a hand-built animation. */
    media?: { video: string; poster?: string };
}

const PLACEHOLDER_MEDIA: NonNullable<Portal['media']> = {
    video: 'https://videos.pexels.com/video-files/3130284/3130284-hd_1920_1080_30fps.mp4',
    poster: 'https://images.pexels.com/videos/3130284/free-video-3130284.jpg?auto=compress&w=1280',
};

export const PORTALS: Portal[] = [
    {
        key: 'money',
        colorVar: 'var(--color-jar-give)',
        icon: 'wallet',
        media: PLACEHOLDER_MEDIA,
    },
    {
        key: 'growth',
        colorVar: 'var(--color-jar-lts)',
        icon: 'compass',
        media: PLACEHOLDER_MEDIA,
    },
    {
        key: 'energy',
        colorVar: 'var(--color-jar-play)',
        icon: 'moon',
        media: PLACEHOLDER_MEDIA,
    },
    {
        key: 'soul',
        colorVar: 'var(--color-portal-soul)',
        icon: 'sparkle',
        media: PLACEHOLDER_MEDIA,
    },
];

/* Demo data for the mock screens — plausible numbers and keys only. */

export const PORTAL_DEMO_MONEY = {
    rows: [
        { key: 'salary', amount: '+€4,300', colorVar: 'var(--color-accent)' },
        { key: 'groceries', amount: '−€38.65', colorVar: 'var(--color-jar-nec)' },
        { key: 'coffee', amount: '−€5.20', colorVar: 'var(--color-jar-play)' },
        { key: 'debt', amount: '−€310', colorVar: 'var(--color-jar-ff)' },
    ],
    overLine: { jarKey: 'play', over: '€38' },
} as const;

export const PORTAL_DEMO_GROWTH = {
    goals: [
        { key: 'emergency', pct: 64 },
        { key: 'side_income', pct: 20 },
        { key: 'course', pct: 30 },
    ],
    income: [3900, 3950, 4100, 4050, 4300, 4450],
} as const;

export const PORTAL_DEMO_ENERGY = {
    nights: [6.2, 7.3, 5.9, 7.4, 6.4, 8.0, 7.3],
    floor: 6.5,
    dayKeys: ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'] as const,
    hours: [
        { key: 'sleep', value: 51, colorVar: 'var(--color-jar-play)' },
        { key: 'work', value: 40, colorVar: 'var(--color-jar-nec)' },
        { key: 'move', value: 6, colorVar: 'var(--color-jar-ff)' },
        { key: 'yours', value: 71, colorVar: 'var(--color-accent)' },
    ],
} as const;

export const PORTAL_DEMO_SOUL = {
    stillnessSeconds: 60,
    streakDays: 6,
    gratitudeKeys: ['g1', 'g2', 'g3'] as const,
} as const;

/* ─────────────────────────── principles ─────────────────────────── */

/** Icons only — copy via `pages.landing.principles.*`. */
export const PRINCIPLES: { icon: IconName }[] = [
    { icon: 'wallet' },
    { icon: 'clock' },
    { icon: 'moon' },
    { icon: 'shield' },
];

/* ─────────────────────────── pricing ─────────────────────────── */

export interface Plan {
    key: PlanKey;
    monthly: number;
    yearly: number;
}

export const PLANS: Plan[] = [
    { key: PlanKey.BASIC, monthly: 0, yearly: 0 },
    { key: PlanKey.PLUS, monthly: 9, yearly: 90 },
    { key: PlanKey.MAX, monthly: 19, yearly: 190 },
];

/* ─────────────────────────── footer ─────────────────────────── */

export const TRUST_BADGE_KEYS = ['eu_hosted', 'readonly', 'gdpr', 'tls'] as const;

/* ─────────────────────────── hero ambience ─────────────────────────── */

/** Floating label slots — copy via `pages.landing.floaters.*`. */
const FLOATER_SLOTS = [
    ['f1', 6, 4, 14, 0, 0.14],
    ['f2', 15, 46, 11, 3.5, 0.1],
    ['f3', 26, 22, 12, 7, 0.12],
    ['f4', 36, 60, 10, 1.8, 0.09],
    ['f5', 47, 12, 11, 5.2, 0.11],
    ['f6', 56, 40, 12, 9.4, 0.1],
    ['f7', 66, 68, 10, 2.6, 0.08],
    ['f8', 76, 30, 13, 6.1, 0.12],
    ['f9', 85, 55, 10, 8.3, 0.09],
    ['f10', 62, 8, 11, 4.4, 0.11],
    ['f11', 92, 18, 12, 1.1, 0.12],
    ['f12', 10, 72, 10, 10.6, 0.08],
] as const;

export const FLOATERS = FLOATER_SLOTS.map(([key, left, top, size, delay, opacity], i) => ({
    key,
    left: `${left}%`,
    top: `${top}%`,
    size: `${size}px`,
    dur: `${14 + (i % 5) * 3}s`,
    delay: `${delay}s`,
    opacity,
    color: i % 3 === 0 ? 'var(--color-accent)' : 'var(--color-fg-muted)',
}));

const TICKER_SLOTS = [
    ['t1', 'var(--color-success)'],
    ['t2', 'var(--color-fg-muted)'],
    ['t3', 'var(--color-jar-play)'],
    ['t4', 'var(--color-accent)'],
    ['t5', 'var(--color-portal-soul)'],
    ['t6', 'var(--color-fg-muted)'],
    ['t7', 'var(--color-jar-edu)'],
    ['t8', 'var(--color-success)'],
    ['t9', 'var(--color-accent)'],
    ['t10', 'var(--color-portal-soul)'],
    ['t11', 'var(--color-accent)'],
    ['t12', 'var(--color-warning)'],
] as const;

export const TICKER = [...TICKER_SLOTS, ...TICKER_SLOTS].map(([key, dot], index) => ({
    key,
    dot,
    id: `${index}-${key}`,
}));
