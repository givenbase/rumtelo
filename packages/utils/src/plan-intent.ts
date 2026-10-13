/**
 * Remember a paid plan pick (Plus / Max) from marketing → sign-up → app upgrade.
 *
 * Storage: cookie (cross-subdomain in prod) + sessionStorage fallback for localhost
 * where website and app use different ports.
 */

import {
    PlanKey,
    PendingPlanIntent,
    type PendingPlanIntent as PendingPlanIntentType,
} from '@rumtelo/contracts';

import { resolveCrossSubdomainCookieDomain } from './better-auth-domains';
import { sessionStorageUtil, storageKey } from './local-storage-util';

export const PLAN_INTENT_COOKIE = 'rumtelo_pending_plan';
export const PLAN_INTENT_STORAGE_KEY = storageKey('intent', 'pending-plan');
/** Same-tab store updates (sessionStorage `storage` events do not fire in-page). */
export const PLAN_INTENT_CHANGE_EVENT = 'rumtelo:plan-intent';

export type { PendingPlanIntentType as PendingPlanIntent };

export function parsePlanIntent(input: unknown): PendingPlanIntentType | null {
    const parsed = PendingPlanIntent.safeParse(normalizeRawIntent(input));
    return parsed.success ? parsed.data : null;
}

function normalizeRawIntent(input: unknown): unknown {
    if (typeof input === 'string') {
        const trimmed = input.trim();
        if (!trimmed) return null;
        try {
            return JSON.parse(trimmed) as unknown;
        } catch {
            const [planRaw, intervalRaw] = trimmed.split(':');
            return {
                planKey: planRaw?.toUpperCase(),
                interval: intervalRaw === 'year' ? 'year' : 'month',
            };
        }
    }
    if (input && typeof input === 'object') {
        const record = input as Record<string, unknown>;
        const plan =
            typeof record.planKey === 'string'
                ? record.planKey
                : typeof record.plan === 'string'
                  ? record.plan
                  : undefined;
        return {
            planKey: typeof plan === 'string' ? plan.toUpperCase() : plan,
            interval: record.interval === 'year' ? 'year' : 'month',
        };
    }
    return input;
}

export function serializePlanIntent(intent: PendingPlanIntentType): string {
    return JSON.stringify({
        planKey: intent.planKey,
        interval: intent.interval,
    });
}

export function planIntentFromSearchParams(
    params: URLSearchParams | { get(name: string): string | null }
): PendingPlanIntentType | null {
    const plan = params.get('plan') ?? params.get('planKey');
    const interval = params.get('interval');
    if (!plan) return null;
    return parsePlanIntent({ planKey: plan, interval: interval ?? 'month' });
}

export function planIntentQuery(intent: PendingPlanIntentType | null): Record<string, string> {
    if (!intent) return {};
    return {
        plan: intent.planKey,
        interval: intent.interval,
    };
}

/** BASIC (or unknown) clears intent — free path needs no Stripe step. */
export function planIntentFromPlanKey(
    planKey: PlanKey | string | null | undefined,
    interval: 'month' | 'year' = 'month'
): PendingPlanIntentType | null {
    if (planKey === PlanKey.PLUS || planKey === PlanKey.MAX) {
        return { planKey, interval };
    }
    return null;
}

function readPlanIntentFromSession(): PendingPlanIntentType | null {
    return parsePlanIntent(sessionStorageUtil.getItem<string>(PLAN_INTENT_STORAGE_KEY));
}

export function readPlanIntentFromDocument(): PendingPlanIntentType | null {
    if (typeof window === 'undefined') return null;
    const fromStorage = readPlanIntentFromSession();
    if (fromStorage) return fromStorage;

    const match = document.cookie.split('; ').find(row => row.startsWith(`${PLAN_INTENT_COOKIE}=`));
    if (!match) return null;
    const raw = decodeURIComponent(match.slice(PLAN_INTENT_COOKIE.length + 1));
    return parsePlanIntent(raw) ?? null;
}

function notifyPlanIntentListeners(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(PLAN_INTENT_CHANGE_EVENT));
}

/** Subscribe for `useSyncExternalStore` — cross-tab + same-tab writes. */
export function subscribePlanIntent(onStoreChange: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener('storage', onStoreChange);
    window.addEventListener(PLAN_INTENT_CHANGE_EVENT, onStoreChange);
    return () => {
        window.removeEventListener('storage', onStoreChange);
        window.removeEventListener(PLAN_INTENT_CHANGE_EVENT, onStoreChange);
    };
}

/** Stable snapshot string for `useSyncExternalStore` equality. */
export function getPlanIntentSnapshot(): string {
    const intent = readPlanIntentFromDocument();
    return intent ? serializePlanIntent(intent) : '';
}

export function getPlanIntentServerSnapshot(): string {
    return '';
}

export function writePlanIntent(
    intent: PendingPlanIntentType | null,
    options?: { domainUrls?: (string | undefined)[]; maxAgeSec?: number }
): void {
    if (typeof window === 'undefined') return;

    if (!intent) {
        clearPlanIntent(options);
        return;
    }

    const value = serializePlanIntent(intent);
    sessionStorageUtil.setItem(PLAN_INTENT_STORAGE_KEY, value, { expiryDays: null });

    const maxAge = options?.maxAgeSec ?? 60 * 60 * 24 * 7;
    const domain = resolveCrossSubdomainCookieDomain(...(options?.domainUrls ?? []));
    const parts = [
        `${PLAN_INTENT_COOKIE}=${encodeURIComponent(value)}`,
        'Path=/',
        `Max-Age=${maxAge}`,
        'SameSite=Lax',
    ];
    if (domain) parts.push(`Domain=${domain}`);
    if (window.location.protocol === 'https:') parts.push('Secure');
    document.cookie = parts.join('; ');
    notifyPlanIntentListeners();
}

export function clearPlanIntent(options?: { domainUrls?: (string | undefined)[] }): void {
    if (typeof window === 'undefined') return;
    sessionStorageUtil.removeItem(PLAN_INTENT_STORAGE_KEY);

    const domain = resolveCrossSubdomainCookieDomain(...(options?.domainUrls ?? []));
    const parts = [`${PLAN_INTENT_COOKIE}=`, 'Path=/', 'Max-Age=0', 'SameSite=Lax'];
    if (domain) parts.push(`Domain=${domain}`);
    document.cookie = parts.join('; ');
    notifyPlanIntentListeners();
}
