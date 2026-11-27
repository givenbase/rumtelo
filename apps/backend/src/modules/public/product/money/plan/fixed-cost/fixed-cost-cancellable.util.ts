import { FIXED_COST_PRESET_SEED } from '../../../../../backoffice/product/money/preset/fixed-cost/seed/fixed-cost.seed-data';
import { MERCHANT_PRESET_SEED } from '../../../../../backoffice/product/money/preset/merchant/seed';
import { TELCO_MERCHANTS } from '../../../../../backoffice/product/money/preset/merchant/seed/by-category/subscriptions';

/**
 * Which fixed costs are optional recurring spend. Read-only: derived from the bill preset
 * (`presetKey`) and the paid-to merchant (`merchantKey`) against the Rumtelo catalogs, never
 * from the typed name. Powers the neutral "Could cancel?" chip and the quarterly
 * subscription review tip.
 *
 * Two tiers, one inside the other:
 * - **Subscription** — a recurring service you could stop: non-essential subscription presets
 *   (cloud storage, software, news, VPN), streaming / gaming / media presets and meal kits,
 *   plus merchants in the Subscriptions (not telco), Media and Gaming categories.
 * - **Cancellable** — every subscription, plus gym / club / hobby memberships and bills paid to
 *   eating-out or coffee merchants (food and drink deliveries).
 *
 * Essentials are never flagged: internet, mobile, landline (telco merchants are excluded from
 * Subscriptions), rent, insurance, utilities, taxes, debt, care. Sport merchants are not flagged
 * either — the category mixes gyms with retailers (Decathlon, Nike), so only the GYM and
 * SPORTS_CLUB presets count.
 */

const SUBSCRIPTION_PRESET_CATEGORIES: ReadonlySet<string> = new Set(['SUBSCRIPTIONS', 'MEDIA']);
/** Subscriptions-category presets that are essentials, not choices. */
const ESSENTIAL_PRESET_KEYS: ReadonlySet<string> = new Set([
    'INTERNET',
    'MOBILE_PHONE',
    'MOBILE_PHONE_PARTNER',
    'LANDLINE',
]);
/** Presets outside those categories that are still a subscription. */
const EXTRA_SUBSCRIPTION_PRESET_KEYS: readonly string[] = ['MEAL_KIT'];
/** Memberships that are optional but not subscriptions. */
const MEMBERSHIP_PRESET_KEYS: readonly string[] = ['GYM', 'SPORTS_CLUB', 'HOBBY_MEMBERSHIP'];

const SUBSCRIPTION_MERCHANT_CATEGORIES: ReadonlySet<string> = new Set([
    'SUBSCRIPTIONS',
    'MEDIA',
    'GAMING',
]);
const DELIVERY_MERCHANT_CATEGORIES: ReadonlySet<string> = new Set(['EATING_OUT', 'COFFEE']);
const TELCO_MERCHANT_KEYS: ReadonlySet<string> = new Set(
    TELCO_MERCHANTS.map(merchant => merchant.key)
);

/** Preset keys that are subscriptions. Exported for the catalog-drift spec. */
export const SUBSCRIPTION_PRESET_KEYS: ReadonlySet<string> = new Set([
    ...FIXED_COST_PRESET_SEED.filter(
        preset =>
            SUBSCRIPTION_PRESET_CATEGORIES.has(preset.categoryTemplateKey) &&
            !ESSENTIAL_PRESET_KEYS.has(preset.key)
    ).map(preset => preset.key),
    ...EXTRA_SUBSCRIPTION_PRESET_KEYS,
]);

/** Merchant keys that are subscriptions (telco excluded). */
export const SUBSCRIPTION_MERCHANT_KEYS: ReadonlySet<string> = new Set(
    MERCHANT_PRESET_SEED.filter(
        merchant =>
            SUBSCRIPTION_MERCHANT_CATEGORIES.has(merchant.categoryTemplateKey) &&
            !TELCO_MERCHANT_KEYS.has(merchant.key)
    ).map(merchant => merchant.key)
);

const CANCELLABLE_PRESET_KEYS: ReadonlySet<string> = new Set([
    ...SUBSCRIPTION_PRESET_KEYS,
    ...MEMBERSHIP_PRESET_KEYS,
]);

const CANCELLABLE_MERCHANT_KEYS: ReadonlySet<string> = new Set([
    ...SUBSCRIPTION_MERCHANT_KEYS,
    ...MERCHANT_PRESET_SEED.filter(merchant =>
        DELIVERY_MERCHANT_CATEGORIES.has(merchant.categoryTemplateKey)
    ).map(merchant => merchant.key),
]);

type CatalogPick = { presetKey: string | null; merchantKey: string | null };

/** True when the bill is a recurring service the household could stop. */
export function isSubscriptionFixedCost(item: CatalogPick): boolean {
    return (
        (item.presetKey !== null && SUBSCRIPTION_PRESET_KEYS.has(item.presetKey)) ||
        (item.merchantKey !== null && SUBSCRIPTION_MERCHANT_KEYS.has(item.merchantKey))
    );
}

/** True when the bill is optional recurring spend: a subscription, a membership or a delivery. */
export function isCancellableFixedCost(item: CatalogPick): boolean {
    return (
        (item.presetKey !== null && CANCELLABLE_PRESET_KEYS.has(item.presetKey)) ||
        (item.merchantKey !== null && CANCELLABLE_MERCHANT_KEYS.has(item.merchantKey))
    );
}
