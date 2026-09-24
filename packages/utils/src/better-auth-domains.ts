/**
 * Shared domain helpers for Better Auth trustedOrigins, CORS, and cross-subdomain cookies.
 * Derive trusted origins / cookie domains from configured DOMAIN_* env URLs
 * (same pattern as galighticus-platform).
 */

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
            if (root) return `.${root}`;
        } catch {
            continue;
        }
    }
    return undefined;
}

/** Exact origin (`https://app.example.com`) — Better Auth does not support `*.domain` wildcards. */
export function normalizeOrigin(url: string): string {
    return new URL(url).origin;
}

/**
 * Build Better Auth `trustedOrigins` from configured app domains.
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
        .map(value => {
            try {
                return normalizeOrigin(value);
            } catch {
                return value.replace(/\/$/, '');
            }
        });

    const extra =
        options?.extraOrigins
            ?.split(',')
            .map(value => value.trim())
            .filter(Boolean)
            .map(value => {
                try {
                    return normalizeOrigin(value);
                } catch {
                    return value.replace(/\/$/, '');
                }
            }) ?? [];

    return [...new Set([...fromEnv, ...extra])];
}
