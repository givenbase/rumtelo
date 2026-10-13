/**
 * Typed browser storage envelopes with optional expiry.
 * SSR / private-mode safe. Does not touch foreign keys (consent, analytics, etc.).
 *
 * Prefer {@link localStorageUtil} for durable device prefs and
 * {@link sessionStorageUtil} for tab-scoped hand-offs.
 */

const ENVELOPE_VERSION = 1;
const DEFAULT_EXPIRY_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Envelope written by util `setItem`. */
export interface StoredItem<T> {
    /** Expiry timestamp in ms, or `null` for no expiry. */
    expiry: null | number;
    value: T;
    version: typeof ENVELOPE_VERSION;
}

export interface BrowserStorageWriteOptions {
    /**
     * Days until expiry (default 30). Pass `null` for no expiry.
     * Day count — not milliseconds.
     */
    expiryDays?: null | number;
}

/** Build a stable, namespaced storage key: `rumtelo:namespace:part…`. */
export function storageKey(namespace: string, ...parts: (number | string)[]): string {
    return ['rumtelo', namespace, ...parts.map(String)].join(':');
}

export type BrowserStorageUtil = {
    isAvailable(): boolean;
    clear(): void;
    clearExpiredItems(): void;
    // oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- generic API for callers
    getItem<T>(key: string): T | null;
    hasItem(key: string): boolean;
    removeItem(key: string): void;
    // oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- generic API for callers
    setItem<T>(key: string, value: T, options?: BrowserStorageWriteOptions): boolean;
};

function isEnvelope(value: unknown): value is StoredItem<unknown> {
    if (typeof value !== 'object' || value === null) return false;
    const item = value as Record<string, unknown>;
    if (!('value' in item) || !('expiry' in item) || !('version' in item)) return false;
    if (item.expiry !== null && typeof item.expiry !== 'number') return false;
    if (item.version !== ENVELOPE_VERSION) return false;
    return true;
}

function isExpired(item: StoredItem<unknown>): boolean {
    return item.expiry !== null && Date.now() > item.expiry;
}

function expiryTimestamp(expiryDays: null | number | undefined): null | number {
    if (expiryDays === null) return null;
    return Date.now() + (expiryDays ?? DEFAULT_EXPIRY_DAYS) * MS_PER_DAY;
}

function isQuotaError(error: unknown): boolean {
    return (
        error instanceof DOMException &&
        (error.name === 'QuotaExceededError' ||
            error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
            error.code === 22)
    );
}

function createBrowserStorageUtil(kind: 'local' | 'session'): BrowserStorageUtil {
    const probe = kind === 'local' ? '__rumtelo_ls_probe__' : '__rumtelo_ss_probe__';
    let available: boolean | null = null;
    let cachedRef: Storage | null | undefined;

    function getStorage(): Storage | null {
        if (typeof window === 'undefined') return null;
        try {
            return kind === 'local' ? window.localStorage : window.sessionStorage;
        } catch {
            return null;
        }
    }

    function canUse(): boolean {
        const current = getStorage() ?? undefined;
        if (current !== cachedRef) {
            available = null;
            cachedRef = current ?? null;
        }
        if (available !== null) return available;
        if (!current) {
            available = false;
            return false;
        }
        try {
            current.setItem(probe, '1');
            current.removeItem(probe);
            available = true;
        } catch {
            available = false;
        }
        return available;
    }

    function removeKey(key: string): void {
        if (!canUse()) return;
        try {
            getStorage()?.removeItem(key);
        } catch {
            /* ignore */
        }
    }

    function readEnvelope<T>(key: string): StoredItem<T> | null {
        if (!canUse()) return null;
        let raw: string | null;
        try {
            raw = getStorage()?.getItem(key) ?? null;
        } catch {
            return null;
        }
        if (!raw) return null;

        try {
            const parsed: unknown = JSON.parse(raw);
            return isEnvelope(parsed) ? (parsed as StoredItem<T>) : null;
        } catch {
            removeKey(key);
            return null;
        }
    }

    function keys(): string[] {
        if (!canUse()) return [];
        const store = getStorage();
        if (!store) return [];
        try {
            const out: string[] = [];
            for (let index = 0; index < store.length; index++) {
                const key = store.key(index);
                if (key !== null) out.push(key);
            }
            return out;
        } catch {
            return [];
        }
    }

    const util: BrowserStorageUtil = {
        isAvailable(): boolean {
            return canUse();
        },

        clear(): void {
            for (const key of keys()) {
                if (readEnvelope(key)) removeKey(key);
            }
        },

        clearExpiredItems(): void {
            for (const key of keys()) {
                const item = readEnvelope(key);
                if (item && isExpired(item)) removeKey(key);
            }
        },

        getItem<T>(key: string): T | null {
            const item = readEnvelope<T>(key);
            if (!item) return null;
            if (isExpired(item)) {
                removeKey(key);
                return null;
            }
            return item.value;
        },

        hasItem(key: string): boolean {
            const item = readEnvelope(key);
            if (!item) return false;
            if (isExpired(item)) {
                removeKey(key);
                return false;
            }
            return true;
        },

        removeItem(key: string): void {
            removeKey(key);
        },

        setItem<T>(key: string, value: T, options: BrowserStorageWriteOptions = {}): boolean {
            if (!canUse()) return false;
            const store = getStorage();
            if (!store) return false;

            const expiryDays =
                options.expiryDays === undefined ? DEFAULT_EXPIRY_DAYS : options.expiryDays;
            const serialized = JSON.stringify({
                version: ENVELOPE_VERSION,
                expiry: expiryTimestamp(expiryDays),
                value,
            } satisfies StoredItem<T>);

            try {
                store.setItem(key, serialized);
                return true;
            } catch (error) {
                if (!isQuotaError(error)) return false;
                util.clearExpiredItems();
                try {
                    store.setItem(key, serialized);
                    return true;
                } catch {
                    return false;
                }
            }
        },
    };

    return util;
}

export const localStorageUtil = createBrowserStorageUtil('local');
export const sessionStorageUtil = createBrowserStorageUtil('session');
