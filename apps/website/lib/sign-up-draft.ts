/**
 * Landing → `/sign-up` draft (first / last / email).
 * sessionStorage for same-tab hand-off; `/verify` also accepts `?email=` as fallback.
 */

import { sessionStorageUtil, storageKey } from '@rumtelo/utils';

export const SIGN_UP_DRAFT_STORAGE_KEY = storageKey('auth', 'sign-up-draft');
export const SIGN_UP_DRAFT_CHANGE_EVENT = 'rumtelo:sign-up-draft';

export type SignUpDraft = {
    firstName: string;
    lastName: string;
    email: string;
};

function notify(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(SIGN_UP_DRAFT_CHANGE_EVENT));
}

export function parseSignUpDraft(input: unknown): SignUpDraft | null {
    if (!input || typeof input !== 'object') return null;
    const record = input as Record<string, unknown>;
    const firstName = typeof record.firstName === 'string' ? record.firstName.trim() : '';
    const lastName = typeof record.lastName === 'string' ? record.lastName.trim() : '';
    const email = typeof record.email === 'string' ? record.email.trim() : '';
    if (!firstName || !lastName || !email) return null;
    return { firstName, lastName, email };
}

export function readSignUpDraft(): SignUpDraft | null {
    if (typeof window === 'undefined') return null;
    return parseSignUpDraft(sessionStorageUtil.getItem<SignUpDraft>(SIGN_UP_DRAFT_STORAGE_KEY));
}

export function writeSignUpDraft(draft: SignUpDraft): void {
    if (typeof window === 'undefined') return;
    sessionStorageUtil.setItem(
        SIGN_UP_DRAFT_STORAGE_KEY,
        {
            firstName: draft.firstName.trim(),
            lastName: draft.lastName.trim(),
            email: draft.email.trim(),
        },
        { expiryDays: null }
    );
    notify();
}

export function clearSignUpDraft(): void {
    if (typeof window === 'undefined') return;
    sessionStorageUtil.removeItem(SIGN_UP_DRAFT_STORAGE_KEY);
    notify();
}

export function getSignUpDraftSnapshot(): string {
    const draft = readSignUpDraft();
    return draft ? JSON.stringify(draft) : '';
}

export function getSignUpDraftServerSnapshot(): string {
    return '';
}

export function subscribeSignUpDraft(onStoreChange: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener(SIGN_UP_DRAFT_CHANGE_EVENT, onStoreChange);
    window.addEventListener('storage', onStoreChange);
    return () => {
        window.removeEventListener(SIGN_UP_DRAFT_CHANGE_EVENT, onStoreChange);
        window.removeEventListener('storage', onStoreChange);
    };
}
