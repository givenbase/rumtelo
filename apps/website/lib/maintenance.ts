/**
 * Marketing-site maintenance helpers.
 * Registration is hidden when the flag is on; sign-in stays available
 * (app enforces `@rumtelo.com` after login).
 */
import { env } from '@/lib/get-env';

export function isMaintenanceFlagEnabled(): boolean {
    return env.NEXT_PUBLIC_MAINTENANCE === 'true';
}

/** Public registration / Create account CTAs. */
export function isRegistrationOpen(): boolean {
    return !isMaintenanceFlagEnabled();
}
