/**
 * Coach / helper readiness — which surfaces ship in production vs preview
 * (development / staging / test only).
 *
 * Mirrors {@link shouldDeferLaunchProducts}: preview coaches hide when
 * `NODE_ENV=production`. Backlog rows are checklist-only (never shown).
 *
 * Human checklist: `docs/product/coach-readiness.md` (same IDs).
 */

export const CoachFeatureStatus = {
    SHIP: 'ship',
    PREVIEW: 'preview',
    BACKLOG: 'backlog',
} as const;

export type CoachFeatureStatus = (typeof CoachFeatureStatus)[keyof typeof CoachFeatureStatus];

export const CoachFeatureId = {
    INBOX: 'inbox',
    SESSION: 'session',
    SPLIT_COACH: 'split_coach',
    DEBT_STRATEGY: 'debt_strategy',
    NECESSITIES_PRESSURE: 'necessities_pressure',
    JAR_GUIDE: 'jar_guide',
    WHY_CAPTION: 'why_caption',
    PERIOD_TRAVEL: 'period_travel',
    GIVING_FINDER: 'giving_finder',
    GOAL_ADVICE: 'goal_advice',
    LEARN_RECOMMENDED: 'learn_recommended',
    INCOME_SIMULATOR: 'income_simulator',
    TIME_COACH: 'time_coach',
    SPLIT_COACH_B2: 'split_coach_b2',
    SPLIT_COACH_C: 'split_coach_c',
    MONEY_TIP_PRODUCERS: 'money_tip_producers',
    GROWTH_TIP_PRODUCERS: 'growth_tip_producers',
    SOUL_TIP_PRODUCERS: 'soul_tip_producers',
    HOUSEHOLD_COACH_TOGGLE: 'household_coach_toggle',
    COACH_GUIDE_SURFACE: 'coach_guide_surface',
    FEED_KEY_I18N: 'feed_key_i18n',
} as const;

export type CoachFeatureId = (typeof CoachFeatureId)[keyof typeof CoachFeatureId];

export type CoachFeature = {
    id: CoachFeatureId;
    status: CoachFeatureStatus;
    title: string;
    where: string;
    gaps: readonly string[];
};

