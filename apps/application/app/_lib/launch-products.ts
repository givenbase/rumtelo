/**
 * Launch product surface for the app (Money + Growth when NODE_ENV=production).
 * Mirrors backend seed / capability deferral.
 */
import {
    isCapabilityDeferredAtLaunch,
    isProductEnabledAtLaunch,
    shouldDeferLaunchProducts,
    type CapabilityKey,
} from '@rumtelo/contracts';

function launchEnvOpts() {
    return { nodeEnv: process.env.NODE_ENV };
}

/** True when Energy/Soul should be hidden and ungranted. */
export function isLaunchProductsDeferred(): boolean {
    return shouldDeferLaunchProducts(launchEnvOpts());
}

/** Nav / settings / home — product key or chrome (`home` / `platform` / `data`). */
export function isProductEnabled(product: string): boolean {
    return isProductEnabledAtLaunch(product, launchEnvOpts());
}

/** Capability gate — deferred products fail even if the plan would grant them. */
export function isCapabilityEnabledAtLaunch(capabilityKey: string | null | undefined): boolean {
    if (!capabilityKey) return true;
    if (!isLaunchProductsDeferred()) return true;
    return !isCapabilityDeferredAtLaunch(capabilityKey as CapabilityKey);
}
