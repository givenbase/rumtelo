import { CapabilityProduct, PlanKey } from '@rumtelo/contracts';

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

/** Products a visitor can actually use today — the cards never advertise the rest. */
export function livePlanProducts(opts?: LaunchOpts): PlanProduct[] {
    return PLAN_PRODUCTS.filter(product => isProductLive(product, opts));
}

export const PLAN_FEATURE_KEYS = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'] as const;

export type PlanFeatureKey = (typeof PLAN_FEATURE_KEYS)[number];

/**
 * Highlight lines per plan (a key missing here has no copy) and the product each one is about.
 * `null` = always shown; a product = dropped with it while that product is not live.
 * Keep in step with `pages.landing.plans.<plan>.f*`.
 */
const PLAN_FEATURES: Record<PlanSlug, Partial<Record<PlanFeatureKey, PlanProduct | null>>> = {
    basic: {
        f1: CapabilityProduct.MONEY,
        f2: CapabilityProduct.GROWTH,
        f3: CapabilityProduct.ENERGY,
        f4: CapabilityProduct.SOUL,
        f5: null,
        f6: null,
    },
    plus: {
        f1: null,
        f2: CapabilityProduct.GROWTH,
        f3: CapabilityProduct.MONEY,
        f4: CapabilityProduct.GROWTH,
        f5: CapabilityProduct.ENERGY,
        f6: null,
    },
    max: {
        f1: null,
        f2: CapabilityProduct.MONEY,
        f3: CapabilityProduct.GROWTH,
        f4: CapabilityProduct.SOUL,
        f5: null,
    },
};

export function livePlanFeatureKeys(plan: PlanKey, opts?: LaunchOpts): PlanFeatureKey[] {
    const live = new Set<string>(livePlanProducts(opts));
    const lines = PLAN_FEATURES[planSlug(plan)];
    return PLAN_FEATURE_KEYS.filter(key => {
        const product = lines[key];
        if (product === undefined) return false;
        return product === null || live.has(product);
    });
}
