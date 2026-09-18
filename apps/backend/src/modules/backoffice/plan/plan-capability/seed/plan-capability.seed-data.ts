import {
    CAPABILITY_DEFINITIONS,
    PLAN_CAPABILITY_GRANT_ROWS,
    parseCapabilityKey,
    type CapabilityProduct,
} from '@rumtelo/contracts';

/**
 * PlanCapability seed — readable mirror of contracts (all 26 featureKeys).
 *
 *   featureKey            BASIC  PLUS  MAX
 *   ────────────────────────────────────────
 *   home-* / free money / …
 *   growth-goals            ✓     ✓     ✓
 *   money-debt / bank / import    ✓     ✓
 *   energy-week/training/food        ✓     ✓
 *   platform-invite               ✓     ✓
 *   growth-income/net-worth/learn           ✓
 *   soul-centres                         ✓
 *
 * Source of truth: packages/contracts PLAN_ACCESS / CAPABILITY_CATALOG
 */

export const PLAN_CAPABILITY_SEED = CAPABILITY_DEFINITIONS.map(row => {
    const { product, feature } = parseCapabilityKey(row.key);
    return {
        key: row.key,
        product: product as CapabilityProduct,
        feature,
        kind: row.kind,
        name: row.name,
        description: row.description,
        sortOrder: row.sortOrder,
    };
});

export const PLAN_CAPABILITY_GRANT_SEED = PLAN_CAPABILITY_GRANT_ROWS;
