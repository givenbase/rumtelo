/**
 * Redis URL helpers — shared by Nest RedisService and Better Auth wiring.
 */

export function isRedisUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'redis:' || parsed.protocol === 'rediss:';
    } catch {
        return false;
    }
}

/** Log-safe: keep scheme/host, drop credentials when parseable. */
export function redactRedisUrl(url: string): string {
    try {
        const parsed = new URL(url);
        if (parsed.protocol === 'redis:' || parsed.protocol === 'rediss:') {
            parsed.password = '';
            parsed.username = '';
            return parsed.toString();
        }
        // Mis-prefixed URLs (https://redis://…) bury creds in the path — never log raw.
        return `${parsed.protocol}//${parsed.hostname || 'invalid'}/[redacted]`;
    } catch {
        return '[invalid-redis-url]';
    }
}
