import {
    CAPABILITIES,
    CAPABILITY_CATALOG,
    FEATURES,
    PLAN_ACCESS,
    PLAN_CAPABILITIES,
    PLAN_CAPABILITY_GRANTS,
    PLAN_LIMITS,
    PLAN_RANK,
    PLAN_RETAIL_CENTS,
    PlanKey,
    capabilitiesFor,
    featuresForProduct,
    hasCapability,
    isCapabilityLocked,
    isCapabilityKey,
    effectiveSeatCaps,
    limitFor,
    limitsFor,
    minPlanForCapability,
    nextPlanForHigherLimit,
    productsWithGrants,
    withinLimit,
    type CapabilityKey,
    type EffectiveSeatCaps,
    type PlanLimitKey,
} from '@rumtelo/contracts';
import type { TranslateFn } from '@rumtelo/i18n';
import { formatPlanPrice } from '@rumtelo/utils';

/**
 * Plan gating — plan → product → feature (`{product}-{feature}`).
 *
 * Full catalog (26 keys). Basic: free surfaces + growth income + 1 goal (taste Growth).
 * Plus adds Learn + debt / bank / import / energy week·train·food / invite (+ more goals).
 * Max adds growth net-worth / soul-centers. Learn courses: Udemy on Plus, Masterclass on Max.
 */

