/**
 * Website Better Auth client — acquisition / recovery + marketing session.
 *
 * Same-origin `/api/auth` proxies to Nest so cookies bind to DOMAIN_WEB.
 * In staging/prod, cross-subdomain cookies share the session with the app.
 */

import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';

import { env } from '@/lib/get-env';

/** Align client poll with Nest `session.cookieCache.maxAge` (5 minutes). */
const BETTER_AUTH_SESSION_REFETCH_INTERVAL_SEC = 5 * 60;

/** Same-origin `/api/auth` proxy — do not point the browser at another portal. */
function getAuthBaseURL(): string {
    const origin =
        typeof window !== 'undefined' ? window.location.origin : env.NEXT_PUBLIC_DOMAIN_WEB;
    return origin.replace(/\/$/, '');
}

const client = createAuthClient({
    baseURL: getAuthBaseURL(),
    plugins: [organizationClient()],
    sessionOptions: {
        refetchInterval: BETTER_AUTH_SESSION_REFETCH_INTERVAL_SEC,
        refetchOnWindowFocus: true,
        refetchWhenOffline: false,
    },
});

export const signUp = client.signUp;
export const signIn = client.signIn;
export const signOut = client.signOut;
export const sendVerificationEmail = client.sendVerificationEmail;
export const requestPasswordReset = client.requestPasswordReset;
export const resetPassword = client.resetPassword;
export const useSession = client.useSession;

/** BA organization plugin — SDK still says organization; Rumtelo calls it household. */
export async function setActiveOrganization(organizationId: string) {
    await client.organization.setActive({ organizationId });
}

export async function listOrganizations() {
    return client.organization.list();
}

export type Session = {
    session: {
        activeOrganizationId?: string | null;
    };
    user: {
        id: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
};

/**
 * Active household for this session.
 * Better Auth exposes `activeOrganizationId` (SDK name).
 */
export function activeHouseholdId(
    session: { session?: { activeOrganizationId?: string | null } | null } | null | undefined
): string | null {
    if (!session) return null;
    return session.session?.activeOrganizationId ?? null;
}

/** Better Auth `user.id` — opaque AuthId. */
export function sessionUserId(
    session: { user?: { id?: string | null } | null } | null | undefined
): string | null {
    return session?.user?.id ?? null;
}
