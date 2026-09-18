import { WEALTH_STAGE_KEYS } from '@rumtelo/contracts';

/** Seed rows for backoffice.reference_growth_wealth_stage. */
export const WEALTH_STAGE_SEED = [
    {
        key: WEALTH_STAGE_KEYS.BUILDING,
        name: 'Building',
        description: 'Foundation — covering costs and starting to pay yourself first.',
        badgeLabel: null as string | null,
        minNetWorth: null as number | null,
    },
    {
        key: WEALTH_STAGE_KEYS.SECURE,
        name: 'Secure',
        description: 'Buffer in place — room to invest in skills and systems.',
        badgeLabel: null,
        minNetWorth: 2_500_000, // €25k
    },
    {
        key: WEALTH_STAGE_KEYS.INDEPENDENT,
        name: 'Independent',
        description: 'Assets and systems cover a meaningful share of living costs.',
        badgeLabel: null,
        minNetWorth: 50_000_000, // €500k
    },
    {
        key: WEALTH_STAGE_KEYS.ABUNDANT,
        name: 'Abundant',
        description: 'Optional work — growth choices are about purpose, not survival.',
        badgeLabel: null,
        minNetWorth: 200_000_000, // €2M
    },
] as const;
