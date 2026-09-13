/**
 * Plan Utils
 * Capability catalog, plan access tree, grant lists, and helper functions.
 */

import { HouseholdKind } from '../../enums';
import {
    CAPABILITIES,
    CAPABILITY_PRODUCTS,
    CapabilityProduct,
    isCapabilityKey,
    productOfCapability,
    type CapabilityKey,
} from './capabilities';
import { CapabilityKind, PlanKey } from './enums';
import type {
    CapabilityDefinition,
    PlanCapabilities,
    PlanCapabilityGrant,
    PlanLimitKey,
    PlanLimits,
} from './plan.types';

// ====================================================================
// Capability catalog
// ====================================================================

export const CAPABILITY_CATALOG: Record<CapabilityKey, CapabilityDefinition> = {
    [CAPABILITIES.homeOverview]: {
        key: CAPABILITIES.homeOverview,
        kind: CapabilityKind.SCREEN,
        name: 'Overview',
        description: 'Home overview and daily start.',
        sortOrder: 1,
    },
    [CAPABILITIES.homeCoach]: {
        key: CAPABILITIES.homeCoach,
        kind: CapabilityKind.SCREEN,
        name: 'Coach',
        description: 'Suggestions across products — week check, month score, and next moves.',
        sortOrder: 2,
    },
    [CAPABILITIES.homeWhy]: {
        key: CAPABILITIES.homeWhy,
        kind: CapabilityKind.SCREEN,
        name: 'Why',
        description: 'Why this practice matters.',
        sortOrder: 3,
    },
    [CAPABILITIES.moneyOverview]: {
        key: CAPABILITIES.moneyOverview,
        kind: CapabilityKind.SCREEN,
        name: 'Overview',
        description: 'Money overview and jar pulse.',
        sortOrder: 10,
    },
    [CAPABILITIES.moneyJars]: {
        key: CAPABILITIES.moneyJars,
        kind: CapabilityKind.SCREEN,
        name: 'Jars',
        description: 'The six jars — core money model.',
        sortOrder: 11,
    },
    [CAPABILITIES.moneySpending]: {
        key: CAPABILITIES.moneySpending,
        kind: CapabilityKind.SCREEN,
        name: 'Transactions',
        description: 'Manual in/out ledger and sorting.',
        sortOrder: 12,
    },
    [CAPABILITIES.moneyFixedCosts]: {
        key: CAPABILITIES.moneyFixedCosts,
        kind: CapabilityKind.SCREEN,
        name: 'Fixed costs',
        description: 'Recurring fixed costs.',
        sortOrder: 13,
    },
    [CAPABILITIES.moneyDebt]: {
        key: CAPABILITIES.moneyDebt,
        kind: CapabilityKind.SCREEN,
        name: 'Debt',
        description: 'Debt plan with interest, payoff order, and freedom date.',
        sortOrder: 14,
    },
    [CAPABILITIES.moneyBank]: {
        key: CAPABILITIES.moneyBank,
        kind: CapabilityKind.SCREEN,
        name: 'Bank',
        description: 'Connect bank accounts via PSD2.',
        sortOrder: 15,
    },
    [CAPABILITIES.moneyImport]: {
        key: CAPABILITIES.moneyImport,
        kind: CapabilityKind.ACTION,
        name: 'Import',
        description: 'Upload bankafschriften (CSV statement import).',
        sortOrder: 16,
    },
    [CAPABILITIES.growthOverview]: {
        key: CAPABILITIES.growthOverview,
        kind: CapabilityKind.SCREEN,
        name: 'Overview',
        description: 'Growth overview.',
        sortOrder: 20,
    },
    [CAPABILITIES.growthGoals]: {
        key: CAPABILITIES.growthGoals,
        kind: CapabilityKind.SCREEN,
        name: 'Goals',
        description: 'Goals with a date, jar, and progress.',
        sortOrder: 21,
    },
    [CAPABILITIES.growthIncome]: {
        key: CAPABILITIES.growthIncome,
        kind: CapabilityKind.SCREEN,
        name: 'Income',
        description: 'Income sources, monthly net, and earning methods.',
        sortOrder: 22,
    },
    [CAPABILITIES.growthLearn]: {
        key: CAPABILITIES.growthLearn,
        kind: CapabilityKind.SCREEN,
        name: 'Learn',
        description: 'Books, insights, and what they changed.',
        sortOrder: 23,
    },
    [CAPABILITIES.growthNetWorth]: {
        key: CAPABILITIES.growthNetWorth,
        kind: CapabilityKind.SCREEN,
        name: 'Net worth',
        description: 'Net worth, returns, and your freedom number.',
        sortOrder: 24,
    },
    [CAPABILITIES.energyOverview]: {
        key: CAPABILITIES.energyOverview,
        kind: CapabilityKind.SCREEN,
        name: 'Overview',
        description: 'Energy overview.',
        sortOrder: 30,
    },
    [CAPABILITIES.energySleep]: {
        key: CAPABILITIES.energySleep,
        kind: CapabilityKind.SCREEN,
        name: 'Sleep',
        description: 'Sleep tracking.',
        sortOrder: 31,
    },
    [CAPABILITIES.energyWeek]: {
        key: CAPABILITIES.energyWeek,
        kind: CapabilityKind.SCREEN,
        name: 'Week',
        description: 'Divide 168 hours — sleep, training, and food.',
        sortOrder: 32,
    },
    [CAPABILITIES.energyTraining]: {
        key: CAPABILITIES.energyTraining,
        kind: CapabilityKind.SCREEN,
        name: 'Training',
        description: 'Training sessions and load.',
        sortOrder: 33,
    },
    [CAPABILITIES.energyFood]: {
        key: CAPABILITIES.energyFood,
        kind: CapabilityKind.SCREEN,
        name: 'Food',
        description: 'Food and fuel logging.',
        sortOrder: 34,
    },
    [CAPABILITIES.soulOverview]: {
        key: CAPABILITIES.soulOverview,
        kind: CapabilityKind.SCREEN,
        name: 'Overview',
        description: 'Soul overview.',
        sortOrder: 40,
    },
    [CAPABILITIES.soulStillness]: {
        key: CAPABILITIES.soulStillness,
        kind: CapabilityKind.SCREEN,
        name: 'Stillness',
        description: 'Stillness practice and presence.',
        sortOrder: 41,
    },
    [CAPABILITIES.soulGratitude]: {
        key: CAPABILITIES.soulGratitude,
        kind: CapabilityKind.SCREEN,
        name: 'Gratitude',
        description: 'Gratitude practice.',
        sortOrder: 42,
    },
    [CAPABILITIES.soulGiving]: {
        key: CAPABILITIES.soulGiving,
        kind: CapabilityKind.SCREEN,
        name: 'Giving',
        description: 'Why the Give jar exists, where it goes, and how to choose well.',
        sortOrder: 43,
    },
    [CAPABILITIES.soulIntent]: {
        key: CAPABILITIES.soulIntent,
        kind: CapabilityKind.SCREEN,
        name: 'Intent',
        description: 'Weekly intent.',
        sortOrder: 44,
    },
    [CAPABILITIES.soulCentres]: {
        key: CAPABILITIES.soulCentres,
        kind: CapabilityKind.SCREEN,
        name: 'Centres',
        description: 'The seven centres and where energy gets stuck.',
        sortOrder: 45,
    },
    [CAPABILITIES.platformInvite]: {
        key: CAPABILITIES.platformInvite,
        kind: CapabilityKind.ACTION,
        name: 'Invite',
        description: 'Invite a partner, family, or friend to the household.',
        sortOrder: 50,
    },
};

