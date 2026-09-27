/**
 * Remember a Practice client invite token from marketing sign-up → app redeem.
 *
 * Storage: cookie (cross-subdomain in prod) + sessionStorage fallback for localhost
 * where website and app use different ports.
 */

import { resolveCrossSubdomainCookieDomain } from './better-auth-domains';

export const PRACTICE_INVITE_COOKIE = 'rumtelo_practice_invite';
export const PRACTICE_INVITE_STORAGE_KEY = 'rumtelo.practiceInvite';
export const PRACTICE_INVITE_CHANGE_EVENT = 'rumtelo:practice-invite';

const TOKEN_RE = /^[0-9a-f-]{8,80}$/i;

export function parsePracticeInviteToken(input: unknown): string | null {
    if (typeof input !== 'string') return null;
    const token = input.trim();
    if (!TOKEN_RE.test(token)) return null;
    return token;
}

export function practiceInviteFromSearchParams(
    params: URLSearchParams | { get(name: string): string | null }
): string | null {
    return parsePracticeInviteToken(params.get('practiceInvite'));
}

export function practiceInviteQuery(token: string | null): Record<string, string> {
    if (!token) return {};
    return { practiceInvite: token };
}

export function readPracticeInviteFromDocument(): string | null {
    if (typeof window === 'undefined') return null;
    const fromStorage = parsePracticeInviteToken(
        window.sessionStorage.getItem(PRACTICE_INVITE_STORAGE_KEY)
    );
    if (fromStorage) return fromStorage;

    const match = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${PRACTICE_INVITE_COOKIE}=`));
    if (!match) return null;
    const raw = decodeURIComponent(match.slice(PRACTICE_INVITE_COOKIE.length + 1));
    return parsePracticeInviteToken(raw);
}

function notifyPracticeInviteListeners(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(PRACTICE_INVITE_CHANGE_EVENT));
}

export function subscribePracticeInvite(onStoreChange: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener('storage', onStoreChange);
    window.addEventListener(PRACTICE_INVITE_CHANGE_EVENT, onStoreChange);
    return () => {
        window.removeEventListener('storage', onStoreChange);
        window.removeEventListener(PRACTICE_INVITE_CHANGE_EVENT, onStoreChange);
    };
}

export function getPracticeInviteSnapshot(): string {
    return readPracticeInviteFromDocument() ?? '';
}

export function getPracticeInviteServerSnapshot(): string {
    return '';
}

export function writePracticeInvite(
    token: string | null,
    options?: { domainUrls?: (string | undefined)[]; maxAgeSec?: number }
): void {
    if (typeof window === 'undefined') return;

    if (!token) {
        clearPracticeInvite(options);
        return;
    }

    const value = token.trim();
    window.sessionStorage.setItem(PRACTICE_INVITE_STORAGE_KEY, value);

    const maxAge = options?.maxAgeSec ?? 60 * 60 * 24 * 14;
    const domain = resolveCrossSubdomainCookieDomain(...(options?.domainUrls ?? []));
    const parts = [
        `${PRACTICE_INVITE_COOKIE}=${encodeURIComponent(value)}`,
        'Path=/',
        `Max-Age=${maxAge}`,
        'SameSite=Lax',
    ];
    if (domain) parts.push(`Domain=${domain}`);
    if (window.location.protocol === 'https:') parts.push('Secure');
    document.cookie = parts.join('; ');
    notifyPracticeInviteListeners();
}

export function clearPracticeInvite(options?: { domainUrls?: (string | undefined)[] }): void {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(PRACTICE_INVITE_STORAGE_KEY);

    const domain = resolveCrossSubdomainCookieDomain(...(options?.domainUrls ?? []));
    const parts = [`${PRACTICE_INVITE_COOKIE}=`, 'Path=/', 'Max-Age=0', 'SameSite=Lax'];
    if (domain) parts.push(`Domain=${domain}`);
    document.cookie = parts.join('; ');
    notifyPracticeInviteListeners();
}
