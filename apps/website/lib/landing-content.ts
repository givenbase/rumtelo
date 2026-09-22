/**
 * Landing structure — keys, percentages, icons, media paths, demo numbers.
 *
 * Marketing copy lives in `@rumtelo/i18n` under `pages.landing.*`.
 * Feature claims and plan limits come from `@rumtelo/contracts`.
 */
import { DEFAULT_JAR_SPLIT, JarKey, PlanKey } from '@rumtelo/contracts';
import type { IconName } from '@rumtelo/ui';

export type { IconName };

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
        icon: 'trending-up',
    },
    {
        key: 'edu',
        pct: DEFAULT_JAR_SPLIT[JarKey.EDUCATION],
        colorVar: 'var(--color-jar-edu)',
        icon: 'book-open',
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
        icon: 'sparkles',
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
        icon: 'sparkles',
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
