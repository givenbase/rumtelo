/**
 * Application maintenance gate.
 *
 * - `NEXT_PUBLIC_MAINTENANCE=true` → scheduled lock (staff `@rumtelo.com` may enter)
 * - API `/health/ready` failing → auto lock (everyone waits until the API is back)
 */
import { isRumteloStaffEmail } from '@rumtelo/contracts/platform';

import { BACKEND_RPC_PROXY_PATH } from '@/app/_utils/backend-paths';
import { env } from '@/app/_utils/get-env';
import { PREVIEW_MODE } from '@/app/_lib/preview';

/** Explicit env switch (scheduled maintenance / soft launch). */
export function isMaintenanceFlagEnabled(): boolean {
    if (PREVIEW_MODE) return false;
    return env.NEXT_PUBLIC_MAINTENANCE === 'true';
}

export { isRumteloStaffEmail };

/**
 * Probe Nest readiness through the same-origin proxy.
 * Returns false on network errors, timeouts, or non-OK responses.
 *
 * Local `next dev` ignores a down API unless scheduled maintenance is on,
 * so frontend work is not blocked when Nest is stopped.
 */
export async function probeApiReady(timeoutMs = 5000): Promise<boolean> {
    const flagOn = isMaintenanceFlagEnabled();
    try {
        const response = await fetch(`${BACKEND_RPC_PROXY_PATH}/health/ready`, {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(timeoutMs),
        });
        if (response.ok) return true;
    } catch {
        /* treat as down */
    }
    if (process.env.NODE_ENV === 'development' && !flagOn) return true;
    return false;
}

/** True when the product surface should show the maintenance screen. */
export function isMaintenanceSurfaceActive(opts: { flagOn: boolean; apiReady: boolean }): boolean {
    return opts.flagOn || !opts.apiReady;
}

/**
 * Staff may bypass scheduled maintenance only while the API is healthy.
 * A dead API never bypasses — the app cannot function.
 */
export function canBypassMaintenance(
    email: string | null | undefined,
    opts: { flagOn: boolean; apiReady: boolean }
): boolean {
    if (!opts.apiReady) return false;
    if (!opts.flagOn) return true;
    return isRumteloStaffEmail(email);
}
