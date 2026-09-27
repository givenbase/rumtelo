import { AsyncLocalStorage } from 'node:async_hooks';

import type { PracticeRole } from '@rumtelo/contracts';

export interface PracticeContext {
    /** Active practice when `x-practice-id` is set; null on create/list. */
    practiceId: string | null;
    role: PracticeRole | null;
}

/**
 * Request-scoped Practice identity (B2B control plane).
 * Parallel to household ALS — never reuse better-auth organization for Practice.
 */
export const practiceStorage = new AsyncLocalStorage<PracticeContext>();

export function currentPracticeContext(): PracticeContext {
    return practiceStorage.getStore() ?? { practiceId: null, role: null };
}

export function currentPracticeId(): string {
    const id = currentPracticeContext().practiceId;
    if (!id) throw new Error('No practice in context');
    return id;
}
