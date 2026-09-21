import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

import { loadEnv } from '../config/env.config';

import { getOptionalRedis } from './redis-shared';
import { redactRedisUrl } from './redis-url.util';

/** Global HTTP throttle — 240 req / 60s per tracker (IP). */
const DEFAULT_THROTTLERS = [{ name: 'default', ttl: 60_000, limit: 240 }] as const;

/**
 * Nest Throttler options. Uses Redis when `DATABASE_REDIS_URL` is valid so
 * limits are shared across replicas; otherwise in-memory (local / Redis-down).
 */
export function createThrottlerOptions(): ThrottlerModuleOptions {
    const redis = getOptionalRedis();
    if (redis) {
        const url = loadEnv().DATABASE_REDIS_URL;
        console.log(
            `[Throttler] storage → Redis (${url ? redactRedisUrl(url) : 'redis://'})`
        );
        return {
            throttlers: [...DEFAULT_THROTTLERS],
            storage: new ThrottlerStorageRedisService(redis),
        };
    }

    console.warn('[Throttler] Redis unavailable — using in-memory storage (per-process limits)');
    return { throttlers: [...DEFAULT_THROTTLERS] };
}
