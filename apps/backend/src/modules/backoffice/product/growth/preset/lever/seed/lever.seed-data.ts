import {
    INCOME_POSTURE_KEYS,
    SpendingStyle,
    WEALTH_STAGE_KEYS,
    type GrowthLeverPreset,
} from '@rumtelo/contracts';

/**
 * Canonical growth lever catalog — Rumtelo-owned methods (not third-party frameworks).
 * Loaded into backoffice.reference_growth_lever_preset.
 * Tags use posture / stage catalog keys (scalable — not Postgres enums).
 */
export const LEVER_PRESET_SEED: readonly Omit<
    GrowthLeverPreset,
    'sortOrder' | 'minWealthStageSortOrder'
>[] = [
    {
        key: 'RAISE_RATE',
        name: 'Raise your rate',
        description:
            'Every €100 more per day is €2,000 extra per month. One conversation can do it.',
        accentColor: 'var(--color-accent)',
        postureKeys: [INCOME_POSTURE_KEYS.SKILL_TRADE, INCOME_POSTURE_KEYS.TIME_TRADE],
        spendingStyles: [],
        minWealthStageKey: WEALTH_STAGE_KEYS.BUILDING,
    },
    {
        key: 'ADD_SERVICE',
        name: 'Add a service',
        description: 'A second product or service has zero fixed costs once the first is running.',
        accentColor: 'var(--color-jar-lts)',
        postureKeys: [INCOME_POSTURE_KEYS.SKILL_TRADE, INCOME_POSTURE_KEYS.SYSTEM],
        spendingStyles: [],
        minWealthStageKey: WEALTH_STAGE_KEYS.BUILDING,
    },
    {
        key: 'BUILD_PASSIVE',
        name: 'Build asset income',
        description: 'Something made once that keeps working. Starts small, never zero.',
        accentColor: 'var(--color-jar-ff)',
        postureKeys: [INCOME_POSTURE_KEYS.ASSETS, INCOME_POSTURE_KEYS.SYSTEM],
        spendingStyles: [SpendingStyle.SAVER, SpendingStyle.BALANCED],
        minWealthStageKey: WEALTH_STAGE_KEYS.SECURE,
    },
    {
        key: 'ACTIVATE_NETWORK',
        name: 'Activate your network',
        description: 'Revenue from people costs no marketing. Every happy client is a channel.',
        accentColor: 'var(--color-jar-edu)',
        postureKeys: [
            INCOME_POSTURE_KEYS.SKILL_TRADE,
            INCOME_POSTURE_KEYS.SYSTEM,
            INCOME_POSTURE_KEYS.TIME_TRADE,
        ],
        spendingStyles: [],
        minWealthStageKey: WEALTH_STAGE_KEYS.BUILDING,
    },
    {
        key: 'CUT_TIME_COST',
        name: 'Buy back your hours',
        description:
            'Automate or delegate one recurring task. Freed hours compound into earning capacity.',
        accentColor: 'var(--color-jar-nec)',
        postureKeys: [INCOME_POSTURE_KEYS.TIME_TRADE, INCOME_POSTURE_KEYS.SKILL_TRADE],
        spendingStyles: [SpendingStyle.SPENDER, SpendingStyle.BALANCED],
        minWealthStageKey: WEALTH_STAGE_KEYS.BUILDING,
    },
    {
        key: 'SCALE_SYSTEM',
        name: 'Scale what already works',
        description: 'Document the offer that sells. Repeatability beats one more custom project.',
        accentColor: 'var(--color-accent)',
        postureKeys: [INCOME_POSTURE_KEYS.SYSTEM, INCOME_POSTURE_KEYS.SKILL_TRADE],
        spendingStyles: [],
        minWealthStageKey: WEALTH_STAGE_KEYS.SECURE,
    },
] as const;
