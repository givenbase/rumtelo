/**
 * Wipe Rumtelo Redis after a DB reset (ghost Better Auth sessions).
 *
 * This Redis is app-owned: sessions, rate-limit counters, sign-up stash —
 * nothing durable. Default is `FLUSHDB` (empty the current DB).
 *
 * Usage (env: DATABASE_REDIS_URL; DATABASE_URL for --orphans):
 *   pnpm redis:flush-auth              # FLUSHDB — full wipe (post db:fresh)
 *   pnpm redis:flush-auth -- --auth-only  # only delete better-auth:* keys
 *   pnpm redis:flush-auth -- --orphans # sessions whose auth.user is gone
 *   pnpm redis:flush-auth -- --dry-run # report only (auth-only / orphans)
 */
import { loadEnvFiles } from '../../src/common/config/load-env.ts';

loadEnvFiles();

import Redis from 'ioredis';
import pg from 'pg';

import { isRedisUrl, redactRedisUrl } from '../../src/common/redis/redis-url.util.ts';

const KEY_PREFIX = 'better-auth:';
const ACTIVE_PREFIX = `${KEY_PREFIX}active-sessions-`;
const SCAN_COUNT = 200;

const orphansOnly = process.argv.includes('--orphans');
const authOnly = process.argv.includes('--auth-only');
const dryRun = process.argv.includes('--dry-run');

async function connectRedis(): Promise<Redis | null> {
    const url = process.env.DATABASE_REDIS_URL;
    if (!url) {
        const nodeEnv = process.env.NODE_ENV || 'development';
        if (nodeEnv === 'staging' || nodeEnv === 'production') {
            console.warn(
                `[flush-better-auth-redis] DATABASE_REDIS_URL unset under NODE_ENV=${nodeEnv} — skip.\n` +
                    `  Run: pnpm env:use:${nodeEnv}  (copies Redis URL from .env.github.secrets.${nodeEnv})`
            );
        } else {
            console.log('[flush-better-auth-redis] DATABASE_REDIS_URL unset — skip');
        }
        return null;
    }
    if (!isRedisUrl(url)) {
        console.warn(`[flush-better-auth-redis] invalid URL (${redactRedisUrl(url)}) — skip`);
        return null;
    }
    const client = new Redis(url, {
        maxRetriesPerRequest: 3,
        enableOfflineQueue: true,
        retryStrategy: times => (times > 3 ? null : Math.min(times * 200, 1000)),
    });
    client.on('error', (err: Error) => {
        console.warn(`[flush-better-auth-redis] redis error: ${err.message}`);
    });
    await client.ping();
    return client;
}

async function scanKeys(client: Redis, match: string): Promise<string[]> {
    const found: string[] = [];
    let cursor = '0';
    do {
        const [next, keys] = await client.scan(cursor, 'MATCH', match, 'COUNT', SCAN_COUNT);
        cursor = next;
        found.push(...keys);
    } while (cursor !== '0');
    return found;
}

async function flushDb(client: Redis): Promise<void> {
    const target = redactRedisUrl(process.env.DATABASE_REDIS_URL);
    if (dryRun) {
        const size = await client.dbsize();
        console.log(
            `[flush-better-auth-redis] dry-run: would FLUSHDB (${size} key(s)) → ${target}`
        );
        return;
    }
    await client.flushdb();
    console.log(`[flush-better-auth-redis] FLUSHDB ok → ${target}`);
}

async function flushAuthKeys(client: Redis): Promise<void> {
    const keys = await scanKeys(client, `${KEY_PREFIX}*`);
    if (keys.length === 0) {
        console.log(`[flush-better-auth-redis] no ${KEY_PREFIX}* keys`);
        return;
    }
    if (dryRun) {
        console.log(`[flush-better-auth-redis] dry-run: would delete ${keys.length} key(s)`);
        return;
    }
    let deleted = 0;
    for (let i = 0; i < keys.length; i += 100) {
        deleted += await client.del(...keys.slice(i, i + 100));
    }
    console.log(`[flush-better-auth-redis] deleted ${deleted} ${KEY_PREFIX}* key(s)`);
}

type SessionRef = { token?: string; expiresAt?: number };

function parseSessionList(raw: string | null): SessionRef[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? (parsed as SessionRef[]) : [];
    } catch {
        return [];
    }
}

async function flushOrphans(client: Redis): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL required for --orphans (checks auth.user)');
    }

    const pool = new pg.Pool({
        connectionString: databaseUrl,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
        options: '-c search_path=auth',
    });

    try {
        const listKeys = await scanKeys(client, `${ACTIVE_PREFIX}*`);
        let orphanUsers = 0;
        let deletedKeys = 0;

        for (const listKey of listKeys) {
            const userId = listKey.slice(ACTIVE_PREFIX.length);
            if (!userId) continue;

            const exists = await pool.query<{ ok: number }>(
                `select 1 as ok from auth."user" where id = $1 limit 1`,
                [userId]
            );
            if ((exists.rowCount ?? 0) > 0) continue;

            orphanUsers += 1;
            const refs = parseSessionList(await client.get(listKey));
            const tokenKeys = refs
                .map(ref => ref.token?.trim())
                .filter((token): token is string => Boolean(token))
                .map(token => `${KEY_PREFIX}${token}`);

            const toDelete = [listKey, ...tokenKeys];
            if (dryRun) {
                console.log(`  dry-run: orphan user ${userId} → ${toDelete.length} key(s)`);
                continue;
            }
            deletedKeys += await client.del(...toDelete);
        }

        const label = dryRun ? 'would touch' : 'deleted';
        console.log(
            `[flush-better-auth-redis] orphans: ${orphanUsers} user(s), ${label} ${deletedKeys} key(s)`
        );
    } finally {
        await pool.end();
    }
}

async function main(): Promise<void> {
    const client = await connectRedis();
    if (!client) return;

    try {
        if (orphansOnly) await flushOrphans(client);
        else if (authOnly) await flushAuthKeys(client);
        else await flushDb(client);
    } finally {
        client.disconnect();
    }
}

main().catch(error => {
    console.error('[flush-better-auth-redis] failed', error);
    process.exit(1);
});
