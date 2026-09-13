import {
    CAPABILITIES,
    CAPABILITY_CATALOG,
    FEATURES,
    PLAN_ACCESS,
    PLAN_CAPABILITIES,
    PLAN_CAPABILITY_GRANTS,
    PLAN_LIMITS,
    PLAN_RANK,
    PlanKey,
    capabilitiesFor,
    featuresForProduct,
    hasCapability,
    isCapabilityLocked,
    isCapabilityKey,
    limitFor,
    limitsFor,
    minPlanForCapability,
    productsWithGrants,
    withinLimit,
    type CapabilityKey,
    type PlanLimitKey,
} from '@rumtelo/contracts';
import { formatPlanPrice, toMinorUnits } from '@rumtelo/utils';

/**
 * Plan gating — plan → product → feature (`{product}-{feature}`).
 *
 * Full catalog (26 keys). Basic grants free surfaces + growth goals/income (capped goals).
 * Plus adds debt / bank / import / energy week·train·food / invite.
 * Max adds growth net-worth·learn / soul-centres.
 */

export {
    CAPABILITIES,
    FEATURES,
    PLAN_ACCESS,
    PLAN_CAPABILITIES,
    PLAN_CAPABILITY_GRANTS,
    PLAN_LIMITS,
    PLAN_RANK,
    PlanKey,
    capabilitiesFor,
    featuresForProduct,
    hasCapability,
    isCapabilityLocked,
    limitFor,
    limitsFor,
    minPlanForCapability,
    productsWithGrants,
    withinLimit,
    type CapabilityKey,
    type PlanLimitKey,
};

/** Human-readable plan labels (product names). */
export const PLAN_LABELS: Record<PlanKey, string> = {
    [PlanKey.BASIC]: 'Basic',
    [PlanKey.PLUS]: 'Plus',
    [PlanKey.MAX]: 'Max',
};

/** List price shown on upgrade CTAs — Stripe catalog currency (EUR), not board money. */
export const PLAN_PRICE: Record<PlanKey, string> = {
    [PlanKey.BASIC]: formatPlanPrice(0),
    [PlanKey.PLUS]: `${formatPlanPrice(toMinorUnits(9))} / month`,
    [PlanKey.MAX]: `${formatPlanPrice(toMinorUnits(19))} / month`,
};

/** Fallback when household settings have not loaded yet. */
export const DEFAULT_PLAN: PlanKey = PlanKey.BASIC;

export type LockCopy = {
    line: string;
    planName: string;
    price: string;
    cta: string;
};

const DEFAULT_LOCK_LINE =
    'Everything you have already entered stays yours — you only unlock what you need.';

/**
 * Upgrade wall copy — plan name / price / CTA from `requiredPlan`;
 * body line from CAPABILITY_CATALOG (single source with seed metadata).
 */
export function lockCopyFor(
    capabilityKey: string | null | undefined,
    requiredPlan: PlanKey = PlanKey.PLUS
): LockCopy {
    const planName = PLAN_LABELS[requiredPlan];
    const line =
        capabilityKey && isCapabilityKey(capabilityKey)
            ? CAPABILITY_CATALOG[capabilityKey].description
            : DEFAULT_LOCK_LINE;

    return {
        line,
        planName,
        price: PLAN_PRICE[requiredPlan],
        cta: `Upgrade to ${planName}`,
    };
}

export function memberLimitLabel(plan: PlanKey): string {
    const max = capabilitiesFor(plan).maxMembers;
    if (max === null) return 'Unlimited members';
    if (max === 1) return '1 member (solo)';
    return `Up to ${max} members`;
}

function formatCeiling(value: number | null, unit: string): string {
    if (value === null) return `Unlimited ${unit}`;
    if (value === 1) return `1 ${unit.replace(/s$/, '')}`;
    return `${value} ${unit}`;
}

export type PlanChangeItem = {
    key: string;
    name: string;
    description: string;
};

export type PlanLimitChange = {
    label: string;
    from: string;
    to: string;
    /** True when the destination ceiling is higher / more open. */
    expanded: boolean;
};

export type PlanChangeDiff = {
    from: PlanKey;
    to: PlanKey;
    direction: 'upgrade' | 'downgrade';
    /** Features unlocked on the destination plan. */
    gained: PlanChangeItem[];
    /** Features no longer granted — data kept, access disabled until upgrade. */
    lost: PlanChangeItem[];
    limitChanges: PlanLimitChange[];
    /** Household-kind eligibility notes. */
    kindNotes: string[];
};

function capItem(key: CapabilityKey): PlanChangeItem {
    const def = CAPABILITY_CATALOG[key];
    return { key, name: def.name, description: def.description };
}

/**
 * What changes when moving `from` → `to` (capabilities + ceilings).
 * Used by the plan switch confirmation dialog.
 */
export function diffPlans(from: PlanKey, to: PlanKey): PlanChangeDiff {
    const fromGrants = new Set(PLAN_CAPABILITY_GRANTS[from]);
    const toGrants = new Set(PLAN_CAPABILITY_GRANTS[to]);

    const gained = PLAN_CAPABILITY_GRANTS[to]
        .filter(key => !fromGrants.has(key))
        .map(capItem)
        .sort((left, right) => left.name.localeCompare(right.name));

    const lost = PLAN_CAPABILITY_GRANTS[from]
        .filter(key => !toGrants.has(key))
        .map(capItem)
        .sort((left, right) => left.name.localeCompare(right.name));

    const fromLimits = PLAN_LIMITS[from];
    const toLimits = PLAN_LIMITS[to];
    const limitChanges: PlanLimitChange[] = [];

    const pushLimit = (
        label: string,
        unit: string,
        before: number | null,
        after: number | null
    ) => {
        if (before === after) return;
        const rank = (value: number | null) => (value === null ? Number.POSITIVE_INFINITY : value);
        limitChanges.push({
            label,
            from: formatCeiling(before, unit),
            to: formatCeiling(after, unit),
            expanded: rank(after) > rank(before),
        });
    };

    pushLimit('Members', 'members', fromLimits.maxMembers, toLimits.maxMembers);
    pushLimit('Goals', 'goals', fromLimits.maxGoals, toLimits.maxGoals);

    const fromKinds = new Set(capabilitiesFor(from).householdKinds);
    const toKinds = new Set(capabilitiesFor(to).householdKinds);
    const kindNotes: string[] = [];
    if (fromKinds.size !== toKinds.size || [...fromKinds].some(k => !toKinds.has(k))) {
        if (to === PlanKey.BASIC) {
            kindNotes.push(
                'Household type limited to Solo — partners / family / friends need Plus or Max.'
            );
        } else if (from === PlanKey.BASIC) {
            kindNotes.push('Any household type unlocked (solo, partners, family, friends).');
        }
    }

    return {
        from,
        to,
        direction: PLAN_RANK[to] >= PLAN_RANK[from] ? 'upgrade' : 'downgrade',
        gained,
        lost,
        limitChanges,
        kindNotes,
    };
}