export {
    CAPABILITIES,
    FEATURES,
    PLAN_ACCESS,
    PLAN_CAPABILITIES,
    PLAN_CAPABILITY_GRANTS,
    PLAN_LIMITS,
    PLAN_RANK,
    PLAN_RETAIL_CENTS,
    PlanKey,
    capabilitiesFor,
    featuresForProduct,
    hasCapability,
    isCapabilityLocked,
    effectiveSeatCaps,
    limitFor,
    limitsFor,
    minPlanForCapability,
    nextPlanForHigherLimit,
    productsWithGrants,
    withinLimit,
    type CapabilityKey,
    type EffectiveSeatCaps,
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

/**
 * Monthly retail amount of a paid plan, formatted in EUR (Stripe catalog currency, never the
 * household board currency). Reads `PLAN_RETAIL_CENTS`, so a price change is one edit there.
 * Basic has no price: returns `null`.
 */
export function planAmountLabel(plan: PlanKey, locale?: string): string | null {
    if (plan === PlanKey.BASIC) return null;
    return formatPlanPrice(PLAN_RETAIL_CENTS[plan].month, { locale });
}

/** List price shown on upgrade CTAs and plan cards: "Free" or "{amount} / month". */
export function planPriceLabel(plan: PlanKey, t?: TranslateFn): string {
    const amount = planAmountLabel(plan);
    if (amount === null) {
        return t?.('pages.settings.plan.price_free') ?? formatPlanPrice(0);
    }
    return t?.('pages.settings.plan.price_per_month', { amount }) ?? `${amount} / month`;
}

/** Fallback when household settings have not loaded yet. */
export const DEFAULT_PLAN: PlanKey = PlanKey.BASIC;

/**
 * Capabilities with a written "gain" line ("what you get"). Other capabilities fall back
 * to their catalog description.
 */
export const GAIN_CAPABILITIES: readonly CapabilityKey[] = [
    CAPABILITIES.moneyDebt,
    CAPABILITIES.growthCourse,
    CAPABILITIES.moneyImport,
    CAPABILITIES.growthLearn,
    CAPABILITIES.growthNetWorth,
];

/** What "More with Plus" lists, in order: gained on Plus, not on Basic. */
export const PLUS_GAIN_CAPABILITIES: readonly CapabilityKey[] = [
    CAPABILITIES.growthCourse,
    CAPABILITIES.moneyDebt,
    CAPABILITIES.moneyImport,
    CAPABILITIES.growthLearn,
];

/** What "More with Max" lists first, before the higher limits. */
export const MAX_GAIN_CAPABILITIES: readonly CapabilityKey[] = [CAPABILITIES.growthNetWorth];

export type LockCopy = {
    /** Catalog description (used by settings blurbs). */
    line: string;
    /** One-line outcome for the lock card; falls back to `line`. */
    gain: string;
    planName: string;
    /** "{amount} / month" or "Free". */
    price: string;
    /** Settings-style "Upgrade to {plan}" (invite / capacity prompts). */
    cta: string;
    /** Lock-card CTA "Switch to {plan}" (no trial exists, so never "Try"). */
    switchCta: string;
};

/** Localized feature name for a lock title ("Debt", "Course"). */
export function capabilityName(
    capabilityKey: string | null | undefined,
    t?: TranslateFn
): string | null {
    if (!capabilityKey || !isCapabilityKey(capabilityKey)) return null;
    return (
        t?.(`features.capabilities.${capabilityKey}.name`) ?? CAPABILITY_CATALOG[capabilityKey].name
    );
}

const DEFAULT_LOCK_LINE =
    'Everything you have already entered stays yours — you only unlock what you need.';

/**
 * Lock copy — plan name / price / CTA from `requiredPlan`; gain line per capability,
 * falling back to the CAPABILITY_CATALOG description (single source with seed metadata).
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

    const gain =
        capabilityKey && GAIN_CAPABILITIES.includes(capabilityKey as CapabilityKey)
            ? (t?.(`features.capabilities.${capabilityKey as CapabilityKey}.gain`) ?? line)
            : line;

    return {
        line,
        gain,
        planName,
        price: planPriceLabel(requiredPlan, t),
        cta: t?.('pages.shell.gates.upgrade_cta', { plan: planName }) ?? `Upgrade to ${planName}`,
        switchCta:
            t?.('pages.shell.gates.lock.switch_cta', { plan: planName }) ?? `Switch to ${planName}`,
    };
}

/** Plan seat matrix — includes purchased add-ons when `extras` is passed. */
export function memberLimitLabel(
    plan: PlanKey,
    t?: TranslateFn,
    extras?: { extraContributor?: number; extraViewer?: number }
): string {
    const caps = effectiveSeatCaps(plan, extras);
    const max = caps.maxMembers;
    const writable = caps.maxWritable;
    const viewers = caps.maxViewer;
    if (t) {
        if (max === null) return t('pages.settings.plan.members_unlimited');
        return t('pages.settings.plan.members_matrix', {
            max: String(max),
            full: String(writable ?? 0),
            viewers: String(viewers ?? 0),
        });
    }
    if (max === null) return 'Unlimited members';
    return `Up to ${max} (${writable} writable / ${viewers} viewer)`;
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
        t?.('pages.settings.plan.limit_full_members') ?? 'Writable seats',
        t?.('pages.settings.plan.unit_full_members') ?? 'writable seats',
        fromLimits.maxWritableMembers,
        toLimits.maxWritableMembers
    );
    pushLimit(
        t?.('pages.settings.plan.limit_viewer_members') ?? 'Viewer seats',
        t?.('pages.settings.plan.unit_viewer_members') ?? 'viewer seats',
        fromLimits.maxViewerMembers,
        toLimits.maxViewerMembers
    );
    pushLimit(
        t?.('pages.settings.plan.limit_goals') ?? 'Goals',
        t?.('pages.settings.plan.unit_goals') ?? 'goals',
        fromLimits.maxGoals,
        toLimits.maxGoals
    );
    pushLimit(
        t?.('pages.settings.plan.limit_bank_links') ?? 'Bank links',
        t?.('pages.settings.plan.unit_bank_links') ?? 'linked accounts',
        fromLimits.maxBankLinks,
        toLimits.maxBankLinks
    );

    return {
        from,
        to,
        direction: PLAN_RANK[to] >= PLAN_RANK[from] ? 'upgrade' : 'downgrade',
        gained,
        lost,
        limitChanges,
    };
}
