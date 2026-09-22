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
import type { TranslateFn } from '@rumtelo/i18n';
import { formatPlanPrice, toMinorUnits } from '@rumtelo/utils';

/**
 * Plan gating — plan → product → feature (`{product}-{feature}`).
 *
 * Full catalog (26 keys). Basic grants free surfaces + growth goals/income/learn (capped goals).
 * Plus adds debt / bank / import / energy week·train·food / invite.
 * Max adds growth net-worth / soul-centres. Learn courses switch from Udemy to Masterclass.
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

export type PlanSlug = 'basic' | 'plus' | 'max';

/** Human-readable plan labels (English fallbacks when no translator). */
export const PLAN_LABELS: Record<PlanKey, string> = {
    [PlanKey.BASIC]: 'Basic',
    [PlanKey.PLUS]: 'Plus',
    [PlanKey.MAX]: 'Max',
};

export function planSlug(key: PlanKey): PlanSlug {
    if (key === PlanKey.BASIC) return 'basic';
    if (key === PlanKey.PLUS) return 'plus';
    return 'max';
}

/** Localized plan name — `pages.landing.plans.{basic|plus|max}.name`. */
export function planLabel(key: PlanKey, t?: TranslateFn): string {
    return t?.(`pages.landing.plans.${planSlug(key)}.name`) ?? PLAN_LABELS[key];
}

/** List price shown on upgrade CTAs — Stripe catalog currency (EUR), not board money. */
export function planPriceLabel(plan: PlanKey, t?: TranslateFn): string {
    if (plan === PlanKey.BASIC) {
        return t?.('pages.settings.plan.price_free') ?? formatPlanPrice(0);
    }
    const cents = plan === PlanKey.PLUS ? toMinorUnits(9) : toMinorUnits(19);
    const amount = formatPlanPrice(cents);
    return t?.('pages.settings.plan.price_per_month', { amount }) ?? `${amount} / month`;
}

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
    requiredPlan: PlanKey = PlanKey.PLUS,
    t?: TranslateFn
): LockCopy {
    const planName = planLabel(requiredPlan, t);
    const line =
        capabilityKey && isCapabilityKey(capabilityKey)
            ? (t?.(`features.capabilities.${capabilityKey}.description`) ??
              CAPABILITY_CATALOG[capabilityKey].description)
            : (t?.('pages.shell.gates.locked_body') ?? DEFAULT_LOCK_LINE);

    return {
        line,
        planName,
        price: planPriceLabel(requiredPlan, t),
        cta: t?.('pages.shell.gates.upgrade_cta', { plan: planName }) ?? `Upgrade to ${planName}`,
    };
}

export function memberLimitLabel(plan: PlanKey, t?: TranslateFn): string {
    const max = capabilitiesFor(plan).maxMembers;
    if (t) {
        if (max === null) return t('pages.settings.plan.members_unlimited');
        if (max === 1) return t('pages.settings.plan.members_solo');
        return t('pages.settings.plan.members_up_to', { max: String(max) });
    }
    if (max === null) return 'Unlimited members';
    if (max === 1) return '1 member (solo)';
    return `Up to ${max} members`;
}

function formatCeiling(value: number | null, unit: string, t?: TranslateFn): string {
    if (value === null) {
        return t?.('pages.settings.plan.ceiling_unlimited', { unit }) ?? `Unlimited ${unit}`;
    }
    if (value === 1) {
        const singular = unit.replace(/s$/, '');
        return t?.('pages.settings.plan.ceiling_one', { unit: singular }) ?? `1 ${singular}`;
    }
    return (
        t?.('pages.settings.plan.ceiling_n', { count: String(value), unit }) ?? `${value} ${unit}`
    );
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

function capItem(key: CapabilityKey, t?: TranslateFn): PlanChangeItem {
    const def = CAPABILITY_CATALOG[key];
    const nameKey = `features.capabilities.${key}.name` as const;
    const descKey = `features.capabilities.${key}.description` as const;
    return {
        key,
        name: t?.(nameKey) ?? def.name,
        description: t?.(descKey) ?? def.description,
    };
}

/**
 * What changes when moving `from` → `to` (capabilities + ceilings).
 * Used by the plan switch confirmation dialog.
 */
export function diffPlans(from: PlanKey, to: PlanKey, t?: TranslateFn): PlanChangeDiff {
    const fromGrants = new Set(PLAN_CAPABILITY_GRANTS[from]);
    const toGrants = new Set(PLAN_CAPABILITY_GRANTS[to]);

    const gained = PLAN_CAPABILITY_GRANTS[to]
        .filter(key => !fromGrants.has(key))
        .map(key => capItem(key, t))
        .sort((left, right) => left.name.localeCompare(right.name));

    const lost = PLAN_CAPABILITY_GRANTS[from]
        .filter(key => !toGrants.has(key))
        .map(key => capItem(key, t))
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
            from: formatCeiling(before, unit, t),
            to: formatCeiling(after, unit, t),
            expanded: rank(after) > rank(before),
        });
    };

    pushLimit(
        t?.('pages.settings.plan.limit_members') ?? 'Members',
        t?.('pages.settings.plan.unit_members') ?? 'members',
        fromLimits.maxMembers,
        toLimits.maxMembers
    );
    pushLimit(
        t?.('pages.settings.plan.limit_goals') ?? 'Goals',
        t?.('pages.settings.plan.unit_goals') ?? 'goals',
        fromLimits.maxGoals,
        toLimits.maxGoals
    );

    const fromKinds = new Set(capabilitiesFor(from).householdKinds);
    const toKinds = new Set(capabilitiesFor(to).householdKinds);
    const kindNotes: string[] = [];
    if (fromKinds.size !== toKinds.size || [...fromKinds].some(k => !toKinds.has(k))) {
        if (to === PlanKey.BASIC) {
            kindNotes.push(
                t?.('pages.settings.plan.kind_note_basic') ??
                    'Household type limited to Solo — partners / family / friends need Plus or Max.'
            );
        } else if (from === PlanKey.BASIC) {
            kindNotes.push(
                t?.('pages.settings.plan.kind_note_unlocked') ??
                    'Any household type unlocked (solo, partners, family, friends).'
            );
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
