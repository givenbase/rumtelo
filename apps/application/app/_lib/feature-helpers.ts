/**
 * Coach guides preference — on-screen why-lines & jar cards (same voice as /product/coach).
 * Shared across Help, Settings → Account, and page surfaces.
 */

import { localStorageUtil, storageKey } from '@rumtelo/utils';

export const HELPERS_STORAGE_KEY = storageKey('helpers', 'enabled');
export const HELPERS_CHANGE_EVENT = 'rumtelo:helpers-change';

/** Default on so first-time users see guides; Help/Settings can turn off. */
export const HELPERS_DEFAULT_ENABLED = true;

export function readHelpersEnabled(): boolean {
    if (typeof window === 'undefined') return HELPERS_DEFAULT_ENABLED;
    const stored = localStorageUtil.getItem<boolean>(HELPERS_STORAGE_KEY);
    if (stored !== null) return stored;
    return HELPERS_DEFAULT_ENABLED;
}

export function writeHelpersEnabled(enabled: boolean): void {
    if (typeof window === 'undefined') return;
    localStorageUtil.setItem(HELPERS_STORAGE_KEY, enabled, { expiryDays: null });
    try {
        window.dispatchEvent(new CustomEvent(HELPERS_CHANGE_EVENT, { detail: { enabled } }));
    } catch {
        /* ignore */
    }
}

/** Subscribe for useSyncExternalStore — storage (other tabs) + same-tab custom event. */
export function subscribeHelpersEnabled(onStoreChange: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;

    const onStorage = (event: StorageEvent) => {
        if (event.key === HELPERS_STORAGE_KEY || event.key === null) onStoreChange();
    };
    const onCustom = () => onStoreChange();

    window.addEventListener('storage', onStorage);
    window.addEventListener(HELPERS_CHANGE_EVENT, onCustom);
    return () => {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener(HELPERS_CHANGE_EVENT, onCustom);
    };
}

export function getHelpersServerSnapshot(): boolean {
    return HELPERS_DEFAULT_ENABLED;
}
