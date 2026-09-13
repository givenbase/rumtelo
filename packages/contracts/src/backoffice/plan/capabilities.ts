import { type CapabilityKind } from './enums';

/**
 * Capability model — expandable `{product}-{feature}` constants.
 *
 * Mental model:
 *   plan  →  product (home | money | growth | energy | soul | platform)
 *         →  features inside that product (debt, goals, …)
 *
 * To add a feature:
 *   1. Add it under FEATURES[product]
 *   2. Grant it under PLAN_ACCESS[plan][product] (schemas/plan.ts)
 *   3. Add catalog copy in CAPABILITY_CATALOG
 */

/** Product prefixes used in capability keys. */
export const CapabilityProduct = {
    HOME: 'home',
    MONEY: 'money',
    GROWTH: 'growth',
    ENERGY: 'energy',
    SOUL: 'soul',
    PLATFORM: 'platform',
} as const;
export type CapabilityProduct = (typeof CapabilityProduct)[keyof typeof CapabilityProduct];

export const CAPABILITY_PRODUCTS = Object.values(CapabilityProduct) as [
    CapabilityProduct,
    ...CapabilityProduct[],
];

/** Build `{product}-{feature}` — single place that encodes the naming rule. */
export function capabilityKey<P extends string, F extends string>(
    product: P,
    feature: F
): `${P}-${F}` {
    return `${product}-${feature}`;
}

/**
 * Features grouped by product — full inventory (free + paid).
 * Pre-launch we rename keys to match product names (no aliases).
 * After launch, values are stable DB / nav / RequireCapability keys — do not rename in place.
 */
export const FEATURES = {
    [CapabilityProduct.HOME]: {
        overview: capabilityKey(CapabilityProduct.HOME, 'overview'),
        coach: capabilityKey(CapabilityProduct.HOME, 'coach'),
        why: capabilityKey(CapabilityProduct.HOME, 'why'),
    },
    [CapabilityProduct.MONEY]: {
        overview: capabilityKey(CapabilityProduct.MONEY, 'overview'),
        jars: capabilityKey(CapabilityProduct.MONEY, 'jars'),
        spending: capabilityKey(CapabilityProduct.MONEY, 'spending'),
        fixedCosts: capabilityKey(CapabilityProduct.MONEY, 'fixed-costs'),
        debt: capabilityKey(CapabilityProduct.MONEY, 'debt'),
        bank: capabilityKey(CapabilityProduct.MONEY, 'bank'),
        import: capabilityKey(CapabilityProduct.MONEY, 'import'),
    },
    [CapabilityProduct.GROWTH]: {
        overview: capabilityKey(CapabilityProduct.GROWTH, 'overview'),
        goals: capabilityKey(CapabilityProduct.GROWTH, 'goals'),
        income: capabilityKey(CapabilityProduct.GROWTH, 'income'),
        netWorth: capabilityKey(CapabilityProduct.GROWTH, 'net-worth'),
        learn: capabilityKey(CapabilityProduct.GROWTH, 'learn'),
    },
    [CapabilityProduct.ENERGY]: {
        overview: capabilityKey(CapabilityProduct.ENERGY, 'overview'),
        sleep: capabilityKey(CapabilityProduct.ENERGY, 'sleep'),
        week: capabilityKey(CapabilityProduct.ENERGY, 'week'),
        training: capabilityKey(CapabilityProduct.ENERGY, 'training'),
        food: capabilityKey(CapabilityProduct.ENERGY, 'food'),
    },
    [CapabilityProduct.SOUL]: {
        overview: capabilityKey(CapabilityProduct.SOUL, 'overview'),
        stillness: capabilityKey(CapabilityProduct.SOUL, 'stillness'),
        gratitude: capabilityKey(CapabilityProduct.SOUL, 'gratitude'),
        giving: capabilityKey(CapabilityProduct.SOUL, 'giving'),
        intent: capabilityKey(CapabilityProduct.SOUL, 'intent'),
        centres: capabilityKey(CapabilityProduct.SOUL, 'centres'),
    },
    [CapabilityProduct.PLATFORM]: {
        invite: capabilityKey(CapabilityProduct.PLATFORM, 'invite'),
    },
} as const;

/** Flat aliases for call sites (`CAPABILITIES.growthGoals`). */
export const CAPABILITIES = {
    homeOverview: FEATURES.home.overview,
    homeCoach: FEATURES.home.coach,
    homeWhy: FEATURES.home.why,
    moneyOverview: FEATURES.money.overview,
    moneyJars: FEATURES.money.jars,
    moneySpending: FEATURES.money.spending,
    moneyFixedCosts: FEATURES.money.fixedCosts,
    moneyDebt: FEATURES.money.debt,
    moneyBank: FEATURES.money.bank,
    moneyImport: FEATURES.money.import,
    growthOverview: FEATURES.growth.overview,
    growthGoals: FEATURES.growth.goals,
    growthIncome: FEATURES.growth.income,
    growthNetWorth: FEATURES.growth.netWorth,
    growthLearn: FEATURES.growth.learn,
    energyOverview: FEATURES.energy.overview,
    energySleep: FEATURES.energy.sleep,
    energyWeek: FEATURES.energy.week,
    energyTraining: FEATURES.energy.training,
    energyFood: FEATURES.energy.food,
    soulOverview: FEATURES.soul.overview,
    soulStillness: FEATURES.soul.stillness,
    soulGratitude: FEATURES.soul.gratitude,
    soulGiving: FEATURES.soul.giving,
    soulIntent: FEATURES.soul.intent,
    soulCentres: FEATURES.soul.centres,
    platformInvite: FEATURES.platform.invite,
} as const;

/** Union of all registered capability key strings (`money-debt` | …). */
export type CapabilityKey = (typeof CAPABILITIES)[keyof typeof CAPABILITIES];

/** Tuple for Zod `z.enum` / iteration. */
export const CAPABILITY_KEYS = Object.values(CAPABILITIES) as [CapabilityKey, ...CapabilityKey[]];

export const CAPABILITY_KEY_SET: ReadonlySet<string> = new Set(CAPABILITY_KEYS);

export function isCapabilityKey(value: string | null | undefined): value is CapabilityKey {
    return Boolean(value && CAPABILITY_KEY_SET.has(value));
}

/** Parse `money-debt` → { product: 'money', feature: 'debt' }. */
export function parseCapabilityKey(key: string): {
    product: string;
    feature: string;
} {
    const dash = key.indexOf('-');
    if (dash <= 0) return { product: key, feature: key };
    return { product: key.slice(0, dash), feature: key.slice(dash + 1) };
}

export function productOfCapability(key: CapabilityKey): CapabilityProduct {
    const { product } = parseCapabilityKey(key);
    return product as CapabilityProduct;
}

export type CapabilityMeta = {
    key: CapabilityKey;
    product: CapabilityProduct;
    feature: string;
    kind: CapabilityKind;
    name: string;
    description: string;
    sortOrder: number;
};
