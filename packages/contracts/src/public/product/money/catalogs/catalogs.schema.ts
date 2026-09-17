/**
 * Catalogs Schemas (Money)
 * Backoffice company catalog DTOs — read-only suggestions for create forms.
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import { Cadence, FlowDirection } from '../../../../common/common.enums';
import { CatalogItemBase } from '../../../../common/common.schema';
import { DebtKind, GivingCause, GivingEvaluator, IncomeKind, JarKey } from '../enums';
import { JarCapabilities } from '../jar/jar.schema';

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
    /** MerchantPreset.key chips for “Paid to” after this bill type is picked. */
    suggestedMerchantKeys: z.array(z.string().min(1).max(64)),
});

export const DebtPreset = CatalogItemBase.extend({
    kind: z.enum(DebtKind),
    icon: z.string().max(8).nullable(),
    /** MerchantPreset.key chips for "Who do you owe?" after this type is picked. */
    suggestedMerchantKeys: z.array(z.string().min(1).max(64)),
});

export const JarGuideItem = z.object({
    label: z.string().min(1).max(80),
    icon: z.string().min(1).max(8),
});

export const JarGuideLink = z.object({
    href: z.string().min(1).max(240),
    label: z.string().min(1).max(80),
    icon: z.string().min(1).max(8),
});

export const JarGuide = z.object({
    note: z.string().min(1).max(480),
    allowed: z.array(JarGuideItem).max(16),
    notAllowed: z.string().min(1).max(320),
    links: z.array(JarGuideLink).max(8),
    subs: z
        .array(
            z.object({
                label: z.string().min(1).max(80),
                pct: z.number().min(0).max(100),
                icon: z.string().max(8).optional(),
            })
        )
        .max(8)
        .optional(),
    subNote: z.string().max(480).optional(),
});

export const JarTemplate = CatalogItemBase.extend({
    subtitle: z.string().max(160).nullable(),
    icon: z.string().max(8).nullable(),
    /** Default share of net income (0–100). */
    defaultPercentage: z.number().min(0).max(100),
    capabilities: JarCapabilities,
    guide: JarGuide.nullable(),
});

export const IncomeSourcePreset = CatalogItemBase.extend({
    kind: z.enum(IncomeKind),
    defaultCadence: z.enum(Cadence),
    /** Emoji for the create picker; nullish until migration/seed lands. */
    icon: z.string().max(32).nullish(),
});

export const TransactionInPreset = CatalogItemBase.extend({
    /** Picker group label (People, Official, …). */
    group: z.string().min(1).max(64),
    icon: z.string().max(8).nullable(),
    /** Soft jar hint when picked; null = leave jar alone. */
    jarKey: z.enum(JarKey).nullable(),
});

export const GoalPreset = CatalogItemBase.extend({
    jarKey: z.enum(JarKey),
    categoryTemplateKey: z.string().min(1).max(64).nullable(),
    icon: z.string().max(8).nullable(),
});

export const MerchantHighlight = z.enum(['FEATURED', 'NEW', 'POPULAR']);

export const MerchantPreset = CatalogItemBase.extend({
    matchValue: z.string().min(1).max(120),
    /** Extra bank-feed needles (Revolut / SEPA / card descriptors). */
    aliases: z.array(z.string().min(1).max(120)),
    /** ISO 18245 merchant category code when known. */
    mcc: z.string().length(4).nullable(),
    jarKey: z.enum(JarKey),
    categoryTemplateKey: z.string().min(1).max(64),
    /** Favicon hostname — client builds logo URL; no client brand mirror. */
    logoDomain: z.string().min(1).max(120).nullable(),
    website: z.string().max(240).nullable(),
    /** Dutch IBAN bank code (positions 5–8), e.g. INGB. Null when not applicable. */
    ibanBankCode: z.string().length(4).nullable(),
    /** Editorial pin + chip label; null = normal. */
    highlight: MerchantHighlight.nullable(),
    /** ISO markets where this merchant is listed (e.g. NL). */
    markets: z.array(z.string().length(2)).min(1),
    matchPriority: z.int(),
    /** Aggregator merchant ids when Open Banking is wired. */
    providerIds: z.record(z.string(), z.string()),
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
export type JarGuide = z.infer<typeof JarGuide>;
export type JarTemplate = z.infer<typeof JarTemplate>;
export type IncomeSourcePreset = z.infer<typeof IncomeSourcePreset>;
export type TransactionInPreset = z.infer<typeof TransactionInPreset>;
export type GoalPreset = z.infer<typeof GoalPreset>;
export type MerchantPreset = z.infer<typeof MerchantPreset>;
export type MerchantHighlight = z.infer<typeof MerchantHighlight>;
