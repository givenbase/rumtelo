import { CapabilityProduct, FEATURES, PLAN_ACCESS, PlanKey } from '@rumtelo/contracts';

import { isProductLive, type LaunchOpts } from './launch-products';

export type PlanSlug = 'basic' | 'plus' | 'max';

export function planSlug(key: PlanKey): PlanSlug {
    if (key === PlanKey.BASIC) return 'basic';
    if (key === PlanKey.PLUS) return 'plus';
    return 'max';
}

/** The four products a household plan sells — same order as the landing portals. */
export const PLAN_PRODUCTS = [
    CapabilityProduct.MONEY,
    CapabilityProduct.GROWTH,
    CapabilityProduct.ENERGY,
    CapabilityProduct.SOUL,
] as const;

export type PlanProduct = (typeof PLAN_PRODUCTS)[number];

export type PlanProductCoverage = {
    product: PlanProduct;
    included: number;
    total: number;
};

/** Products a visitor can actually use today — the cards never advertise the rest. */
export function livePlanProducts(opts?: LaunchOpts): PlanProduct[] {
    return PLAN_PRODUCTS.filter(product => isProductLive(product, opts));
}

export const PLAN_FEATURE_KEYS = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'] as const;

export type PlanFeatureKey = (typeof PLAN_FEATURE_KEYS)[number];

/** Highlight lines tied to one product — dropped with it while that product is not live. */
const PLAN_FEATURE_PRODUCT: Record<PlanSlug, Partial<Record<PlanFeatureKey, PlanProduct>>> = {
    basic: {
        f1: CapabilityProduct.MONEY,
        f2: CapabilityProduct.GROWTH,
        f3: CapabilityProduct.ENERGY,
        f4: CapabilityProduct.SOUL,
    },
    plus: {
        f2: CapabilityProduct.MONEY,
        f3: CapabilityProduct.MONEY,
        f4: CapabilityProduct.ENERGY,
    },
    max: {
        f2: CapabilityProduct.MONEY,
        f3: CapabilityProduct.GROWTH,
        f4: CapabilityProduct.SOUL,
        f6: CapabilityProduct.ENERGY,
    },
};

export function livePlanFeatureKeys(plan: PlanKey, opts?: LaunchOpts): PlanFeatureKey[] {
    const live = new Set<string>(livePlanProducts(opts));
    const tagged = PLAN_FEATURE_PRODUCT[planSlug(plan)];
    return PLAN_FEATURE_KEYS.filter(key => {
        const product = tagged[key];
        return !product || live.has(product);
    });
}

/** A product's `overview` is its hub page, not a feature — never counted. */
function countedFeatures(keys: readonly string[]): string[] {
    return keys.filter(key => !key.endsWith('-overview'));
}

/** "Money 3/6" per plan — derived from PLAN_ACCESS so the cards follow real gating. */
export function planProductCoverage(plan: PlanKey, opts?: LaunchOpts): PlanProductCoverage[] {
    return livePlanProducts(opts).map(product => ({
        product,
        included: countedFeatures(PLAN_ACCESS[plan][product]).length,
        total: countedFeatures(Object.values(FEATURES[product])).length,
    }));
}