/** Ordered list for seed / admin UIs. */
export const CAPABILITY_DEFINITIONS: readonly CapabilityDefinition[] = Object.values(
    CAPABILITY_CATALOG
).sort((left, right) => left.sortOrder - right.sortOrder);

// ====================================================================
// Plan access tree
// ====================================================================

type ProductFeatureMap = Record<CapabilityProduct, readonly CapabilityKey[]>;

/** Free + Basic-granted features on every tier. */
const BASIC_ACCESS: ProductFeatureMap = {
    [CapabilityProduct.HOME]: [
        CAPABILITIES.homeOverview,
        CAPABILITIES.homeCoach,
        CAPABILITIES.homeWhy,
    ],
    [CapabilityProduct.MONEY]: [
        CAPABILITIES.moneyOverview,
        CAPABILITIES.moneyJars,
        CAPABILITIES.moneySpending,
        CAPABILITIES.moneyFixedCosts,
    ],
    [CapabilityProduct.GROWTH]: [
        CAPABILITIES.growthOverview,
        CAPABILITIES.growthGoals,
        CAPABILITIES.growthIncome,
    ],
    [CapabilityProduct.ENERGY]: [CAPABILITIES.energyOverview, CAPABILITIES.energySleep],
    [CapabilityProduct.SOUL]: [
        CAPABILITIES.soulOverview,
        CAPABILITIES.soulStillness,
        CAPABILITIES.soulGratitude,
        CAPABILITIES.soulGiving,
        CAPABILITIES.soulIntent,
    ],
    [CapabilityProduct.PLATFORM]: [],
};

