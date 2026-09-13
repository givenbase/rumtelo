/**
 * Catalogs Schemas (Money)
 * Backoffice company catalog DTOs — read-only suggestions for create forms.
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import { Cadence, FlowDirection } from '../../../../common/common.enums';
import { CatalogItemBase } from '../../../../common/common.schema';
import { DebtKind, GivingCause, GivingEvaluator, IncomeKind, JarKey } from '../enums';

/** Money company-catalog DTOs (backoffice.product.money templates + presets). */

export const CategoryTemplate = CatalogItemBase.extend({
    jarKey: z.enum(JarKey),
    icon: z.string().max(8).nullable(),
});

export const FixedCostPreset = CatalogItemBase.extend({
    jarKey: z.enum(JarKey),
    categoryTemplateKey: z.string().min(1).max(64),
    defaultCadence: z.enum(Cadence),
    suggestedDueDay: z.int().min(1).max(31).nullable(),
    direction: z.enum(FlowDirection),
    audienceTags: z.array(z.string()),
});

export const DebtPreset = CatalogItemBase.extend({
    kind: z.enum(DebtKind),
    icon: z.string().max(8).nullable(),
    /** Lender name chips for "Who do you owe?" after this type is picked. */
    suggestedLenders: z.array(z.string().min(1).max(120)),
});

export const IncomeSourcePreset = CatalogItemBase.extend({
    kind: z.enum(IncomeKind),
    defaultCadence: z.enum(Cadence),
    /** Emoji for the create picker; nullish until migration/seed lands. */
    icon: z.string().max(32).nullish(),
});

export const GoalPreset = CatalogItemBase.extend({
    jarKey: z.enum(JarKey),
    categoryTemplateKey: z.string().min(1).max(64).nullable(),
    icon: z.string().max(8).nullable(),
});

export const MerchantPreset = CatalogItemBase.extend({
    matchValue: z.string().min(1).max(120),
    /** Extra bank-feed needles (Revolut / SEPA / card descriptors). */
    aliases: z.array(z.string().min(1).max(120)),
    /** ISO 18245 merchant category code when known. */
    mcc: z.string().length(4).nullable(),
    jarKey: z.enum(JarKey),
    categoryTemplateKey: z.string().min(1).max(64),
});

/** One independent signal about an organisation — who says so, what, and where to check. */
export const GivingSignal = z.object({
    evaluator: z.enum(GivingEvaluator),
    /** Short claim as the evaluator phrases it, e.g. "Top Charity 2025". */
    label: z.string().min(1).max(120),
    url: z.url().nullable(),
    /** Year the signal was last confirmed, so stale badges are visible. */
    year: z.int().min(2000).max(2100).nullable(),
});

/**
 * A vetted organisation for the Give jar. Editorial catalog: every row must
 * carry at least one independent signal; the app never claims its own vetting.
 */
export const GivingOrganisation = CatalogItemBase.extend({
    /** One neutral sentence on what they do. */
    summary: z.string().min(1).max(280),
    causes: z.array(z.enum(GivingCause)).min(1),
    /** ISO 3166-1 alpha-2 of the HQ; null when genuinely distributed. */
    country: z.string().length(2).nullable(),
    /** Where the work lands, e.g. "Sub-Saharan Africa", "Netherlands". */
    scope: z.string().max(64).nullable(),
    website: z.url(),
    signals: z.array(GivingSignal).min(1),
    /** How donors hear back — annual report, live feed, per-programme updates. */
    reporting: z.string().max(280).nullable(),
});

// Inferred types (same-module merge for consumers)
export type GivingSignal = z.infer<typeof GivingSignal>;
export type GivingOrganisation = z.infer<typeof GivingOrganisation>;
export type CategoryTemplate = z.infer<typeof CategoryTemplate>;
export type FixedCostPreset = z.infer<typeof FixedCostPreset>;
export type DebtPreset = z.infer<typeof DebtPreset>;
export type IncomeSourcePreset = z.infer<typeof IncomeSourcePreset>;
export type GoalPreset = z.infer<typeof GoalPreset>;
export type MerchantPreset = z.infer<typeof MerchantPreset>;
