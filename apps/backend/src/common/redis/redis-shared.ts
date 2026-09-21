import Redis from 'ioredis';

import { loadEnv } from '../config/env.config';

import { isRedisUrl, redactRedisUrl } from './redis-url.util';

/**
 * Process-wide optional Redis client for Better Auth, Throttler, and sign-up stash.
 * Nest {@link RedisService} keeps its own lazy client for health probes.
 */
let shared: Redis | null | undefined;

export function getOptionalRedis(): Redis | null {
    if (shared !== undefined) return shared;

    const url = loadEnv().DATABASE_REDIS_URL;
    if (!url) {
        shared = null;
        return null;
    }
    if (!isRedisUrl(url)) {
        console.warn(
            `[Redis] DATABASE_REDIS_URL is not redis:// or rediss:// (got "${redactRedisUrl(url)}")`
        );
        shared = null;
        return null;
    }

    shared = new Redis(url, {
        maxRetriesPerRequest: 3,
        retryStrategy: times => (times > 2 ? null : Math.min(times * 200, 1000)),
        enableOfflineQueue: true,
    });
    shared.on('error', (err: Error) => {
        console.warn(`[Redis] shared client error: ${err.message}`);
    });
    return shared;
}
