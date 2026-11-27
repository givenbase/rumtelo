import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { HouseholdAccessSource } from '@rumtelo/contracts';

import { HouseholdScopeInterceptor } from './household-scope.interceptor';
import { householdStorage, type HouseholdContext } from './household.context';

function setup(input: { userId?: string | null } = { userId: 'user-1' }) {
    const seatFor = vi.fn<(userId: string, householdId: string) => Promise<unknown>>(async () => ({
        role: 'OWNER',
        relation: null,
    }));
    const membership = {
        seatFor,
        practicePreviewRoleFor: vi.fn<() => Promise<null>>(async () => null),
    };
    const getSession = vi.fn<() => Promise<unknown>>(async () =>
        input.userId ? { user: { id: input.userId } } : null
    );
    const interceptor = new HouseholdScopeInterceptor(
        membership as never,
        { api: { getSession } } as never
    );

    /** Runs the interceptor and returns the household context the handler would see. */
    async function run(url: string, headers: Record<string, string> = {}, body?: object) {
        const req = { url, headers, body };
        const context = { switchToHttp: () => ({ getRequest: () => req }) };
        let seen: HouseholdContext | undefined;
        const next = {
            handle: () => {
                seen = householdStorage.getStore();
                return of('ok');
            },
        };
        await firstValueFrom(interceptor.intercept(context as never, next as never));
        return seen;
    }
    return { run, seatFor };
}

describe('HouseholdScopeInterceptor: household/previewSplit', () => {
    it('resolves the camelCase wire path without a household (new user, no org yet)', async () => {
        const { run } = setup();
        const ctx = await run('/household/previewSplit');
        expect(ctx).toMatchObject({
            userId: 'user-1',
            householdId: null,
            source: HouseholdAccessSource.SEAT,
        });
    });

    it('ignores x-household-id and a body householdId: no membership lookup, no leak', async () => {
        const { run, seatFor } = setup();
        const ctx = await run(
            '/household/previewSplit?x=1',
            { 'x-household-id': 'household-of-someone-else' },
            { householdId: 'another-household' }
        );
        expect(ctx?.householdId).toBeNull();
        expect(seatFor).not.toHaveBeenCalled();
    });

    it('rejects a request without a session with 401', async () => {
        const { run } = setup({ userId: null });
        await expect(run('/household/previewSplit')).rejects.toMatchObject({ status: 401 });
    });
});

describe('HouseholdScopeInterceptor: other household routes keep their scope', () => {
    it('still verifies membership for a normal household route', async () => {
        const { run, seatFor } = setup();
        const ctx = await run('/household/settings', { 'x-household-id': 'household-1' });
        expect(seatFor).toHaveBeenCalledWith('user-1', 'household-1');
        expect(ctx?.householdId).toBe('household-1');
    });

    it('demands a household for a normal route when none is selected', async () => {
        const { run } = setup();
        await expect(run('/household/settings')).rejects.toMatchObject({ status: 403 });
    });
});
