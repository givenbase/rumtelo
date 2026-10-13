import { AsyncLocalStorage } from 'node:async_hooks';

export interface HouseholdContext {
    userId: string;
    /** Null only during household.onboard (user authenticated, org not yet created). */
    householdId: string | null;
    role: 'OWNER' | 'MEMBER' | 'VIEWER';
}

/**
 * Request-scoped household identity. Held in AsyncLocalStorage so services never
 * need householdId threaded through every signature — and so a service that
 * forgets to filter still cannot see another household's rows, because the
 * scoped repository reads from here rather than from arguments.
 */
export const householdStorage = new AsyncLocalStorage<HouseholdContext>();

/** Incoming request headers for better-auth server API calls (createOrganization, etc.). */
export const authHeadersStorage = new AsyncLocalStorage<Headers>();

export function currentAuthHeaders(): Headers {
    return authHeadersStorage.getStore() ?? new Headers();
}

export function currentHouseholdContext(): HouseholdContext {
    const ctx = householdStorage.getStore();
    if (!ctx) {
        throw new Error(
            'No household context. A household-scoped query ran outside a request — ' +
                'wrap background jobs in householdStorage.run().'
        );
    }
    return ctx;
}

export function currentHouseholdId(): string {
    const id = currentHouseholdContext().householdId;
    if (!id) throw new Error('No household in context');
    return id;
}

export function currentUserId(): string {
    return currentHouseholdContext().userId;
}
