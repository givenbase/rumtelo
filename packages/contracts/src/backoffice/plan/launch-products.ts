/**
 * Launch surface — which product portals ship in production vs staging.
 *
 * Production launch: Money + Growth (plus Home / Platform).
 * Energy + Soul stay in the catalog and staging/dev for QA, but are deferred
 * in production until ready.
 *
 * Runtime still uses PLAN_ACCESS for plan gating; this layer is an env-scoped
 * soft-disable on top (nav, seed isActive/grants, capability checks).
 */
import { CapabilityProduct, productOfCapability, type CapabilityKey } from './capabilities';

/** Portals held back from production until a later release. */
export const LAUNCH_DEFERRED_PRODUCTS = [CapabilityProduct.ENERGY, CapabilityProduct.SOUL] as const;

export type LaunchDeferredProduct = (typeof LAUNCH_DEFERRED_PRODUCTS)[number];

const DEFERRED_SET: ReadonlySet<string> = new Set(LAUNCH_DEFERRED_PRODUCTS);

export function isLaunchDeferredProduct(product: string): boolean {
    return DEFERRED_SET.has(product);
}

export function isCapabilityDeferredAtLaunch(key: CapabilityKey): boolean {
    return isLaunchDeferredProduct(productOfCapability(key));
}

/**
 * Whether Energy/Soul (and their capabilities) should be inactive.
 *
 * Prefer explicit `appEnv` (deployed staging keeps `NODE_ENV=production`).
 * When unset, `nodeEnv === 'production'` restricts — matches `db:seed:prod`
 * vs `db:seed:stag` (`NODE_ENV=staging`).
 */
export function shouldDeferLaunchProducts(opts: {
    appEnv?: string | null;
    nodeEnv?: string | null;
}): boolean {
    const appEnv = opts.appEnv?.trim().toLowerCase();
    if (appEnv === 'production') return true;
    if (appEnv === 'staging' || appEnv === 'development' || appEnv === 'test') {
        return false;
    }
    const nodeEnv = opts.nodeEnv?.trim().toLowerCase() ?? 'development';
    return nodeEnv === 'production';
}

/**
 * Nav / settings / home widgets — home, platform, and data chrome stay on.
 * Deferred products are off only when {@link shouldDeferLaunchProducts}.
 */
export function isProductEnabledAtLaunch(
    product: string,
    opts: { appEnv?: string | null; nodeEnv?: string | null }
): boolean {
    if (!shouldDeferLaunchProducts(opts)) return true;
    if (
        product === CapabilityProduct.HOME ||
        product === CapabilityProduct.PLATFORM ||
        product === 'data'
    ) {
        return true;
    }
    return !isLaunchDeferredProduct(product);
}

/** Drop deferred capability keys from a grant list (seed / UI). */
export function filterLaunchCapabilityKeys(
    keys: readonly CapabilityKey[],
    defer: boolean
): CapabilityKey[] {
    if (!defer) return [...keys];
    return keys.filter(key => !isCapabilityDeferredAtLaunch(key));
}