/** Runtime catalog — source of truth for env gating. */
export const COACH_FEATURES: readonly CoachFeature[] = [
    {
        id: CoachFeatureId.INBOX,
        status: CoachFeatureStatus.SHIP,
        title: 'Coach inbox',
        where: '/product/coach tip feed',
        gaps: [],
    },
    {
        id: CoachFeatureId.SESSION,
        status: CoachFeatureStatus.SHIP,
        title: 'Coach smart-fill session',
        where: '/product/coach session steps',
        gaps: [],
    },
    {
        id: CoachFeatureId.SPLIT_COACH,
        status: CoachFeatureStatus.SHIP,
        title: 'Split coach (Phase A/B)',
        where: 'Settings → Jars',
        gaps: [],
    },
    {
        id: CoachFeatureId.DEBT_STRATEGY,
        status: CoachFeatureStatus.SHIP,
        title: 'Debt strategy coach',
        where: 'Money → Debts',
        gaps: [],
    },
    {
        id: CoachFeatureId.NECESSITIES_PRESSURE,
        status: CoachFeatureStatus.SHIP,
        title: 'Necessities pressure',
        where: 'Money → Fixed costs',
        gaps: [],
    },
    {
        id: CoachFeatureId.JAR_GUIDE,
        status: CoachFeatureStatus.SHIP,
        title: 'Jar guide card',
        where: 'Money → Jar detail',
        gaps: [],
    },
    {
        id: CoachFeatureId.WHY_CAPTION,
        status: CoachFeatureStatus.SHIP,
        title: 'Shell why-line',
        where: 'App shell under header',
        gaps: [],
    },
    {
        id: CoachFeatureId.PERIOD_TRAVEL,
        status: CoachFeatureStatus.SHIP,
        title: 'Period travel coach copy',
        where: 'Money portal Looking Ahead/Back',
        gaps: [],
    },
    {
        id: CoachFeatureId.GIVING_FINDER,
        status: CoachFeatureStatus.PREVIEW,
        title: 'Giving finder',
        where: 'Give flows / Soul → Giving / jar guide',
        gaps: [
            'Not HelperGate-wrapped at all call sites historically',
            'Soul portal also launch-deferred',
        ],
    },
    {
        id: CoachFeatureId.GOAL_ADVICE,
        status: CoachFeatureStatus.PREVIEW,
        title: 'Goal advice tips',
        where: 'Growth → Goal detail',
        gaps: ['Rule cards without full Coach chrome', 'Advice depth still thin'],
    },
    {
        id: CoachFeatureId.LEARN_RECOMMENDED,
        status: CoachFeatureStatus.PREVIEW,
        title: 'Learn coach-recommended',
        where: 'Growth → Learn',
        gaps: ['Mostly Coach mark chrome', 'Recommendation quality not proven'],
    },
    {
        id: CoachFeatureId.INCOME_SIMULATOR,
        status: CoachFeatureStatus.PREVIEW,
        title: 'Income simulator Coach mark',
        where: 'Growth → Income',
        gaps: ['Coach mark only — little coaching content'],
    },
    {
        id: CoachFeatureId.TIME_COACH,
        status: CoachFeatureStatus.PREVIEW,
        title: 'Time coach tip producer',
        where: 'Coach inbox + Energy week why-line',
        gaps: [
            'Only registered tip producer today',
            'Energy already launch-deferred in production',
        ],
    },
    {
        id: CoachFeatureId.SPLIT_COACH_B2,
        status: CoachFeatureStatus.BACKLOG,
        title: 'Split coach Phase B2 — infer spending style',
        where: 'Settings → Jars / account',
        gaps: ['Not built — see split-coach README'],
    },
    {
        id: CoachFeatureId.SPLIT_COACH_C,
        status: CoachFeatureStatus.BACKLOG,
        title: 'Split coach Phase C — weekly Home card',
        where: 'Home / Jars',
        gaps: ['Not built — see split-coach README'],
    },
    {
        id: CoachFeatureId.MONEY_TIP_PRODUCERS,
        status: CoachFeatureStatus.BACKLOG,
        title: 'Money inbox tip producers',
        where: 'CoachService.registerRefresher',
        gaps: ['No money domain refresher yet'],
    },
    {
        id: CoachFeatureId.GROWTH_TIP_PRODUCERS,
        status: CoachFeatureStatus.BACKLOG,
        title: 'Growth inbox tip producers',
        where: 'CoachService.registerRefresher',
        gaps: ['No growth domain refresher yet'],
    },
    {
        id: CoachFeatureId.SOUL_TIP_PRODUCERS,
        status: CoachFeatureStatus.BACKLOG,
        title: 'Soul inbox tip producers',
        where: 'CoachService.registerRefresher',
        gaps: ['No soul domain refresher yet'],
    },
    {
        id: CoachFeatureId.HOUSEHOLD_COACH_TOGGLE,
        status: CoachFeatureStatus.BACKLOG,
        title: 'Wire household isCoachEnabled',
        where: 'HouseholdFeatureSettings',
        gaps: ['Schema default exists; not read by UI or CoachService'],
    },
    {
        id: CoachFeatureId.COACH_GUIDE_SURFACE,
        status: CoachFeatureStatus.BACKLOG,
        title: 'Adopt CoachGuideSurface at call sites',
        where: 'On-screen helpers',
        gaps: ['Component exported; few/no consumers'],
    },
    {
        id: CoachFeatureId.FEED_KEY_I18N,
        status: CoachFeatureStatus.BACKLOG,
        title: 'i18n for non–energy.time feed keys',
        where: 'resolveCoachMessage',
        gaps: ['Non-time keys fall back to server English'],
    },
] as const;

const BY_ID: ReadonlyMap<CoachFeatureId, CoachFeature> = new Map(
    COACH_FEATURES.map(feature => [feature.id, feature])
);

export function getCoachFeature(id: CoachFeatureId): CoachFeature | undefined {
    return BY_ID.get(id);
}

/**
 * Whether preview coaches should be inactive.
 * Driven only by `NODE_ENV` — defer when `production`.
 */
export function shouldDeferPreviewCoaches(opts: { nodeEnv?: string | null }): boolean {
    const nodeEnv = opts.nodeEnv?.trim().toLowerCase() ?? 'development';
    return nodeEnv === 'production';
}

/**
 * Whether a coach/helper surface may render (env gate only — helpers preference is separate).
 * - `ship` → always true
 * - `preview` → false when deferred (production)
 * - `backlog` → always false (checklist only)
 */
export function isCoachFeatureEnabledAtLaunch(
    id: CoachFeatureId,
    opts: { nodeEnv?: string | null }
): boolean {
    const feature = BY_ID.get(id);
    if (!feature) return false;
    if (feature.status === CoachFeatureStatus.BACKLOG) return false;
    if (feature.status === CoachFeatureStatus.SHIP) return true;
    return !shouldDeferPreviewCoaches(opts);
}
