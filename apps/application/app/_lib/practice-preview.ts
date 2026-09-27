/**
 * Practice → client household preview (coach look-along).
 * Overrides API `x-household-id` + sends `x-practice-id` without switching BA org.
 *
 * Security: preview headers are a temporary client hint only. Backend still
 * requires PracticeMember + ACTIVE PracticeClientLink. Exit MUST clear storage
 * so subsequent requests never keep a client household scope by accident.
 */

import type { PracticeClientAccess } from '@rumtelo/contracts';

import { PRACTICE } from '@/app/_lib/routes';

export type PracticePreviewSession = {
    practiceId: string;
    householdId: string;
    householdName: string;
    linkId: string;
    access: PracticeClientAccess | string;
};

const STORAGE_KEY = 'rumtelo.practicePreview';

let preview: PracticePreviewSession | null = null;
/** While set, PracticeShell must not wipe a freshly entered preview (open-board race). */
let suppressClearUntilMs = 0;
const listeners = new Set<() => void>();

function readStored(): PracticePreviewSession | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as PracticePreviewSession;
        if (!parsed?.practiceId || !parsed?.householdId) return null;
        return parsed;
    } catch {
        return null;
    }
}

function emit() {
    for (const listener of listeners) listener();
}

/** True on `/practice/*` — preview headers must never be sent here. */
export function isPracticeControlPlanePath(pathname?: string): boolean {
    const raw = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
    const path = raw.replace(/^\/(en|nl|es|fr)(?=\/|$)/, '') || '/';
    return path === PRACTICE || path.startsWith(`${PRACTICE}/`);
}

/** Hydrate from sessionStorage once on the client. */
export function hydratePracticePreview(): void {
    if (preview) return;
    preview = readStored();
}

export function getPracticePreview(): PracticePreviewSession | null {
    if (preview === null && typeof window !== 'undefined') {
        preview = readStored();
    }
    return preview;
}

/**
 * Active board-preview session only when not on Practice control plane.
 * Used by API headers — defense in depth if storage lags behind navigation.
 */
export function getActivePracticePreviewForHeaders(): PracticePreviewSession | null {
    const session = getPracticePreview();
    if (!session) return null;
    if (isPracticeControlPlanePath()) return null;
    return session;
}

export function setPracticePreview(next: PracticePreviewSession | null): void {
    preview = next;
    if (next) {
        // Open board: enterPreview then leave Practice — suppress shell clear briefly.
        suppressClearUntilMs = Date.now() + 2_000;
    } else {
        suppressClearUntilMs = 0;
    }
    if (typeof window !== 'undefined') {
        if (next) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        else sessionStorage.removeItem(STORAGE_KEY);
    }
    emit();
}

/**
 * Security-critical: always drop preview memory + sessionStorage.
 * Call on banner back, Go to Practice, sign-out — never skip.
 */
export function forceClearPracticePreview(): void {
    suppressClearUntilMs = 0;
    preview = null;
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem(STORAGE_KEY);
    }
    emit();
}

/**
 * Clear when landing on Practice control plane — no-op while a fresh
 * enterPreview is navigating to the client board (avoids wiping headers).
 */
export function clearPracticePreviewUnlessEntering(): void {
    if (Date.now() < suppressClearUntilMs) return;
    forceClearPracticePreview();
}

export function subscribePracticePreview(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getPracticePreviewSnapshot(): PracticePreviewSession | null {
    return getPracticePreview();
}