const PLUS_EXTRA: ProductFeatureMap = {
    [CapabilityProduct.HOME]: [],
    [CapabilityProduct.MONEY]: [
        CAPABILITIES.moneyDebt,
        CAPABILITIES.moneyBank,
        CAPABILITIES.moneyImport,
    ],
    [CapabilityProduct.GROWTH]: [],
    [CapabilityProduct.ENERGY]: [
        CAPABILITIES.energyWeek,
        CAPABILITIES.energyTraining,
        CAPABILITIES.energyFood,
    ],
    [CapabilityProduct.SOUL]: [],
    [CapabilityProduct.PLATFORM]: [CAPABILITIES.platformInvite],
};

const MAX_EXTRA: ProductFeatureMap = {
    [CapabilityProduct.HOME]: [],
    [CapabilityProduct.MONEY]: [],
    [CapabilityProduct.GROWTH]: [CAPABILITIES.growthNetWorth, CAPABILITIES.growthLearn],
    [CapabilityProduct.ENERGY]: [],
    [CapabilityProduct.SOUL]: [CAPABILITIES.soulCentres],
    [CapabilityProduct.PLATFORM]: [],
};

function mergeAccess(...maps: ProductFeatureMap[]): ProductFeatureMap {
    const result = {} as Record<CapabilityProduct, CapabilityKey[]>;
    for (const product of CAPABILITY_PRODUCTS) {
        const seen = new Set<CapabilityKey>();
        const keys: CapabilityKey[] = [];
        for (const map of maps) {
            for (const key of map[product]) {
                if (!seen.has(key)) {
                    seen.add(key);
                    keys.push(key);
                }
            }
        }
        result[product] = keys;
    }
    return result;
}

/**
 * Plan → product → features (full catalog grants).
 * Every registered featureKey appears on at least one plan.
 */
export const PLAN_ACCESS: Record<PlanKey, ProductFeatureMap> = {
    [PlanKey.BASIC]: BASIC_ACCESS,
    [PlanKey.PLUS]: mergeAccess(BASIC_ACCESS, PLUS_EXTRA),
    [PlanKey.MAX]: mergeAccess(BASIC_ACCESS, PLUS_EXTRA, MAX_EXTRA),
};

function flattenAccess(plan: PlanKey): CapabilityKey[] {
    return CAPABILITY_PRODUCTS.flatMap(product => [...PLAN_ACCESS[plan][product]]);
}

/** Flat grant list derived from PLAN_ACCESS — used by hasCapability / seeders. */
export const PLAN_CAPABILITY_GRANTS: Record<PlanKey, readonly CapabilityKey[]> = {
    [PlanKey.BASIC]: flattenAccess(PlanKey.BASIC),
    [PlanKey.PLUS]: flattenAccess(PlanKey.PLUS),
    [PlanKey.MAX]: flattenAccess(PlanKey.MAX),
};

// ====================================================================
// Plan limits & capabilities
// ====================================================================

const ALL_KINDS = [
    HouseholdKind.SOLO,
    HouseholdKind.PARTNERS,
    HouseholdKind.FAMILY,
    HouseholdKind.FRIENDS,
] as const;

/** Capacity ceilings per plan — Basic never uses null (unlimited). */
export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
    [PlanKey.BASIC]: {
        maxMembers: 1,
        maxGoals: 1,
        maxAssets: null,
        maxIncomeStreams: null,
        maxLearnEntries: null,
    },
    [PlanKey.PLUS]: {
        maxMembers: 5,
        maxGoals: 5,
        maxAssets: null,
        maxIncomeStreams: null,
        maxLearnEntries: null,
    },
    [PlanKey.MAX]: {
        maxMembers: null,
        maxGoals: null,
        maxAssets: null,
        maxIncomeStreams: null,
        maxLearnEntries: null,
    },
};

function buildPlanCapabilities(
    plan: PlanKey,
    householdKinds: readonly HouseholdKind[]
): PlanCapabilities {
    const limits = PLAN_LIMITS[plan];
    const capabilityKeys = [...PLAN_CAPABILITY_GRANTS[plan]];
    return {
        ...limits,
        householdKinds: [...householdKinds],
        capabilityKeys,
        canInvite: capabilityKeys.includes(CAPABILITIES.platformInvite),
    };
}

/**
 * Canonical capabilities per plan key (limits + granted keys).
 * Seed / DB catalog mirrors this; runtime checks import from here.
 */
export const PLAN_CAPABILITIES: Record<PlanKey, PlanCapabilities> = {
    [PlanKey.BASIC]: buildPlanCapabilities(PlanKey.BASIC, [HouseholdKind.SOLO]),
    [PlanKey.PLUS]: buildPlanCapabilities(PlanKey.PLUS, ALL_KINDS),
    [PlanKey.MAX]: buildPlanCapabilities(PlanKey.MAX, ALL_KINDS),
};

