/**
 * Catalogs Utils (Growth)
 * Well-known catalog keys. Audience filtering (posture / spending style / stage)
 * runs in SQL inside `LeverPresetService.listActive` — no client-side helper.
 */

export const INCOME_POSTURE_KEYS = {
    TIME_TRADE: 'TIME_TRADE',
    SKILL_TRADE: 'SKILL_TRADE',
    SYSTEM: 'SYSTEM',
    ASSETS: 'ASSETS',
    UNKNOWN: 'UNKNOWN',
} as const;

export const WEALTH_STAGE_KEYS = {
    BUILDING: 'BUILDING',
    SECURE: 'SECURE',
    INDEPENDENT: 'INDEPENDENT',
    ABUNDANT: 'ABUNDANT',
} as const;
