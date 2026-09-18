/**
 * Landing copy — single source of truth for the marketing home.
 *
 * Voice: docs/brand/quotes.md (direct, punchy, product-clear; names the problem; no shame).
 * Strategy: lead with the money punch (the door) → name the problem → widen to the four
 * portals → show the loop → the Coach (aspirant ↔ mentor) → principles → jars → why we
 * exist → pricing (aligned with PLAN_ACCESS) → FAQ → sign-up.
 *
 * Feature claims come from `@rumtelo/contracts` (capabilities + plan limits) so the site
 * cannot drift from what the product actually gates.
 */
import { DEFAULT_JAR_SPLIT, JarKey, PLAN_LIMITS, PlanKey } from '@rumtelo/contracts';

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

/* ─────────────────────────── brand ─────────────────────────── */

export const BRAND = 'Rumtelo';

/** The four portals in nav order — one switch, one focus at a time. */
export const PORTAL_STRIP = ['Money', 'Growth', 'Energy', 'Soul'] as const;

/* ─────────────────────────── hero ─────────────────────────── */

export const HERO = {
    eyebrow: 'MONEY · GROWTH · ENERGY · SOUL',
    /** docs/brand/quotes.md — primary. One line per surface. */
    headline: 'Stop wondering where it went.',
    /** Support + one short widener. */
    lead: 'Money leaves. You’ll know why. Rumtelo gives every amount a job the second it lands — then widens the picture to your energy, your growth and your why. Ten minutes a week. Information, never shame.',
    ctaPrimary: 'Start free — no card',
    ctaSecondary: 'See how it works',
} as const;

/**
 * Ambient background video behind the hero. Decorative only — the scrim in
 * `landing-hero.tsx` keeps the copy readable over it.
 * TEMP — Pexels clip (free licence). Self-host the final in /public/media/ before launch.
 */
export const HERO_VIDEO = {
    // Pexels #18069235 — 1080p rendition (the UHD file is 22 MB for no visible gain under the scrim).
    src: 'https://videos.pexels.com/video-files/18069235/18069235-hd_1920_1080_24fps.mp4',
    // First frame of the same clip, generated with ffmpeg — Pexels has no poster for this ID.
    poster: '/media/hero-poster.jpg',
} as const;

export const PROOF = [
    { value: '10 min', label: 'a week — not daily homework' },
    { value: '6 jars', label: 'filled the second income lands' },
    { value: '4 portals', label: 'money · growth · energy · soul' },
    { value: 'Free', label: 'to start · no card' },
];

export const DEMO_INCOME_DEFAULT = 4300;

/** Demo card income breakdown (display only — amounts follow the locale). */
export const DEMO_INCOME_LINE = 'Salary €3,450 · Freelance €850';

/* ─────────────────────────── jars ─────────────────────────── */

export interface Jar {
    key: string;
    name: string;
    pct: number;
    /** Theme token — `--color-jar-*` in packages/config/tailwind/theme.css. */
    colorVar: string;
    line: string;
    not: string;
    icon: IconName;
}

export const JARS: Jar[] = [
    {
        key: 'nec',
        name: 'Necessity',
        pct: DEFAULT_JAR_SPLIT[JarKey.NECESSITIES],
        colorVar: 'var(--color-jar-nec)',
        line: 'Rent, energy, insurance, groceries, transport. The things that arrive whether you like it or not.',
        not: 'Not for eating out or clothes — that is Play.',
        icon: 'home',
    },
    {
        key: 'ff',
        name: 'Financial Freedom',
        pct: DEFAULT_JAR_SPLIT[JarKey.FINANCIAL_FREEDOM],
        colorVar: 'var(--color-jar-ff)',
        line: 'Index funds, a property deposit, your own company. This jar buys things that pay you back.',
        not: 'Never spent. Only invested.',
        icon: 'trend',
    },
    {
        key: 'edu',
        name: 'Education',
        pct: DEFAULT_JAR_SPLIT[JarKey.EDUCATION],
        colorVar: 'var(--color-jar-edu)',
        line: 'Books, courses, a mentor, a tool that makes you better. The one jar where spending raises what you’re worth.',
        not: 'Not for gadgets you call research.',
        icon: 'book',
    },
    {
        key: 'lts',
        name: 'Long Term Savings',
        pct: DEFAULT_JAR_SPLIT[JarKey.LONG_TERM_SAVINGS],
        colorVar: 'var(--color-jar-lts)',
        line: 'Emergency fund first, then the car, the deposit, the tax bill you know is coming.',
        not: 'Not for anything you want this month.',
        icon: 'lock',
    },
    {
        key: 'play',
        name: 'Play',
        pct: DEFAULT_JAR_SPLIT[JarKey.PLAY],
        colorVar: 'var(--color-jar-play)',
        line: 'Dinner out, a concert, something spontaneous. Spend it without asking permission.',
        not: 'Must be empty by month end. That is the point.',
        icon: 'sparkle',
    },
    {
        key: 'give',
        name: 'Give',
        pct: DEFAULT_JAR_SPLIT[JarKey.GIVE],
        colorVar: 'var(--color-jar-give)',
        line: 'A cause, a friend who needs it, your own foundation one day. Generosity as a habit, not a mood.',
        not: 'Not a tip you already left.',
        icon: 'heart',
    },
];

