/**
 * Landing structure — keys, icons, media paths, demo numbers.
 *
 * Marketing copy lives in `@rumtelo/i18n` under `pages.landing.*`.
 * Feature claims and plan limits come from `@rumtelo/contracts`.
 */
import {
    DEFAULT_JAR_SPLIT,
    JAR_GROUP_ORDER,
    JAR_ORDER_IN_GROUP,
    JarGroup,
    JarKey,
    PLAN_RETAIL_CENTS,
    PlanKey,
    sumPercentageByGroup,
} from '@rumtelo/contracts';
import type { IconName } from '@rumtelo/ui';

export type { IconName };

/* ─────────────────────────── hero ─────────────────────────── */

/**
 * Ambient background video behind the hero. Decorative only — the scrim in
 * `landing-hero.tsx` keeps the copy readable over it.
 * TEMP — Pexels clip (free license). Self-host the final in /public/media/ before launch.
 */
export const HERO_VIDEO = {
    src: 'https://videos.pexels.com/video-files/18069235/18069235-hd_1920_1080_24fps.mp4',
    poster: '/media/hero-poster.jpg',
} as const;

export const DEMO_INCOME_DEFAULT = 4300;

/* ─────────────────────────── pots ─────────────────────────── */

/** Pot visuals — copy comes from `features.money.jars.names` / `.purpose` (keyed by `JarKey`). */
const POT_VISUAL: Record<JarKey, { colorVar: string; icon: IconName }> = {
    // `--color-jar-*` in packages/config/tailwind/theme.css.
    [JarKey.NECESSITIES]: { colorVar: 'var(--color-jar-nec)', icon: 'home' },
    [JarKey.LONG_TERM_SAVINGS]: { colorVar: 'var(--color-jar-lts)', icon: 'lock' },
    [JarKey.FINANCIAL_FREEDOM]: { colorVar: 'var(--color-jar-ff)', icon: 'trending-up' },
    [JarKey.EDUCATION]: { colorVar: 'var(--color-jar-edu)', icon: 'book-open' },
    [JarKey.PLAY]: { colorVar: 'var(--color-jar-play)', icon: 'sparkles' },
    [JarKey.GIVE]: { colorVar: 'var(--color-jar-give)', icon: 'heart' },
};

/** A group takes the tint of its anchor pot — groups have no token of their own. */
const GROUP_COLOR_VAR: Record<JarGroup, string> = {
    [JarGroup.BASIS]: 'var(--color-jar-nec)',
    [JarGroup.FUTURE]: 'var(--color-jar-lts)',
    [JarGroup.FREE]: 'var(--color-jar-play)',
};

export interface LandingPot {
    key: JarKey;
    colorVar: string;
    icon: IconName;
}

export interface LandingGroup {
    key: JarGroup;
    colorVar: string;
    pots: LandingPot[];
}

/** Rumtelo Pots — three groups in flow order (Basics → Future → Free), pots inside. No shares: the household sets its own. */
export const POT_GROUPS: LandingGroup[] = JAR_GROUP_ORDER.map(group => ({
    key: group,
    colorVar: GROUP_COLOR_VAR[group],
    pots: JAR_ORDER_IN_GROUP[group].map(key => ({ key, ...POT_VISUAL[key] })),
}));

/**
 * Hero demo only: an example split per group, summed from the onboarding default.
 * Never shown as a percentage or a promise — it just sizes the animated bar.
 */
const EXAMPLE_GROUP_SHARE = sumPercentageByGroup(
    Object.values(JarKey).map(key => ({ key, percentage: DEFAULT_JAR_SPLIT[key] }))
);

export const HERO_EXAMPLE_GROUPS = POT_GROUPS.map(group => ({
    key: group.key,
    colorVar: group.colorVar,
    share: EXAMPLE_GROUP_SHARE[group.key],
}));

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
    {
        key: PlanKey.PLUS,
        monthly: PLAN_RETAIL_CENTS[PlanKey.PLUS].month / 100,
        yearly: PLAN_RETAIL_CENTS[PlanKey.PLUS].year / 100,
    },
    {
        key: PlanKey.MAX,
        monthly: PLAN_RETAIL_CENTS[PlanKey.MAX].month / 100,
        yearly: PLAN_RETAIL_CENTS[PlanKey.MAX].year / 100,
    },
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

/** Labels that show a product's data — dropped with it while that product is not live (`LIVE_FLOATERS`). */
const FLOATER_PRODUCT: Partial<Record<string, Portal['key']>> = {
    f2: 'energy',
    f5: 'soul',
    f9: 'soul',
};

export const FLOATERS = FLOATER_SLOTS.map(([key, left, top, size, delay, opacity], i) => ({
    key,
    product: FLOATER_PRODUCT[key],
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

/** Ticker lines tied to one product — dropped with it while that product is not live (`LIVE_TICKER`). */
const TICKER_PRODUCT: Partial<Record<string, Portal['key']>> = {
    t3: 'energy',
    t5: 'soul',
    t10: 'soul',
};

export const TICKER = [...TICKER_SLOTS, ...TICKER_SLOTS].map(([key, dot], index) => ({
    key,
    product: TICKER_PRODUCT[key],
    dot,
    id: `${index}-${key}`,
}));
