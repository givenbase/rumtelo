/**
 * Remember a household email invite id across marketing sign-up → verify → app accept.
 *
 * Storage: cookie (cross-subdomain in prod) + sessionStorage fallback for localhost
 * where website and app use different ports.
 */

import { resolveCrossSubdomainCookieDomain } from './better-auth-domains';

export const HOUSEHOLD_INVITE_COOKIE = 'rumtelo_household_invite';
export const HOUSEHOLD_INVITE_STORAGE_KEY = 'rumtelo.householdInvite';
export const HOUSEHOLD_INVITE_CHANGE_EVENT = 'rumtelo:household-invite';

const ID_RE = /^[0-9a-f-]{8,80}$/i;

export function parseHouseholdInviteId(input: unknown): string | null {
    if (typeof input !== 'string') return null;
    const id = input.trim();
    if (!ID_RE.test(id)) return null;
    return id;
}

export function householdInviteFromSearchParams(
    params: URLSearchParams | { get(name: string): string | null }
): string | null {
    return (
        parseHouseholdInviteId(params.get('householdInvite')) ??
        inviteIdFromRedirectTo(params.get('redirectTo'))
    );
}

/** `/invite/{id}` (or locale-prefixed) from a redirectTo query. */
function inviteIdFromRedirectTo(redirectTo: string | null): string | null {
    if (!redirectTo || !redirectTo.startsWith('/') || redirectTo.startsWith('//')) return null;
    const match = redirectTo.match(/\/invite\/([0-9a-f-]{8,80})(?:\/|$|\?)/i);
    return match?.[1] ? parseHouseholdInviteId(match[1]) : null;
}

export function householdInviteQuery(invitationId: string | null): Record<string, string> {
    if (!invitationId) return {};
    return { householdInvite: invitationId };
}

export function householdInvitePath(invitationId: string): string {
    return `/invite/${invitationId}`;
}

export function readHouseholdInviteFromDocument(): string | null {
    if (typeof window === 'undefined') return null;
    const fromStorage = parseHouseholdInviteId(
        window.sessionStorage.getItem(HOUSEHOLD_INVITE_STORAGE_KEY)
    );
    if (fromStorage) return fromStorage;

    const match = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${HOUSEHOLD_INVITE_COOKIE}=`));
    if (!match) return null;
    const raw = decodeURIComponent(match.slice(HOUSEHOLD_INVITE_COOKIE.length + 1));
    return parseHouseholdInviteId(raw);
}

function notifyHouseholdInviteListeners(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(HOUSEHOLD_INVITE_CHANGE_EVENT));
}

export function subscribeHouseholdInvite(onStoreChange: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener('storage', onStoreChange);
    window.addEventListener(HOUSEHOLD_INVITE_CHANGE_EVENT, onStoreChange);
    return () => {
        window.removeEventListener('storage', onStoreChange);
        window.removeEventListener(HOUSEHOLD_INVITE_CHANGE_EVENT, onStoreChange);
    };
}

export function getHouseholdInviteSnapshot(): string {
    return readHouseholdInviteFromDocument() ?? '';
}

export function getHouseholdInviteServerSnapshot(): string {
    return '';
}

export function writeHouseholdInvite(
    invitationId: string | null,
    options?: { domainUrls?: (string | undefined)[]; maxAgeSec?: number }
): void {
    if (typeof window === 'undefined') return;

    if (!invitationId) {
        clearHouseholdInvite(options);
        return;
    }

    const value = invitationId.trim();
    window.sessionStorage.setItem(HOUSEHOLD_INVITE_STORAGE_KEY, value);

    const maxAge = options?.maxAgeSec ?? 60 * 60 * 24 * 14;
    const domain = resolveCrossSubdomainCookieDomain(...(options?.domainUrls ?? []));
    const parts = [
        `${HOUSEHOLD_INVITE_COOKIE}=${encodeURIComponent(value)}`,
        'Path=/',
        `Max-Age=${maxAge}`,
        'SameSite=Lax',
    ];
    if (domain) parts.push(`Domain=${domain}`);
    if (window.location.protocol === 'https:') parts.push('Secure');
    document.cookie = parts.join('; ');
    notifyHouseholdInviteListeners();
}

export function clearHouseholdInvite(options?: { domainUrls?: (string | undefined)[] }): void {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(HOUSEHOLD_INVITE_STORAGE_KEY);

    const domain = resolveCrossSubdomainCookieDomain(...(options?.domainUrls ?? []));
    const parts = [`${HOUSEHOLD_INVITE_COOKIE}=`, 'Path=/', 'Max-Age=0', 'SameSite=Lax'];
    if (domain) parts.push(`Domain=${domain}`);
    document.cookie = parts.join('; ');
    notifyHouseholdInviteListeners();
}