export const JARS_SECTION = {
    eyebrow: 'THE SIX JARS',
    headline: 'Six jobs, so no amount has to decide for itself.',
    lead: 'Every jar has a rule you can read in one line — what belongs, what doesn’t. The percentages are yours to change. The habit is the point.',
} as const;

/* ─────────────────────────── problem ─────────────────────────── */

export const PROBLEM = {
    eyebrow: 'WHY THE PICTURE GOES MISSING',
    headline: 'It isn’t that you don’t care. It’s that everything keeps moving.',
    /** docs/research/money-awareness.md — suggested proof language. */
    lead: 'Most people don’t lose the plot because they don’t care. They lose the picture because income, expenses and priorities keep moving — and tracking every detail costs attention they need to build the life they want.',
    kicker: 'Rumtelo is the missing picture. Every amount already has a place — before life decides for you.',
    sources:
        'Grounded in Mullainathan & Shafir (Scarcity), CFPB consumer research, US Financial Diaries and the JPMorgan Chase Institute.',
} as const;

export const PROBLEM_CARDS: { icon: IconName; head: string; line: string }[] = [
    {
        icon: 'trend',
        head: 'The numbers keep moving',
        line: 'Hours, overtime, side income, shared costs, a car, a kid. Many households swing ±25% from their average month. A fixed budget feels fake — so you stop trusting it.',
    },
    {
        icon: 'clock',
        head: 'Attention is the scarce thing',
        line: 'Money stress — and ambition under load — capture attention and shrink the bandwidth for planning. So you manage by feel. Not by a full picture.',
    },
    {
        icon: 'db',
        head: 'Tools were built for accountants',
        line: 'Spreadsheets add anxiety without changing the next decision. Detail only sticks when it reduces stress. Most tools do the opposite.',
    },
    {
        icon: 'wallet',
        head: 'The balance lies',
        line: 'Cards, cash, BNPL, a partner’s account. “Available” ignores the rent that leaves on Friday. The number you see isn’t the number you have.',
    },
];

/* ─────────────────────────── portals ─────────────────────────── */

export interface Portal {
    key: 'money' | 'growth' | 'energy' | 'soul';
    name: string;
    dutch: string;
    /** docs/brand/quotes.md — per-portal line. */
    hook: string;
    question: string;
    /** Tint — mirrors apps/application/app/_lib/portal-hubs.ts. */
    colorVar: string;
    icon: IconName;
    /** Features from `FEATURES[product]` in @rumtelo/contracts, in product words. */
    features: string[];
    /**
     * Optional screen recording of the portal in action.
     * Drop the file in `apps/website/public/media/portals/` and set the paths here;
     * until then the landing renders a hand-built animation of the same screen.
     */
    media?: { video: string; poster?: string };
    /** Copy for the mock screen (title bar + Coach line). */
    demo: { screen: string; coach: string };
}

/**
 * TEMP — Pexels placeholder so every portal has a "Watch video" to exercise the slot.
 * Replace per portal with a real screen recording in /public/media/portals/
 * (e.g. `{ video: '/media/portals/money.mp4', poster: '/media/portals/money.jpg' }`),
 * or drop `media` from a portal to hide its button.
 */
const PLACEHOLDER_MEDIA: NonNullable<Portal['media']> = {
    video: 'https://videos.pexels.com/video-files/3130284/3130284-hd_1920_1080_30fps.mp4',
    poster: 'https://images.pexels.com/videos/3130284/free-video-3130284.jpg?auto=compress&w=1280',
};

