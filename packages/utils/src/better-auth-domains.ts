/**
 * Shared domain helpers for Better Auth trustedOrigins, CORS, and cross-subdomain cookies.
 * Derive trusted origins / cookie domains from configured DOMAIN_* env URLs
 * (same pattern as galighticus-platform).
 */

/** Platform hosts — never expand apex/www (would trust railway.app / vercel.app). */
const PLATFORM_ROOTS = new Set(['railway.app', 'railway.internal', 'vercel.app', 'netlify.app']);

/** e.g. `https://app.example.com` → `example.com` */
export function extractRootDomainFromUrl(url: string): string | null {
    try {
        const hostname = new URL(url).hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return null;
        }
        const parts = hostname.split('.');
        if (parts.length >= 2) {
            return parts.slice(-2).join('.');
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Shared cookie domain for production/staging subdomains — e.g. `.rumtelo.com`
 * so `rumtelo.com` / `dev.rumtelo.com` and `app.rumtelo.com` / `dev-app.rumtelo.com`
 * share the session. Values come only from DOMAIN_WEB / DOMAIN_APP (and siblings).
 */
export function resolveCrossSubdomainCookieDomain(
    ...domainUrls: (string | undefined)[]
): string | undefined {
    for (const domainUrl of domainUrls) {
        if (!domainUrl) continue;
        try {
            const root = extractRootDomainFromUrl(domainUrl);
            if (root && !PLATFORM_ROOTS.has(root)) return `.${root}`;
        } catch {
            continue;
        }
    }
    return undefined;
}

/** Exact origin (`https://app.example.com`). */
export function normalizeOrigin(url: string): string {
    return new URL(url).origin;
}

function parseOrigin(value: string): string {
    try {
        return normalizeOrigin(value);
    } catch {
        return value.replace(/\/$/, '');
    }
}

/**
 * Brand hosts always trust apex + www as well as the configured host.
 *
 * Better Auth CSRF is an exact Origin match. Cookie Domain `.rumtelo.com` does
 * not imply `https://rumtelo.com` is trusted. Fastify CORS also needs exact
 * strings (not `https://*.rumtelo.com`).
 *
 * So `https://app.rumtelo.com` also allows `https://rumtelo.com` and
 * `https://www.rumtelo.com`. Railway / Vercel public hosts are left as-is.
 */
export function brandSiblingOrigins(url: string): string[] {
    const origin = parseOrigin(url);
    let parsed: URL;
    try {
        parsed = new URL(origin);
    } catch {
        return [origin];
    }
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return [origin];
    }
    const root = extractRootDomainFromUrl(origin);
    if (!root || PLATFORM_ROOTS.has(root)) {
        return [origin];
    }
    return [...new Set([origin, `${parsed.protocol}//${root}`, `${parsed.protocol}//www.${root}`])];
}

/**
 * Build Better Auth `trustedOrigins` (and CORS allowlist) from configured app domains.
 */
export function buildBetterAuthTrustedOrigins(
    sources: (string | undefined)[],
    options?: { extraOrigins?: string | undefined }
): string[] {
    const fromEnv = sources
        .filter((origin): origin is string => Boolean(origin))
        .flatMap(origin =>
            origin
                .split(',')
                .map(value => value.trim())
                .filter(Boolean)
        )
        .flatMap(brandSiblingOrigins);

    const extra =
        options?.extraOrigins
            ?.split(',')
            .map(value => value.trim())
            .filter(Boolean)
            .flatMap(brandSiblingOrigins) ?? [];

    return [...new Set([...fromEnv, ...extra])];
}
