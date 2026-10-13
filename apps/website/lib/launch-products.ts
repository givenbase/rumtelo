/**
 * Launch product surface for the website. Same catalog rule as the app
 * (`apps/application/app/_lib/launch-products.ts`), but the site always evaluates it as
 * production — marketing only sells what is live (Money + Growth today), even on localhost.
 * Set `NEXT_PUBLIC_SHOW_UPCOMING_PRODUCTS=true` to preview Energy + Soul copy.
 */
import { isProductEnabledAtLaunch, shouldDeferLaunchProducts } from '@rumtelo/contracts';

import { env } from './get-env';
import { PORTALS, type Portal } from './landing-content';

export type LaunchOpts = { nodeEnv?: string | null };

export function launchEnvOpts(): LaunchOpts {
    return {
        nodeEnv: env.NEXT_PUBLIC_SHOW_UPCOMING_PRODUCTS === 'true' ? 'development' : 'production',
    };
}

/** True when Energy/Soul are held back — copy switches to its `*_core` variants. */
export function isLaunchProductsDeferred(opts: LaunchOpts = launchEnvOpts()): boolean {
    return shouldDeferLaunchProducts(opts);
}

export function isProductLive(product: string, opts: LaunchOpts = launchEnvOpts()): boolean {
    return isProductEnabledAtLaunch(product, opts);
}

/** Portals a visitor can use today, in landing order. */
export const LIVE_PORTALS: Portal[] = PORTALS.filter(portal => isProductLive(portal.key));
