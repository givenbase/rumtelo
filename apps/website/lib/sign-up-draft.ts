/**
 * Landing → `/sign-up` draft (first / last / email).
 * sessionStorage for same-tab hand-off; `/verify` also accepts `?email=` as fallback.
 */

export const SIGN_UP_DRAFT_STORAGE_KEY = 'rumtelo.signUpDraft';
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
    try {
        const raw = window.sessionStorage.getItem(SIGN_UP_DRAFT_STORAGE_KEY);
        if (!raw) return null;
        return parseSignUpDraft(JSON.parse(raw) as unknown);
    } catch {
        return null;
    }
}

export function writeSignUpDraft(draft: SignUpDraft): void {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(
        SIGN_UP_DRAFT_STORAGE_KEY,
        JSON.stringify({
            firstName: draft.firstName.trim(),
            lastName: draft.lastName.trim(),
            email: draft.email.trim(),
        })
    );
    notify();
}

export function clearSignUpDraft(): void {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(SIGN_UP_DRAFT_STORAGE_KEY);
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
