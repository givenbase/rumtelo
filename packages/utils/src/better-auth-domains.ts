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

/** `app.example.com` ↔ `www.app.example.com` (one `www.` label). */
function wwwTwinHostnames(hostname: string): string[] {
    if (hostname.startsWith('www.')) {
        return [hostname, hostname.slice('www.'.length)];
    }
    return [hostname, `www.${hostname}`];
}

/**
 * Expand one configured DOMAIN_* URL into CSRF/CORS origins.
 *
 * Better Auth and Fastify CORS match Origin exactly. Cookie Domain
 * `.example.com` is not an allowlist.
 *
 * From any brand host we trust: that host, its `www.` twin, apex, and
 * `www.` + apex. We do not invent other subdomains (`app`, `dev-app`, …) —
 * those come from other DOMAIN_* values. Platform hosts stay as-is.
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

    const hosts = new Set([...wwwTwinHostnames(parsed.hostname), ...wwwTwinHostnames(root)]);
    return [...hosts].map(host => `${parsed.protocol}//${host}`);
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
