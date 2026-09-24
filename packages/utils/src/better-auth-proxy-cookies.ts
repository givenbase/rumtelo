/**
 * Rewrites Set-Cookie headers from the backend Better Auth API when proxied through
 * a Next.js app (`/api/auth/[...all]`).
 *
 * Development (localhost):
 * - Strip `Domain=` so the cookie binds to the app origin (not Nest).
 * - SameSite=Lax — browser talks to the same origin as the proxy.
 *
 * Production / staging (`*.rumtelo.com` from DOMAIN_WEB / DOMAIN_APP):
 * - Preserve `Domain=` from Better Auth `advanced.crossSubDomainCookies`
 *   so sessions work across website and application (galighticus pattern).
 *
 * @see https://www.better-auth.com/docs/concepts/cookies#cross-subdomain-cookies
 */

export function rewriteBetterAuthSetCookie(cookieValue: string): string {
    const parts = cookieValue.split(';').map(part => part.trim());

    if (process.env.NODE_ENV === 'development') {
        return parts.filter(part => !part.toLowerCase().startsWith('domain=')).join('; ');
    }

    return parts.join('; ');
}
