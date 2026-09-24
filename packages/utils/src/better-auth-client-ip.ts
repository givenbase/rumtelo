/**
 * Resolve the browser client IP from proxy headers for Better Auth rate limits.
 *
 * Railway controls `X-Forwarded-For` at the edge (leftmost = client). Better Auth
 * only trusts a *single-value* header unless `trustedProxies` is set, so the Next
 * → Nest auth proxy must collapse the chain to one address.
 *
 * @see https://www.better-auth.com/docs/concepts/rate-limit#connecting-ip-address
 */

const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
/** Loose IPv6 check — enough to reject garbage before forwarding. */
const IPV6 = /^[0-9a-f:]+$/i;

export function isClientIp(value: string): boolean {
    const ip = value.trim();
    if (!ip || ip.includes('/')) return false;
    if (IPV4.test(ip)) return true;
    if (ip.includes(':') && IPV6.test(ip) && ip.length <= 45) return true;
    return false;
}

/**
 * Prefer Railway/CDN single-IP headers, else the leftmost `X-Forwarded-For` hop.
 */
export function resolveClientIpFromHeaders(headers: Headers): string | null {
    for (const key of ['x-real-ip', 'cf-connecting-ip', 'fastly-client-ip'] as const) {
        const raw = headers.get(key)?.trim();
        if (raw && !raw.includes(',') && isClientIp(raw)) return raw;
    }

    const xff = headers.get('x-forwarded-for');
    if (!xff) return null;
    const first = xff.split(',')[0]?.trim();
    return first && isClientIp(first) ? first : null;
}

/** Stamp Nest-bound headers so Better Auth can key rate limits per client. */
export function applyTrustedClientIpHeaders(headers: Headers, clientIp: string): void {
    headers.set('x-real-ip', clientIp);
    headers.set('x-forwarded-for', clientIp);
}
