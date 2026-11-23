/**
 * Jar Utils
 * Default jar split, capabilities map, display groups, and helpers.
 */

import { JarGroup, JarKey } from '../enums';
import type { JarCapabilities } from './jar.types';

/**
 * The three-pot default over all eight keys: one main pot per group, the five optional
 * pots at 0 (a household starts without them).
 *
 * @deprecated Use {@link defaultJarSplitFor} with the keys the household actually has.
 */
export const DEFAULT_JAR_SPLIT: Record<JarKey, number> = {
    [JarKey.NECESSITIES]: 55,
    [JarKey.LONG_TERM_SAVINGS]: 20,
    [JarKey.PLAY]: 25,
    [JarKey.FINANCIAL_FREEDOM]: 0,
    [JarKey.EDUCATION]: 0,
    [JarKey.GIVE]: 0,
    [JarKey.DAILY]: 0,
    [JarKey.GOALS]: 0,
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
    // DAILY and GOALS are carved out of a main pot and have no per-pot rule of their own:
    // 100 / 0 never fire. The group-level limits below are what the coach moves to.
    [JarKey.DAILY]: 100,
    [JarKey.GOALS]: 100,
};

export const SPLIT_SOFT_FLOOR: Record<JarKey, number> = {
    [JarKey.NECESSITIES]: 45,
    [JarKey.FINANCIAL_FREEDOM]: 10,
    [JarKey.LONG_TERM_SAVINGS]: 10,
    [JarKey.EDUCATION]: 0,
    [JarKey.PLAY]: 0,
    [JarKey.GIVE]: 0,
    [JarKey.DAILY]: 0,
    [JarKey.GOALS]: 0,
};

/** Group-level soft limits for the coach to move to: Basics above 60 % gets a tip. */
export const GROUP_SOFT_CEILING: Partial<Record<JarGroup, number>> = {
    [JarGroup.BASIS]: 60,
};

/** Group-level soft limits for the coach to move to: Future below 10 % gets a tip. */
export const GROUP_SOFT_FLOOR: Partial<Record<JarGroup, number>> = {
    [JarGroup.FUTURE]: 10,
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
    // Everyday spending: spendable and counted in safe-to-spend, but bills stay in NECESSITIES.
    [JarKey.DAILY]: { ...SPEND, allowsFixedCosts: false },
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
    // Named goals: same behaviour as the Future main pot it is carved out of.
    [JarKey.GOALS]: {
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
    [JarKey.DAILY]: JarGroup.BASIS,
    [JarKey.LONG_TERM_SAVINGS]: JarGroup.FUTURE,
    [JarKey.GOALS]: JarGroup.FUTURE,
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
    [JarGroup.BASIS]: [JarKey.NECESSITIES, JarKey.DAILY],
    [JarGroup.FUTURE]: [
        JarKey.LONG_TERM_SAVINGS,
        JarKey.GOALS,
        JarKey.FINANCIAL_FREEDOM,
        JarKey.EDUCATION,
    ],
    [JarGroup.FREE]: [JarKey.PLAY, JarKey.GIVE],
};

export function jarGroupFor(key: JarKey): JarGroup {
    return JAR_GROUP_BY_KEY[key];
}

/** The pot every household has in a group; optional pots are carved out of it. */
export const JAR_MAIN_KEY_BY_GROUP: Record<JarGroup, JarKey> = {
    [JarGroup.BASIS]: JarKey.NECESSITIES,
    [JarGroup.FUTURE]: JarKey.LONG_TERM_SAVINGS,
    [JarGroup.FREE]: JarKey.PLAY,
};

/** A pot a household may turn on or off inside its group (everything but the main pots). */
export type OptionalJarKey = Exclude<
    JarKey,
    JarKey.NECESSITIES | JarKey.LONG_TERM_SAVINGS | JarKey.PLAY
>;

/** The five optional pots, in group order. */
export const OPTIONAL_JAR_KEYS: readonly OptionalJarKey[] = [
    JarKey.DAILY,
    JarKey.GOALS,
    JarKey.FINANCIAL_FREEDOM,
    JarKey.EDUCATION,
    JarKey.GIVE,
];

export function isMainJarKey(key: JarKey): boolean {
    return JAR_MAIN_KEY_BY_GROUP[jarGroupFor(key)] === key;
}

/** The main pot of the group `key` sits in (the key itself when it is a main pot). */
export function mainJarKeyFor(key: JarKey): JarKey {
    return JAR_MAIN_KEY_BY_GROUP[jarGroupFor(key)];
}

/** What each group holds in total by default: Basics, Future, Free. Sums to 100. */
export const DEFAULT_GROUP_SPLIT: Record<JarGroup, number> = {
    [JarGroup.BASIS]: 55,
    [JarGroup.FUTURE]: 20,
    [JarGroup.FREE]: 25,
};

/**
 * Share an optional pot takes out of its group's main pot when it is turned on, so the
 * group total does not change. PROPOSAL: the owner still confirms these numbers.
 *
 * The server does NOT read this constant when a pot is turned on: it uses the percentage
 * of the jar template row. This constant is the seed and preview source (the seed writes it
 * onto the templates, `defaultJarSplitFor` shows it), so the two must stay in step: change
 * it here and re-seed the templates.
 */
export const OPTIONAL_JAR_SHARE: Record<OptionalJarKey, number> = {
    [JarKey.DAILY]: 20,
    [JarKey.GOALS]: 6,
    [JarKey.FINANCIAL_FREEDOM]: 5,
    [JarKey.EDUCATION]: 5,
    [JarKey.GIVE]: 5,
};

/**
 * Default split for the pots a household has: every present optional pot gets its
 * `OPTIONAL_JAR_SHARE`, every present main pot gets its group default minus the optional
 * pots present in that group. Keys not in `keys` are absent from the result. With all
 * three main pots present the total is exactly 100. Maths is in basis points (0.01 %) so
 * no float drift, like {@link sumPercentageByGroup}.
 */
export function defaultJarSplitFor(keys: readonly JarKey[]): Partial<Record<JarKey, number>> {
    const present = new Set(keys);
    const optionalBasisPoints: Record<JarGroup, number> = {
        [JarGroup.BASIS]: 0,
        [JarGroup.FUTURE]: 0,
        [JarGroup.FREE]: 0,
    };
    for (const key of OPTIONAL_JAR_KEYS) {
        if (present.has(key)) {
            optionalBasisPoints[jarGroupFor(key)] += OPTIONAL_JAR_SHARE[key] * 100;
        }
    }
    const split: Partial<Record<JarKey, number>> = {};
    for (const group of JAR_GROUP_ORDER) {
        const mainKey = JAR_MAIN_KEY_BY_GROUP[group];
        if (present.has(mainKey)) {
            split[mainKey] = (DEFAULT_GROUP_SPLIT[group] * 100 - optionalBasisPoints[group]) / 100;
        }
    }
    for (const key of OPTIONAL_JAR_KEYS) {
        if (present.has(key)) split[key] = OPTIONAL_JAR_SHARE[key];
    }
    return split;
}

/**
 * The pot a household should use for `key`: the pot itself when the household has it,
 * otherwise the main pot of its group (a preset or category that targets a pot the
 * household has not turned on).
 */
export function resolveJarKeyForHousehold(
    key: JarKey,
    presentKeys: readonly JarKey[] | ReadonlySet<JarKey>
): JarKey {
    const present = presentKeys instanceof Set ? presentKeys : new Set(presentKeys);
    return present.has(key) ? key : mainJarKeyFor(key);
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
