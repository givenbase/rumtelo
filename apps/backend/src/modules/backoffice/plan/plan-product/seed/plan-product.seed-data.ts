import { CAPABILITY_PRODUCTS, type CapabilityProduct } from '@rumtelo/contracts';

const PRODUCT_NAMES: Record<CapabilityProduct, string> = {
    home: 'Home',
    money: 'Money',
    growth: 'Growth',
    energy: 'Energy',
    soul: 'Soul',
    platform: 'Platform',
};

/** PlanProduct seed — one row per CapabilityProduct. */
export const PLAN_PRODUCT_SEED = CAPABILITY_PRODUCTS.map((key, sortOrder) => ({
    key,
    name: PRODUCT_NAMES[key],
    sortOrder,
}));