export const PORTALS: Portal[] = [
    {
        key: 'money',
        name: 'Money',
        dutch: 'Geld',
        hook: 'Stop wondering where it went.',
        question: 'Where does this month go?',
        colorVar: 'var(--color-jar-give)',
        icon: 'wallet',
        features: [
            'Six jars, your percentages',
            'Inbox — sorted by rule or by hand',
            'Fixed costs you see coming',
            'Debt plan with an end date',
            'The week check · the month score',
        ],
        demo: {
            screen: 'Inbox · this week',
            coach: 'Play is €38 over its line. One move: shift it from Long Term Savings — or let it ride.',
        },
        media: PLACEHOLDER_MEDIA,
    },
    {
        key: 'growth',
        name: 'Growth',
        dutch: 'Groei',
        hook: 'Stop wondering how to earn more.',
        question: 'How do I earn more?',
        colorVar: 'var(--color-jar-lts)',
        icon: 'compass',
        features: [
            'Goals with a date and a jar',
            'Income — the curve and the four levers',
            'Learn — books, courses, what they changed',
            'Net worth and your freedom number',
        ],
        demo: {
            screen: 'Goals · income',
            coach: 'Cutting costs has a floor. Raising income does not. Side income is 20% of the way.',
        },
        media: PLACEHOLDER_MEDIA,
    },
    {
        key: 'energy',
        name: 'Energy',
        dutch: 'Energie',
        hook: 'Stop wondering what you’re running on.',
        question: 'What am I running on?',
        colorVar: 'var(--color-jar-play)',
        icon: 'moon',
        features: [
            'Your 168 hours, divided on purpose',
            'Sleep — the floor under every decision',
            'Training and load',
            'Food and fuel',
        ],
        demo: {
            screen: 'Sleep · last 7 nights',
            coach: 'Three nights under 6h30 — and Play rose on those days. Sleep first. Then decide.',
        },
        media: PLACEHOLDER_MEDIA,
    },
    {
        key: 'soul',
        name: 'Soul',
        dutch: 'Ziel',
        hook: 'Stop wondering why you’re doing this.',
        question: 'Why am I doing this?',
        colorVar: 'var(--color-portal-soul)',
        icon: 'sparkle',
        features: [
            'Stillness — one minute counts',
            'Gratitude, written down',
            'One intention a week',
            'The seven centres — where energy gets stuck',
        ],
        demo: {
            screen: 'Stillness · day 6',
            coach: 'Intention set. One line is enough — the week has a direction now.',
        },
        media: PLACEHOLDER_MEDIA,
    },
];

/* Demo data for the mock screens — product voice, plausible numbers. */

export const PORTAL_DEMO_MONEY = {
    rows: [
        {
            label: 'Salary',
            amount: '+€4,300',
            jar: 'Split → six jars',
            colorVar: 'var(--color-accent)',
        },
        {
            label: 'Albert Heijn',
            amount: '−€38.65',
            jar: 'Necessity',
            colorVar: 'var(--color-jar-nec)',
        },
        { label: 'Coffee bar', amount: '−€5.20', jar: 'Play', colorVar: 'var(--color-jar-play)' },
        { label: 'Debt payment', amount: '−€310', jar: 'Freedom', colorVar: 'var(--color-jar-ff)' },
    ],
    overLine: { jar: 'Play', over: '€38' },
} as const;

export const PORTAL_DEMO_GROWTH = {
    goals: [
        { name: 'Emergency fund', pct: 64, meta: 'Long Term Savings · Mar 2027' },
        { name: 'Side income €500 / month', pct: 20, meta: 'Income · the second lever' },
        { name: 'Course · data analysis', pct: 30, meta: 'Education jar' },
    ],
    /** Monthly income, six months. */
    income: [3900, 3950, 4100, 4050, 4300, 4450],
    incomeLabel: '+14% in six months',
} as const;

export const PORTAL_DEMO_ENERGY = {
    /** Hours slept, last seven nights. */
    nights: [6.2, 7.3, 5.9, 7.4, 6.4, 8.0, 7.3],
    floor: 6.5,
    days: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
    hours: [
        { label: 'Sleep', value: 51, colorVar: 'var(--color-jar-play)' },
        { label: 'Work', value: 40, colorVar: 'var(--color-jar-nec)' },
        { label: 'Move', value: 6, colorVar: 'var(--color-jar-ff)' },
        { label: 'Yours', value: 71, colorVar: 'var(--color-accent)' },
    ],
} as const;

