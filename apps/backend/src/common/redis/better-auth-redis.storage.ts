import type Redis from 'ioredis';

import { getOptionalRedis } from './redis-shared';
import { isRedisUrl, redactRedisUrl } from './redis-url.util';

/** Better Auth secondary storage (rate limits, session cache). */
export type BetterAuthSecondaryStorage = {
    get: (key: string) => Promise<string | null>;
    getAndDelete: (key: string) => Promise<string | null>;
    increment: (key: string, ttl: number) => Promise<number>;
    set: (key: string, value: string, ttl?: number) => Promise<void>;
    delete: (key: string) => Promise<void>;
};

const KEY_PREFIX = 'better-auth:';

/** INCR + EXPIRE-only-on-create (windowed rate limits). */
const INCREMENT_SCRIPT = `
local value = redis.call('INCR', KEYS[1])
if value == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return value
`;

async function getAndDelete(client: Redis, key: string): Promise<string | null> {
    try {
        return await client.getdel(key);
    } catch {
        const value = await client.get(key);
        if (value !== null) await client.del(key);
        return value;
    }
}

/**
 * Build Better Auth `secondaryStorage` from `DATABASE_REDIS_URL`.
 * Returns undefined when Redis is unset/invalid so BA keeps memory rate limits.
 */
export function createBetterAuthSecondaryStorage(
    url: string | undefined
): BetterAuthSecondaryStorage | undefined {
    if (!url) return undefined;
    if (!isRedisUrl(url)) {
        console.warn(
            `[Better Auth] DATABASE_REDIS_URL is not redis:// or rediss:// (got "${redactRedisUrl(url)}") — secondaryStorage disabled`
        );
        return undefined;
    }

    const client = getOptionalRedis();
    if (!client) return undefined;

    const prefix = (key: string) => `${KEY_PREFIX}${key}`;

    console.log(`[Better Auth] secondaryStorage → Redis (${redactRedisUrl(url)})`);

    return {
        get: async key => client.get(prefix(key)),

        getAndDelete: async key => getAndDelete(client, prefix(key)),

        increment: async (key, ttl) => {
            if (!Number.isInteger(ttl) || ttl <= 0) {
                throw new TypeError('Redis increment TTL must be a positive integer (seconds)');
            }
            const result = await client.eval(INCREMENT_SCRIPT, 1, prefix(key), String(ttl));
            return Number(result);
        },

        set: async (key, value, ttl) => {
            const prefixed = prefix(key);
            if (ttl !== undefined && ttl > 0) await client.setex(prefixed, ttl, value);
            else await client.set(prefixed, value);
        },

        delete: async key => {
            await client.del(prefix(key));
        },
    };
}