/** Tier order for comparisons — mirrors catalog sortOrder (BASIC=0 < PLUS < MAX). */
export const PLAN_RANK: Record<PlanKey, number> = {
    [PlanKey.BASIC]: 0,
    [PlanKey.PLUS]: 1,
    [PlanKey.MAX]: 2,
};

// ====================================================================
// Helper functions
// ====================================================================

/** Features granted on `plan` inside one product. */
export function featuresForProduct(
    plan: PlanKey,
    product: CapabilityProduct
): readonly CapabilityKey[] {
    return PLAN_ACCESS[plan][product];
}

/** Products that have at least one granted feature on this plan. */
export function productsWithGrants(plan: PlanKey): CapabilityProduct[] {
    return CAPABILITY_PRODUCTS.filter(product => PLAN_ACCESS[plan][product].length > 0);
}

/** True when `plan` grants this feature inside its product. */
export function hasProductFeature(
    plan: PlanKey,
    product: CapabilityProduct,
    featureKey: string
): boolean {
    return PLAN_ACCESS[plan][product].includes(featureKey as CapabilityKey);
}

export function capabilitiesFor(plan: PlanKey): PlanCapabilities {
    return PLAN_CAPABILITIES[plan];
}

export function grantsFor(plan: PlanKey): readonly CapabilityKey[] {
    return PLAN_CAPABILITY_GRANTS[plan];
}

export function limitsFor(plan: PlanKey): PlanLimits {
    return PLAN_LIMITS[plan];
}

/** Ceiling for a named limit key — null = unlimited. */
export function limitFor(plan: PlanKey, key: PlanLimitKey): number | null {
    return PLAN_LIMITS[plan][key];
}

/** True when occupied count is still under the plan ceiling (or unlimited). */
export function withinLimit(plan: PlanKey, key: PlanLimitKey, occupied: number): boolean {
    const max = limitFor(plan, key);
    if (max === null) return true;
    return occupied < max;
}

/** True when `plan` grants this capability key (unknown keys stay open). */
export function hasCapability(capabilityKey: string | null | undefined, plan: PlanKey): boolean {
    if (!capabilityKey) return true;
    if (!isCapabilityKey(capabilityKey)) return true;
    return grantsFor(plan).includes(capabilityKey);
}

export function isCapabilityLocked(
    capabilityKey: string | null | undefined,
    plan: PlanKey
): boolean {
    return !hasCapability(capabilityKey, plan);
}

/** Lowest plan that grants a capability — used for upgrade CTAs. */
export function minPlanForCapability(capabilityKey: string): PlanKey | null {
    if (!isCapabilityKey(capabilityKey)) return null;
    const ordered = [PlanKey.BASIC, PlanKey.PLUS, PlanKey.MAX] as const;
    for (const plan of ordered) {
        if (PLAN_CAPABILITY_GRANTS[plan].includes(capabilityKey)) return plan;
    }
    return null;
}

export function canInviteOnPlan(plan: PlanKey): boolean {
    return hasCapability(CAPABILITIES.platformInvite, plan);
}

/**
 * Whether another member seat is available.
 * `occupiedSeats` = current members + pending invites (owner counts as 1).
 */
export function canAddHouseholdMember(plan: PlanKey, occupiedSeats: number): boolean {
    const caps = capabilitiesFor(plan);
    if (!caps.canInvite) return false;
    return withinLimit(plan, 'maxMembers', occupiedSeats);
}

export function canUseHouseholdKind(plan: PlanKey, kind: HouseholdKind): boolean {
    return capabilitiesFor(plan).householdKinds.includes(kind);
}

/** True when the household already fits under the target plan's caps. */
export function householdFitsPlan(
    plan: PlanKey,
    opts: { memberCount: number; kind: HouseholdKind }
): boolean {
    const caps = capabilitiesFor(plan);
    if (!caps.householdKinds.includes(opts.kind)) return false;
    if (caps.maxMembers !== null && opts.memberCount > caps.maxMembers) return false;
    return true;
}

/** Group a plan's grants back into product → features (same shape as PLAN_ACCESS). */
export function accessTreeFor(plan: PlanKey): ProductFeatureMap {
    return PLAN_ACCESS[plan];
}

/** Which product a capability belongs to (from the key prefix). */
export function productForCapability(key: CapabilityKey): CapabilityProduct {
    return productOfCapability(key);
}

// ====================================================================
// Derived seed data
// ====================================================================

/** Flat grant list derived from PLAN_CAPABILITY_GRANTS — used by seeders. */
export const PLAN_CAPABILITY_GRANT_ROWS: readonly PlanCapabilityGrant[] = (
    Object.entries(PLAN_CAPABILITY_GRANTS) as [PlanKey, readonly CapabilityKey[]][]
).flatMap(([planKey, keys]) => keys.map(capabilityKey => ({ planKey, capabilityKey })));