export const PORTAL_DEMO_SOUL = {
    stillnessSeconds: 60,
    streakDays: 6,
    gratitude: ['Morning light on the canal', 'A coffee made for me', 'An empty inbox at nine'],
    intention: 'One good week — keep the dinners in.',
} as const;

export const PORTALS_SECTION = {
    eyebrow: 'NOT JUST MONEY. WHERE YOUR LIFE GOES.',
    headline: 'Money. Growth. Energy. Soul. One overview.',
    lead: 'Money is the door. But the picture isn’t only the bank balance. Rumtelo is four portals behind one switch — each answers one question, and a Coach holds them together. You are always inside exactly one.',
} as const;

/* ─────────────────────────── the loop ─────────────────────────── */

export interface LoopStep {
    step: string;
    title: string;
    tag: string;
    you: string;
    rumtelo: string;
    math: string;
    why: string;
}

export const LOOP_SECTION = {
    eyebrow: 'THE LOOP',
    headline: 'Split first. Spend second. Ten minutes a week.',
    lead: 'No secrets and no magic. A loop you can hold in your head: income splits, spending gets sorted, one short check a week, one score a month. You do the small part; Rumtelo does the arithmetic and speaks up when something needs a move.',
} as const;

export const LOOP: LoopStep[] = [
    {
        step: '01',
        title: 'Income lands. Six jars fill.',
        tag: 'SPLIT FIRST',
        you: 'Tell Rumtelo what lands. One number — salary, freelance, anything.',
        rumtelo:
            'Splits it across six jars the same second, with your percentages. Fixed costs draw from those jars, so you see them coming.',
        math: '€4,300 → 55% Necessity · 10% Freedom · 10% Savings · 10% Education · 10% Play · 5% Give',
        why: 'Money with a job doesn’t need defending all month. If must-pays need more than 55%, that is the thing to fix — not your discipline.',
    },
    {
        step: '02',
        title: 'Spending lands in the Inbox.',
        tag: 'SORTED, NOT JUDGED',
        you: 'Add it yourself, or drop in a bank statement. Live bank sync comes later — read-only, and only when you connect it.',
        rumtelo:
            'Sorts every amount into its jar — by rule or by hand. Re-import a statement and nothing doubles.',
        math: 'Groceries −€38.65 → Necessity · Coffee −€5.20 → Play · rule: “supermarket → Necessity”',
        why: 'A jar over its line is a signal, not a verdict. It shows up as information — with the one move that fixes it.',
    },
    {
        step: '03',
        title: 'Ten minutes. Once a week.',
        tag: 'THE WEEK CHECK',
        you: 'Sit down with the Coach. Redirect what is left. Set one intention.',
        rumtelo:
            'Shows what moved, what is safe to spend, and what to change. Then gets out of the way.',
        math: '(€583 + €224 left) ÷ 8 days = €64 safe today · surplus €140 → Long Term Savings',
        why: 'Ten minutes a week beats daily worry. The practice is short and repeating — not constant vigilance.',
    },
    {
        step: '04',
        title: 'The month closes with a score.',
        tag: 'THE MONTH SCORE',
        you: 'Close the turn. Read the log.',
        rumtelo:
            'Scores the month — jars held, debt paid, intention kept — and writes it down. Next month starts clean.',
        math: 'Month score 82 · 5 of 6 jars held · debt −€310 · debt-free: Feb 2035',
        why: 'You can’t steer what you never look back at. One number, one log, no shame.',
    },
    {
        step: '05',
        title: 'Then the picture widens.',
        tag: 'ENERGY · GROWTH · SOUL',
        you: 'Log a night of sleep. Name a goal. Finish a book. One minute of stillness.',
        rumtelo:
            'Feeds it all to the Coach — so “a tired head spends” becomes something you can see, not just feel.',
        math: 'Sleep 7h20 ↑ · goal “Emergency fund” 64% · 1 book · stillness day 6',
        why: 'Energy carries money. A rested head steers. Without a why, steering is just bookkeeping.',
    },
];

/* ─────────────────────────── the coach ─────────────────────────── */

export const COACH_SECTION = {
    eyebrow: 'THE COACH',
    headline: 'You’re the aspirant. The Coach is the mentor.',
    lead: 'Every screen opens with the Coach: one sentence on where you stand, one move to make. Not a wall of charts. Not a lecture. Suggestions from money, growth, energy and soul — one tip at a time, and it never speaks to shame you.',
} as const;

