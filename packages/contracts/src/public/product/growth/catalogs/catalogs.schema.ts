/**
 * Catalogs Schemas (Growth)
 * Postures, wealth stages, and lever presets from backoffice.
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import { CatalogItemBase, Money } from '../../../../common/common.schema';
import { SpendingStyle } from '../../../platform/enums';

/** Scalable earning-posture row (backoffice.reference_growth_income_posture). */
export const IncomePosture = CatalogItemBase.extend({
    description: z.string().max(280).nullable(),
});

/**
 * Scalable wealth-stage row (backoffice.reference_growth_wealth_stage).
 * sortOrder drives progression; optional net-worth floor in minor units for later auto-detect.
 */
export const WealthStage = CatalogItemBase.extend({
    description: z.string().max(280).nullable(),
    /** Optional display badge (e.g. milestone label) — not a legal/status claim. */
    badgeLabel: z.string().max(64).nullable(),
    /** Net worth floor in eurocents; null = no automatic threshold yet. */
    minNetWorth: Money.nullable(),
});

/**
 * Backoffice catalog row: growth lever / method suggestion.
 * Audience tags use catalog keys so postures/stages can grow without code deploys.
 */
export const GrowthLeverPreset = CatalogItemBase.extend({
    description: z.string().min(1).max(280),
    accentColor: z.string().min(1).max(64),
    /** Empty = relevant for every posture. Keys → IncomePosture.key */
    postureKeys: z.array(z.string().min(1).max(64)),
    /** Empty = relevant for every spending style. */
    spendingStyles: z.array(z.enum(SpendingStyle)),
    /** Lowest wealth stage key that should see this lever. */
    minWealthStageKey: z.string().min(1).max(64),
    /** WealthStage.sortOrder of that stage, for client-side filtering. */
    minWealthStageSortOrder: z.int(),
});

// Inferred types (same-module merge for consumers)
export type IncomePosture = z.infer<typeof IncomePosture>;
export type WealthStage = z.infer<typeof WealthStage>;
export type GrowthLeverPreset = z.infer<typeof GrowthLeverPreset>;
