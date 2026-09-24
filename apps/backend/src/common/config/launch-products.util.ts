import { shouldDeferLaunchProducts } from '@rumtelo/contracts';

import { loadEnv } from '../config/env.config';

let cached: boolean | undefined;

/**
 * Production launch: Energy + Soul deferred when `NODE_ENV=production`.
 * Seed scripts: `db:seed:prod` → NODE_ENV=production; `db:seed:stag` → staging.
 */
export function isLaunchProductsDeferred(): boolean {
    if (cached !== undefined) return cached;
    const env = loadEnv();
    cached = shouldDeferLaunchProducts({ nodeEnv: env.NODE_ENV });
    return cached;
}