export const COACH_POINTS = [
    'One verdict, one action — every tip ships a next move',
    'Quiet until there is enough data — six noisy points are not insight',
    'Information, never shame — an over-the-line jar is a signal, not a verdict',
    'Ten minutes a week with the Coach — not daily homework',
];

export interface CoachDemoMessage {
    kind: string;
    portal: Portal['key'];
    text: string;
    cta: string;
}

/** Rendered mock of the in-app Coach — one card per portal, in product voice. */
export const COACH_DEMO: CoachDemoMessage[] = [
    {
        kind: 'THIS WEEK',
        portal: 'money',
        text: 'Play is €38 over its line. Move it from Long Term Savings once — or let it ride and keep next week’s dinner in.',
        cta: 'Open jars',
    },
    {
        kind: 'THE LEVER',
        portal: 'growth',
        text: 'Cutting costs has a floor. Raising income does not. Your side income is 20% of the way to the goal you set.',
        cta: 'Open income',
    },
    {
        kind: 'YOUR FLOOR',
        portal: 'energy',
        text: 'Three nights under 6h30 — and Play spending rose on the same days. Sleep first. Then decide.',
        cta: 'Open sleep',
    },
    {
        kind: 'START SMALL',
        portal: 'soul',
        text: 'This week’s intention is still empty. One line is enough: what would make this a good week?',
        cta: 'Set intention',
    },
];

/* ─────────────────────────── principles ─────────────────────────── */

export const PRINCIPLES_SECTION = {
    eyebrow: 'FOUR PRINCIPLES WE DON’T BREAK',
    headline: 'If a feature fights a principle, the feature loses.',
} as const;

export const PRINCIPLES: { nl: string; en: string; body: string; icon: IconName }[] = [
    {
        nl: 'Eerst verdelen, dan uitgeven.',
        en: 'Split first. Spend second.',
        body: 'Money gets a job before it gets spent.',
        icon: 'wallet',
    },
    {
        nl: 'Tien minuten per week.',
        en: 'Ten minutes a week.',
        body: 'A short, repeating practice beats daily worry.',
        icon: 'clock',
    },
    {
        nl: 'Energie draagt geld.',
        en: 'Energy carries money.',
        body: 'A tired head spends. A rested head decides.',
        icon: 'moon',
    },
    {
        nl: 'Informatie, nooit schaamte.',
        en: 'Information, never shame.',
        body: 'An over-the-line jar is a signal, not a verdict. Every warning carries the one move that fixes it.',
        icon: 'shield',
    },
];

/* ─────────────────────────── why we exist ─────────────────────────── */

/**
 * One story spine for Why + footer:
 *   1. Built for the founders first
 *   2. Grounded in proven books (not invented overnight)
 *   3. Brought to market so others can use the same practice
 * Footer keeps a short legal echo — the full story lives here.
 */
export const WHY = {
    eyebrow: 'WHY RUMTELO EXISTS',
    quoteNl: 'Rijkdom is geen getal. Het zijn de teugels in jouw handen.',
    quoteEn: 'Wealth isn’t a number. It’s the reins in your hands.',
    body: 'We built Rumtelo for ourselves first. We earned fine and still didn’t know where it went — or what it cost in sleep, focus and direction. Budget apps counted. Nobody coached. So we made the thing we needed: one calm overview and a mentor for the whole picture. Then we saw the opportunity — bring it to market, so others can steer their life the same way.',
    booksEyebrow: 'GROUNDED IN PROVEN BOOKS',
    booksLead:
        'Rumtelo is not a new theory. It turns ideas from books that have shaped money, mindset and direction for decades into a daily practice you can actually keep.',
    books: [
        {
            title: 'Rich Dad Poor Dad',
            author: 'Robert Kiyosaki',
            line: 'Assets vs liabilities — money that works for you, not the other way around.',
        },
        {
            title: 'Think and Grow Rich',
            author: 'Napoleon Hill',
            line: 'Intention, habit and a clear why — the mindset under every number.',
        },
        {
            title: 'Secrets of the Millionaire Mind',
            author: 'T. Harv Eker',
            line: 'The six-jar split — every amount gets a job the second it lands.',
        },
        {
            title: 'The Psychology of Money',
            author: 'Morgan Housel',
            line: 'Behaviour beats cleverness — calm systems over panic and shame.',
        },
        {
            title: 'The Secret',
            author: 'Rhonda Byrne',
            line: 'Clarity of desire and belief — what you focus on, you move toward.',
        },
    ],
    booksNote:
        'Independent product — not affiliated with, endorsed by, or licensed from these authors or their estates.',
    signature: 'Given Loyiso, founder & CEO · Charissa Peroti, co-founder · Amsterdam',
    manifesto: 'Don’t chase the number. Own the direction.',
    audience: 'Built for people who are doing well — and for people who are ready to.',
    aspirantLine:
        'The system is the aspirant’s. The Coach is the mentor. Rumtelo’s job is to guide — and to get out of the way.',
} as const;

