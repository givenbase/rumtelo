/**
 * Jar Utils
 * Default jar split, capabilities map, display groups, and helpers.
 */

import { JarGroup, JarKey } from '../enums';
import type { JarCapabilities } from './jar.types';

/** T. Harv Eker's canonical split — the onboarding default, fully user-overridable. */
export const DEFAULT_JAR_SPLIT: Record<JarKey, number> = {
    [JarKey.NECESSITIES]: 55,
    [JarKey.FINANCIAL_FREEDOM]: 10,
    [JarKey.LONG_TERM_SAVINGS]: 10,
    [JarKey.EDUCATION]: 10,
    [JarKey.PLAY]: 10,
    [JarKey.GIVE]: 5,
};

/**
 * Soft ceilings — going above these triggers a coach tip (defaults are the floor for FF/LTS).
 * Shared by the in-app split coach and the server money coach so both speak at the same %.
 */
export const SPLIT_SOFT_CEILING: Record<JarKey, number> = {
    [JarKey.NECESSITIES]: 60,
    [JarKey.FINANCIAL_FREEDOM]: 100,
    [JarKey.LONG_TERM_SAVINGS]: 100,
    [JarKey.EDUCATION]: 12,
    [JarKey.PLAY]: 10,
    [JarKey.GIVE]: 5,
};

export const SPLIT_SOFT_FLOOR: Record<JarKey, number> = {
    [JarKey.NECESSITIES]: 45,
    [JarKey.FINANCIAL_FREEDOM]: 10,
    [JarKey.LONG_TERM_SAVINGS]: 10,
    [JarKey.EDUCATION]: 0,
    [JarKey.PLAY]: 0,
    [JarKey.GIVE]: 0,
};

const SPEND: JarCapabilities = {
    canSpend: true,
    canSave: false,
    canInvest: false,
    countsTowardSafeToSpend: true,
    allowsFixedCosts: true,
};

/** Canonical capabilities per jar key — runtime checks import from here. */
export const JAR_CAPABILITIES: Record<JarKey, JarCapabilities> = {
    [JarKey.NECESSITIES]: { ...SPEND },
    [JarKey.PLAY]: { ...SPEND },
    [JarKey.GIVE]: { ...SPEND },
    [JarKey.EDUCATION]: {
        canSpend: true,
        canSave: true,
        canInvest: false,
        countsTowardSafeToSpend: true,
        allowsFixedCosts: true,
    },
    [JarKey.LONG_TERM_SAVINGS]: {
        canSpend: true,
        canSave: true,
        canInvest: false,
        countsTowardSafeToSpend: false,
        allowsFixedCosts: false,
    },
    [JarKey.FINANCIAL_FREEDOM]: {
        canSpend: false,
        canSave: false,
        canInvest: true,
        countsTowardSafeToSpend: false,
        allowsFixedCosts: false,
    },
};

export function jarCapabilitiesFor(key: JarKey): JarCapabilities {
    return JAR_CAPABILITIES[key];
}

/** Which display group each jar sits in — a pure mapping, never stored. */
export const JAR_GROUP_BY_KEY: Record<JarKey, JarGroup> = {
    [JarKey.NECESSITIES]: JarGroup.BASIS,
    [JarKey.LONG_TERM_SAVINGS]: JarGroup.FUTURE,
    [JarKey.FINANCIAL_FREEDOM]: JarGroup.FUTURE,
    [JarKey.EDUCATION]: JarGroup.FUTURE,
    [JarKey.PLAY]: JarGroup.FREE,
    [JarKey.GIVE]: JarGroup.FREE,
};

/** Groups in the order they are shown: must-pay first, then build, then choose. */
export const JAR_GROUP_ORDER: readonly JarGroup[] = [
    JarGroup.BASIS,
    JarGroup.FUTURE,
    JarGroup.FREE,
];

/** Pots in the order they are shown inside their group. */
export const JAR_ORDER_IN_GROUP: Record<JarGroup, readonly JarKey[]> = {
    [JarGroup.BASIS]: [JarKey.NECESSITIES],
    [JarGroup.FUTURE]: [JarKey.LONG_TERM_SAVINGS, JarKey.FINANCIAL_FREEDOM, JarKey.EDUCATION],
    [JarGroup.FREE]: [JarKey.PLAY, JarKey.GIVE],
};

export function jarGroupFor(key: JarKey): JarGroup {
    return JAR_GROUP_BY_KEY[key];
}

/**
 * Total share per group. Each percentage is rounded to basis points (0.01 %) before
 * adding, so the totals carry no float drift and agree with the 10 000 bp check the
 * split is validated against. Every group is present, 0 when it has no jars.
 */
export function sumPercentageByGroup(
    shares: readonly { key: JarKey; percentage: number }[]
): Record<JarGroup, number> {
    const basisPoints: Record<JarGroup, number> = {
        [JarGroup.BASIS]: 0,
        [JarGroup.FUTURE]: 0,
        [JarGroup.FREE]: 0,
    };
    for (const share of shares) {
        basisPoints[jarGroupFor(share.key)] += Math.round(share.percentage * 100);
    }
    return {
        [JarGroup.BASIS]: basisPoints[JarGroup.BASIS] / 100,
        [JarGroup.FUTURE]: basisPoints[JarGroup.FUTURE] / 100,
        [JarGroup.FREE]: basisPoints[JarGroup.FREE] / 100,
    };
}
