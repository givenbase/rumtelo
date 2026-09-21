/**
 * Stash sign-up profile fields between Better Auth middleware and user.create.after.
 * Fields are not Better Auth columns — they land on Rumtelo `auth.account`.
 *
 * Prefers Redis when `DATABASE_REDIS_URL` is valid (multi-replica safe).
 * Falls back to process memory for local / Redis-down.
 */

import type { SignUpAccountProfile } from '@rumtelo/contracts';

import { getOptionalRedis } from '../../../common/redis/redis-shared';

type PendingEntry = {
    profile: SignUpAccountProfile;
    at: number;
};

const TTL_SEC = 60;
const TTL_MS = TTL_SEC * 1000;
const KEY_PREFIX = 'rumtelo:signup-profile:';

const pendingByEmail = new Map<string, PendingEntry>();

function keyFor(email: string): string {
    return `${KEY_PREFIX}${email.trim().toLowerCase()}`;
}

function pruneMemory(now = Date.now()): void {
    for (const [email, entry] of pendingByEmail) {
        if (now - entry.at > TTL_MS) pendingByEmail.delete(email);
    }
}

async function redisGetDel(key: string): Promise<string | null> {
    const client = getOptionalRedis();
    if (!client) return null;
    try {
        return await client.getdel(key);
    } catch {
        const value = await client.get(key);
        if (value !== null) await client.del(key);
        return value;
    }
}

export async function stashSignUpAccountProfile(
    email: string,
    profile: SignUpAccountProfile
): Promise<void> {
    const key = keyFor(email);
    const client = getOptionalRedis();
    if (client) {
        try {
            await client.setex(key, TTL_SEC, JSON.stringify(profile));
            return;
        } catch {
            // fall through to memory
        }
    }
    pruneMemory();
    pendingByEmail.set(email.trim().toLowerCase(), { profile, at: Date.now() });
}

export async function takeSignUpAccountProfile(
    email: string
): Promise<SignUpAccountProfile | undefined> {
    const key = keyFor(email);
    try {
        const raw = await redisGetDel(key);
        if (raw) return JSON.parse(raw) as SignUpAccountProfile;
    } catch {
        // fall through to memory
    }
    const mapKey = email.trim().toLowerCase();
    const entry = pendingByEmail.get(mapKey);
    pendingByEmail.delete(mapKey);
    return entry?.profile;
}