export const ROADMAP: { head: string; line: string; icon: IconName }[] = [
    {
        icon: 'eye',
        head: 'Live bank sync',
        line: 'PSD2, read-only, EU-licensed. Only after you connect it yourself.',
    },
    {
        icon: 'flag',
        head: 'English first, Dutch second',
        line: 'Built for NL and EU life. Amounts and dates follow your locale.',
    },
    {
        icon: 'sparkle',
        head: 'Devices that track for you',
        line: 'Watch, scale, ring — so sleep, training and energy arrive without typing.',
    },
];

/* ─────────────────────────── pricing ─────────────────────────── */

export interface Plan {
    key: PlanKey;
    name: string;
    monthly: number;
    yearly: number;
    tag: string;
    line: string;
    feats: string[];
}

const basicLimits = PLAN_LIMITS[PlanKey.BASIC];
const plusLimits = PLAN_LIMITS[PlanKey.PLUS];

function count(value: number | null, singular: string, plural: string): string {
    if (value === null) return `Unlimited ${plural}`;
    return value === 1 ? `${value} ${singular}` : `${value} ${plural}`;
}

/**
 * Feature lines mirror PLAN_ACCESS in @rumtelo/contracts:
 *   Basic  = home + money core + growth goals/income/learn + energy sleep + soul stillness/gratitude/intent
 *   Plus   = + money debt/bank/import + energy week/training/food + invite
 *   Max    = + growth net-worth + soul centres. Learn courses are Masterclass, not Udemy.
 * Limits come from PLAN_LIMITS so the numbers cannot drift.
 */
export const PLANS: Plan[] = [
    {
        key: PlanKey.BASIC,
        name: 'Basic',
        monthly: 0,
        yearly: 0,
        tag: 'Start here',
        line: 'The whole practice, solo. Six jars, the Coach, one goal, your sleep, one minute of stillness. Enough to start — and never a reason to stop.',
        feats: [
            'MONEY · six jars, transactions, fixed costs',
            `GROWTH · income, Learn, and ${count(basicLimits.maxGoals, 'goal', 'goals')}`,
            'ENERGY · sleep',
            'SOUL · stillness, gratitude, one intention a week',
            'The Coach, the week check, the month score',
            'Solo household',
        ],
    },
    {
        key: PlanKey.PLUS,
        name: 'Plus',
        monthly: 9,
        yearly: 90,
        tag: 'Most chosen',
        line: 'For the part that should run without you — and for the people you share it with.',
        feats: [
            'Everything in Basic',
            'MONEY · debt plan with interest and a freedom date',
            'MONEY · bank statement import — live sync coming',
            'ENERGY · your 168 hours, training, food',
            `Invite up to ${plusLimits.maxMembers} — partner, family, friends`,
            `Up to ${plusLimits.maxGoals} goals`,
        ],
    },
    {
        key: PlanKey.MAX,
        name: 'Max',
        monthly: 19,
        yearly: 190,
        tag: 'The whole picture',
        line: 'Where money starts making money — and learning starts paying back.',
        feats: [
            'Everything in Plus',
            'GROWTH · net worth, returns and your freedom number',
            'GROWTH · Learn courses on Masterclass, not Udemy',
            'SOUL · the seven centres',
            'Unlimited goals and members',
            'Devices — watch, scale, ring (coming)',
        ],
    },
];

export const PRICING_SECTION = {
    eyebrow: 'PRICING',
    headline: 'Free where it counts. Paid where it saves you work.',
    lead: 'Start on Basic free. Choose Plus or Max and we’ll open Stripe Checkout after your account is set up — only when signup, verify and onboarding succeed.',
} as const;

export const ASSURANCES: { text: string; icon: IconName }[] = [
    { text: 'Basic is free and needs no card. It can stay that way.', icon: 'shield' },
    {
        text: 'No bank required. Import a statement when you want to — read-only, always, and only after you choose to.',
        icon: 'eye',
    },
    { text: 'Cancel a paid plan and everything you entered stays readable.', icon: 'db' },
];

