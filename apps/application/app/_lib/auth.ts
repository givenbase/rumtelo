/**
 * Application auth helpers — product sign-in + session only.
 * Sign-up / verify / forgot-password live on DOMAIN_WEB.
 *
 * Session identity is Better Auth `user.id` (`useAuth().userId`) — needed for
 * login / membership. Application person data uses Rumtelo `accountId`
 * (`auth.account`); profile DTOs map Account → User when both are needed.
 * Product row ids (`jar.id`, …) are separate Rumtelo uuids (`Id`).
 */

import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';

import { env } from '@/app/_utils/get-env';

/** Align client poll with Nest `session.cookieCache.maxAge` (5 minutes). */
const BETTER_AUTH_SESSION_REFETCH_INTERVAL_SEC = 5 * 60;

const client = createAuthClient({
    baseURL: env.NEXT_PUBLIC_DOMAIN_APP,
    plugins: [organizationClient()],
    sessionOptions: {
        refetchInterval: BETTER_AUTH_SESSION_REFETCH_INTERVAL_SEC,
        refetchOnWindowFocus: true,
        refetchWhenOffline: false,
    },
});

export const signIn = client.signIn;
export const signOut = client.signOut;
export const useSession = client.useSession;
export const sendVerificationEmail = client.sendVerificationEmail;

export async function updateUser(data: { name?: string; image?: string | null }) {
    return client.updateUser(data);
}

export async function changePassword(data: {
    currentPassword: string;
    newPassword: string;
    revokeOtherSessions?: boolean;
}) {
    return client.changePassword(data);
}

/** BA organization plugin — SDK still says organization; Rumtelo calls it household. */
export async function setActiveOrganization(organizationId: string) {
    await client.organization.setActive({ organizationId });
}

export async function listOrganizations() {
    return client.organization.list();
}

export async function updateOrganization(organizationId: string, data: { name?: string }) {
    await client.organization.update({ organizationId, data });
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

type SessionInput =
    | {
          session?: { activeOrganizationId?: string | null } | null;
          user?: {
              id?: string | null;
              name?: string | null;
              email?: string | null;
              image?: string | null;
          } | null;
      }
    | null
    | undefined;

/**
 * Active household for this session.
 * Better Auth exposes `activeOrganizationId` (SDK name); DB column is
 * `active_household_id`. Value is an opaque AuthId string.
 */
export function activeHouseholdId(session: SessionInput): string | null {
    if (!session) return null;
    return session.session?.activeOrganizationId ?? null;
}

/** Better Auth `user.id` — opaque AuthId, not Rumtelo uuid. */
export function sessionUserId(session: SessionInput): string | null {
    return session?.user?.id ?? null;
}

export function webOrigin(): string {
    return env.NEXT_PUBLIC_DOMAIN_WEB.replace(/\/$/, '');
}

export function webSignUpUrl(): string {
    return `${webOrigin()}/sign-up`;
}

export function webVerifyUrl(email?: string): string {
    const url = new URL('/verify', `${webOrigin()}/`);
    if (email) url.searchParams.set('email', email);
    return url.toString();
}

export function webForgotPasswordUrl(): string {
    return `${webOrigin()}/forgot-password`;
}
