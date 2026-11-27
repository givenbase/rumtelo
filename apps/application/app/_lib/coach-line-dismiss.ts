/**
 * Device-local hide store for Coach lines that come from local rules (not the feed).
 * One record per household: `{ [candidateId]: fingerprint }`. A line stays hidden while its
 * fingerprint is unchanged and comes back when the data moves (new band, new month).
 * Feed tips never use this: they dismiss on the server for the whole household.
 */
import { localStorageUtil, storageKey } from '@rumtelo/utils';

import type { CoachLineLocalHidden } from './coach-line';

const CHANGE_EVENT = 'rumtelo:coach-line-change';
const NO_HIDDEN: CoachLineLocalHidden = {};

function keyFor(householdId: string): string {
    return storageKey('coach', 'line', householdId);
}

// `useSyncExternalStore` needs a stable snapshot per unchanged storage value.
let cached: { key: string; raw: string | null; value: CoachLineLocalHidden } | null = null;

export function readLocalHidden(householdId: string | null | undefined): CoachLineLocalHidden {
    if (typeof window === 'undefined' || !householdId) return NO_HIDDEN;
    const key = keyFor(householdId);
    const value = localStorageUtil.getItem<CoachLineLocalHidden>(key);
    const raw = value ? JSON.stringify(value) : null;
    if (cached && cached.key === key && cached.raw === raw) return cached.value;
    const next = value ?? NO_HIDDEN;
    cached = { key, raw, value: next };
    return next;
}

function notify(): void {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function hideLocalLine(householdId: string, id: string, fingerprint: string): void {
    const next = { ...readLocalHidden(householdId), [id]: fingerprint };
    localStorageUtil.setItem(keyFor(householdId), next, { expiryDays: 90 });
    notify();
}

export function showLocalLine(householdId: string, id: string): void {
    const { [id]: _removed, ...rest } = readLocalHidden(householdId);
    localStorageUtil.setItem(keyFor(householdId), rest, { expiryDays: 90 });
    notify();
}

export function subscribeLocalHidden(onStoreChange: () => void): () => void {
    window.addEventListener('storage', onStoreChange);
    window.addEventListener(CHANGE_EVENT, onStoreChange);
    return () => {
        window.removeEventListener('storage', onStoreChange);
        window.removeEventListener(CHANGE_EVENT, onStoreChange);
    };
}

export function getServerLocalHidden(): CoachLineLocalHidden {
    return NO_HIDDEN;
}
