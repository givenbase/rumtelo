import {
    CAPABILITY_DEFINITIONS,
    PLAN_ACCESS,
    PLAN_CAPABILITY_GRANT_ROWS,
    PlanKey,
    parseCapabilityKey,
    type CapabilityProduct,
} from '@rumtelo/contracts';

/**
 * Capability seed — readable mirror of contracts (all 26 featureKeys).
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

export const CAPABILITY_SEED = CAPABILITY_DEFINITIONS.map(row => {
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

export const PLAN_CAPABILITY_SEED = PLAN_CAPABILITY_GRANT_ROWS;

export const PLAN_ACCESS_SEED = {
    [PlanKey.BASIC]: PLAN_ACCESS[PlanKey.BASIC],
    [PlanKey.PLUS]: PLAN_ACCESS[PlanKey.PLUS],
    [PlanKey.MAX]: PLAN_ACCESS[PlanKey.MAX],
} as const;
