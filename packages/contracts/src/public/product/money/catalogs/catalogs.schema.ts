/**
 * Catalogs Schemas (Money)
 * Backoffice company catalog DTOs — read-only suggestions for create forms.
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import { Cadence, FlowDirection } from '../../../../common/common.enums';
import { CatalogItemBase, Id } from '../../../../common/common.schema';
import {
    DebtKind,
    GivingCause,
    GivingEvaluator,
    GivingSignalTier,
    IncomeKind,
    JarKey,
    MerchantHighlight,
} from '../enums';
import { JarCapabilities } from '../jar/jar.schema';

/** Money company-catalog DTOs (backoffice.product.money templates + presets). */

export const CategoryTemplate = CatalogItemBase.extend({
    jarKey: z.enum(JarKey),
    icon: z.string().max(8).nullable(),
});

/** Lifestyle audience for the fixed-cost bill picker (grows via seed, not a TS enum). */
export const Audience = CatalogItemBase.extend({
    /** One line under the chip / for tooltips. */
    description: z.string().max(280).nullable(),
    /** Baseline audiences are not chips; their bills stay listed under every other filter. */
    isBaseline: z.boolean(),
    icon: z.string().max(8).nullable(),
    /** CSS color token for chip text / border. */
    accentColor: z.string().max(64).nullable(),
    /** CSS color token for chip fill. */
    softColor: z.string().max(64).nullable(),
});

export const FixedCostPreset = CatalogItemBase.extend({
    jarKey: z.enum(JarKey),
    categoryTemplateKey: z.string().min(1).max(64),
    cadence: z.enum(Cadence),
    /** Day-of-month hint (1–31) pre-filled in the due-day field. */
    dueDay: z.int().min(1).max(31).nullable(),
    direction: z.enum(FlowDirection),
    /** Audience.key values from the audience catalog (empty = every audience). */
    audienceKeys: z.array(z.string().min(1).max(64)),
    /** Ordered MerchantPreset.key chips for “Paid to” after this bill type is picked. */
    merchantKeys: z.array(z.string().min(1).max(64)),
});

export const DebtPreset = CatalogItemBase.extend({
    kind: z.enum(DebtKind),
    icon: z.string().max(8).nullable(),
    /** Ordered MerchantPreset.key chips for "Who do you owe?" after this type is picked. */
    merchantKeys: z.array(z.string().min(1).max(64)),
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
    percentage: z.number().min(0).max(100),
    capabilities: JarCapabilities,
    guide: JarGuide.nullable(),
});

export const IncomeSourcePreset = CatalogItemBase.extend({
    kind: z.enum(IncomeKind),
    cadence: z.enum(Cadence),
    /** Emoji for the create picker. */
    icon: z.string().max(8).nullable(),
});

export const TransactionInPreset = CatalogItemBase.extend({
    /** Picker group heading (People, Official, …). */
    groupName: z.string().min(1).max(64),
    icon: z.string().max(8).nullable(),
    /** Soft jar hint when picked; null = leave jar alone. */
    jarKey: z.enum(JarKey).nullable(),
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
    /**
     * When set, mirrors GivingOrganisation.key — bank matching only;
     * Coach catalog owns editorial identity.
     */
    givingOrganisationKey: z.string().min(1).max(64).nullable(),
    /** Favicon hostname — client builds logo URL; no client brand mirror. */
    logoDomain: z.string().min(1).max(120).nullable(),
    website: z.string().max(240).nullable(),
    /** Editorial pin + chip label; null = normal. */
    highlight: z.enum(MerchantHighlight).nullable(),
    /** ISO markets where this merchant is listed (e.g. NL). */
    markets: z.array(z.string().length(2)).min(1),
    matchPriority: z.int(),
    /** Aggregator merchant ids when Open Banking is wired. */
    providerIds: z.record(z.string(), z.string()),
});

/** Company bank pick-list for household account seats (not payment rails). */
export const Bank = CatalogItemBase.extend({
    id: Id,
    description: z.string().max(280).nullable(),
    /** ISO-2 markets this institution serves. */
    countries: z.array(z.string().length(2)).min(1),
    /** Dutch IBAN bank code (positions 5–8), e.g. INGB. Null when not applicable. */
    ibanBankCode: z.string().length(4).nullable(),
    logoDomain: z.string().min(1).max(120).nullable(),
    website: z.string().max(240).nullable(),
    /**
     * Retail bank keys this issuer co-brands with / that typically settle the card
     * (e.g. ICS → ING, ABN_AMRO). Empty for plain retail banks.
     */
    partnerBankKeys: z.array(z.string().min(1).max(64)),
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
    description: z.string().min(1).max(280),
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

export const GivingCauseCatalog = CatalogItemBase.extend({
    key: z.enum(GivingCause),
    icon: z.string().min(1).max(8),
    line: z.string().min(1).max(280),
});

export const GivingEvaluatorCatalog = CatalogItemBase.extend({
    key: z.enum(GivingEvaluator),
    tier: z.enum(GivingSignalTier),
    measures: z.string().min(1).max(480),
    url: z.url(),
});

// Inferred types (same-module merge for consumers)
export type GivingSignal = z.infer<typeof GivingSignal>;
export type GivingOrganisation = z.infer<typeof GivingOrganisation>;
export type CategoryTemplate = z.infer<typeof CategoryTemplate>;
export type Audience = z.infer<typeof Audience>;
export type Bank = z.infer<typeof Bank>;
export type FixedCostPreset = z.infer<typeof FixedCostPreset>;
export type DebtPreset = z.infer<typeof DebtPreset>;
export type JarGuide = z.infer<typeof JarGuide>;
export type JarTemplate = z.infer<typeof JarTemplate>;
export type IncomeSourcePreset = z.infer<typeof IncomeSourcePreset>;
export type TransactionInPreset = z.infer<typeof TransactionInPreset>;
export type GoalPreset = z.infer<typeof GoalPreset>;
export type MerchantPreset = z.infer<typeof MerchantPreset>;
export type GivingCauseCatalog = z.infer<typeof GivingCauseCatalog>;
export type GivingEvaluatorCatalog = z.infer<typeof GivingEvaluatorCatalog>;