/* ─────────────────────────── faq ─────────────────────────── */

export const FAQ_SECTION = {
    eyebrow: 'QUESTIONS',
    headline: 'Straight answers.',
} as const;

export const FAQ: { question: string; answer: string }[] = [
    {
        question: 'Is Rumtelo a budgeting app?',
        answer: 'No. Budgeting apps count what happened. Rumtelo gives money a job before it is spent, then coaches the rest — energy, growth, why. Bookkeeping is a side effect, not the point.',
    },
    {
        question: 'Do I need to connect my bank?',
        answer: 'No. Basic works with what you enter. Plus adds bank-statement import — re-import a statement and nothing doubles. Live bank sync (PSD2, read-only, EU-licensed) is on the roadmap, and only ever after you connect it yourself.',
    },
    {
        question: 'Why are sleep, training and books in a money product?',
        answer: 'Because a tired head spends and a rested head decides — and because Rumtelo stands on books like Rich Dad Poor Dad, Think and Grow Rich, Secrets of the Millionaire Mind and The Secret, not on spreadsheets alone. Energy is the floor under every financial decision. Learning is the one spend that raises what you earn. Leave them out and an app becomes bookkeeping.',
    },
    {
        question: 'What does the Coach actually do?',
        answer: 'One sentence on where you stand and one move to make — drawn from all four portals. It stays quiet until there is enough data, and it never speaks to shame you. You are the aspirant; the Coach is the mentor.',
    },
    {
        question: 'Can I use it with a partner or my family?',
        answer: `Yes — on Plus (up to ${plusLimits.maxMembers} people) and Max (unlimited). A household shares the jars. Spending style stays personal, because partners differ.`,
    },
    {
        question: 'Where is my data?',
        answer: 'On EU servers in Amsterdam, encrypted at rest. Export or delete it any time. Cancel a paid plan and every jar, transaction and goal stays readable.',
    },
    {
        question: 'Dutch or English?',
        answer: 'Both. English first, Dutch second. Rumtelo is built for NL and EU life — amounts and dates follow your locale.',
    },
];

/* ─────────────────────────── sign-up ─────────────────────────── */

export const SIGNUP_SECTION = {
    eyebrow: 'CREATE YOUR ACCOUNT',
    headline: 'Split first. Spend second.',
    lead: 'Built for people who are doing well — and for people who are ready to. Start here — then finish on the create-account page with your password.',
    submit: 'Continue to create account',
    termsBefore: 'I agree to the ',
    termsLink: 'Terms',
    termsMid: ' and ',
    privacyLink: 'Privacy Policy',
    termsAfter: '. Rumtelo only ever reads bank data — and only after I connect it myself.',
} as const;

/** Soft proof — no fake testimonials; founders + place + practice. */
export const SOCIAL_PROOF = {
    eyebrow: 'USED BY THE PEOPLE WHO BUILT IT',
    headline: 'We run our own lives on Rumtelo.',
    lead: 'Given and Charissa built Rumtelo because they needed it — then brought it to market so others can steer the same way. English first. Dutch second. Amsterdam servers.',
    points: [
        { value: 'Founders', label: 'use it every week' },
        { value: 'Amsterdam', label: 'EU-hosted · GDPR' },
        { value: 'EN → NL', label: 'English first · Dutch next' },
        { value: 'No shame', label: 'information · one next move' },
    ],
} as const;

/* ─────────────────────────── footer ─────────────────────────── */

export const TRUST_CARDS: { icon: IconName; head: string; line: string }[] = [
    {
        icon: 'eye',
        head: 'Read-only, ever',
        line: 'Rumtelo can look, never move money. Bank data arrives only after you connect it yourself.',
    },
    {
        icon: 'shield',
        head: 'EU hosting, GDPR',
        line: 'Amsterdam servers, encrypted at rest. Export or delete your data any time.',
    },
    {
        icon: 'db',
        head: 'Yours, always',
        line: 'Cancel and every jar, transaction and goal stays readable. No lock-in, no hostage data.',
    },
    {
        icon: 'compass',
        head: 'A coach, not a bank',
        line: 'Not a bank, not a licensed adviser. Suggestions are education, not personal investment advice.',
    },
];

export const TRUST_BADGES = [
    'EU HOSTED · AMSTERDAM',
    'READ-ONLY BANK DATA',
    'GDPR',
    'TLS ENCRYPTED',
];

