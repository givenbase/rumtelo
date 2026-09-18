import {
    CAPABILITY_DEFINITIONS,
    parseCapabilityKey,
    type CapabilityProduct,
} from '@rumtelo/contracts';

/**
 * PlanFeature seed — one row per capability (1:1 with Capability for now).
 * key = feature segment; productKey = product prefix.
 */
export const PLAN_FEATURE_SEED = CAPABILITY_DEFINITIONS.map(row => {
    const { product, feature } = parseCapabilityKey(row.key);
    return {
        capabilityKey: row.key,
        productKey: product as CapabilityProduct,
        key: feature,
        name: row.name,
        description: row.description,
        sortOrder: row.sortOrder,
    };
});
