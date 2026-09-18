/**
 * Catalogs Utils (Growth)
 * Well-known catalog keys, audience filter helper.
 */

import { SpendingStyle } from '../../../platform/enums';
import type { GrowthLeverPreset } from './catalogs.types';

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

export type LeverAudience = {
    postureKey?: string;
    spendingStyle?: SpendingStyle;
    stageKey?: string;
    /** sortOrder of the audience stage (from wealth stage catalog). */
    stageSortOrder?: number;
};

/** Filter catalog levers for the current person / board. */
export function filterGrowthLeverPresets(
    presets: readonly GrowthLeverPreset[],
    audience: LeverAudience = {}
): GrowthLeverPreset[] {
    const postureKey = audience.postureKey ?? INCOME_POSTURE_KEYS.UNKNOWN;
    const spendingStyle = audience.spendingStyle ?? SpendingStyle.UNKNOWN;
    const stageSortOrder = audience.stageSortOrder ?? 0;

    return presets.filter(preset => {
        if (preset.minWealthStageSortOrder > stageSortOrder) return false;
        if (
            preset.postureKeys.length > 0 &&
            postureKey !== INCOME_POSTURE_KEYS.UNKNOWN &&
            !preset.postureKeys.includes(postureKey)
        ) {
            return false;
        }
        if (
            preset.spendingStyles.length > 0 &&
            spendingStyle !== SpendingStyle.UNKNOWN &&
            !preset.spendingStyles.includes(spendingStyle)
        ) {
            return false;
        }
        return true;
    });
}