export const FOOT_COLS = [
    {
        head: 'Product',
        links: [
            { text: 'The portals', href: '#portals' },
            { text: 'The jars', href: '#jars' },
            { text: 'The Coach', href: '#coach' },
            { text: 'Pricing', href: '#pricing' },
        ],
    },
    {
        head: 'Company',
        links: [
            { text: 'Why Rumtelo', href: '#why' },
            { text: 'Principles', href: '#principles' },
            { text: 'Questions', href: '#faq' },
        ],
    },
    {
        head: 'Legal',
        links: [
            { text: 'Privacy policy', href: '/privacy' },
            { text: 'Terms of service', href: '/terms' },
            { text: 'Data processing', href: '/data-processing' },
        ],
    },
    {
        head: 'Contact',
        links: [
            { text: 'support@rumtelo.com', href: 'mailto:support@rumtelo.com' },
            { text: 'Press & partnerships', href: 'mailto:hello@rumtelo.com' },
        ],
    },
];

export const FOOTER_BLURB = {
    attribution:
        'Rumtelo · Amsterdam, the Netherlands. Built by the founders for themselves first — then brought to market so others can use the same practice. Grounded in books like Rich Dad Poor Dad, Think and Grow Rich, Secrets of the Millionaire Mind, The Psychology of Money and The Secret. Independent product — not affiliated with, endorsed by, or licensed from those authors.',
    disclaimer:
        'Rumtelo is a coach and an overview — not a bank and not a licensed financial adviser. Suggestions are education, not personal investment advice.',
    copyright: `© ${new Date().getFullYear()} Rumtelo · All rights reserved`,
} as const;

/* ─────────────────────────── hero ambience ─────────────────────────── */

/** Floating labels — money AND life signals, so the hero already hints at the wider picture. */
export const FLOATERS = [
    ['+€3,450 · split in 0.4s', 6, 4, 14, 0, 0.14],
    ['Sleep 7h20 ↑', 15, 46, 11, 3.5, 0.1],
    ['+€850 freelance', 26, 22, 12, 7, 0.12],
    ['NEC → €2,365', 36, 60, 10, 1.8, 0.09],
    ['Intention set', 47, 12, 11, 5.2, 0.11],
    ['−€38.65 → Necessity', 56, 40, 12, 9.4, 0.1],
    ['1 book · Education', 66, 68, 10, 2.6, 0.08],
    ['FF → €430 · invested', 76, 30, 13, 6.1, 0.12],
    ['Stillness · day 6', 85, 55, 10, 8.3, 0.09],
    ['55 / 10 / 10 / 10 / 10 / 5', 62, 8, 11, 4.4, 0.11],
    ['Week check · 9 min', 92, 18, 12, 1.1, 0.12],
    ['Month score 82', 10, 72, 10, 10.6, 0.08],
].map(([text, left, top, size, delay, opacity], i) => ({
    text: text as string,
    left: `${left}%`,
    top: `${top}%`,
    size: `${size}px`,
    dur: `${14 + (i % 5) * 3}s`,
    delay: `${delay}s`,
    opacity: opacity as number,
    color: i % 3 === 0 ? 'var(--color-accent)' : 'var(--color-fg-muted)',
}));

const TICKER_RAW = [
    ['Salary landed · split in 0.4s', 'var(--color-success)'],
    ['Groceries −€38.65 → Necessity', 'var(--color-fg-muted)'],
    ['Sleep 7h20 · trend ↑', 'var(--color-jar-play)'],
    ['€430 → world index fund', 'var(--color-accent)'],
    ['Intention set: “one honest week”', 'var(--color-portal-soul)'],
    ['Coffee −€5.20 → Play', 'var(--color-fg-muted)'],
    ['Book finished · Education jar', 'var(--color-jar-edu)'],
    ['Debt-free: Feb 2035 · on track', 'var(--color-success)'],
    ['Week check done · 9 min', 'var(--color-accent)'],
    ['Stillness · day 6', 'var(--color-portal-soul)'],
    ['Safe to spend today: €64', 'var(--color-accent)'],
    ['Gym −€32 → Play · flagged, one move', 'var(--color-warning)'],
];
export const TICKER = [...TICKER_RAW, ...TICKER_RAW].map(([text, dot], index) => ({
    text: text as string,
    dot: dot as string,
    key: `${index}-${text as string}`,
}));
