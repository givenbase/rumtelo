/**
 * Jar Utils
 * Default jar split, capabilities map, and helper.
 */

import { JarKey } from '../enums';
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
