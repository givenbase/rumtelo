import { PlanKey } from '@rumtelo/contracts';

/**
 * Commercial plan rows (Basic / Plus / Max). priceMonthly in eurocents.
 *
 * What each plan can *do* is not listed here — see plan-capability.seed-data.ts:
 *   PLAN_CAPABILITY_SEED        → all featureKeys
 *   PLAN_CAPABILITY_GRANT_SEED  → plan ↔ featureKey links
 */
export const PLAN_SEED = [
    { key: PlanKey.BASIC, name: 'Basic', priceMonthly: 0 },
    { key: PlanKey.PLUS, name: 'Plus', priceMonthly: 900 },
    { key: PlanKey.MAX, name: 'Max', priceMonthly: 1900 },
] as const;
