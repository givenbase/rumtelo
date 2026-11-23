import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { HouseholdAccessSource, HouseholdRole } from '@rumtelo/contracts';

import { householdStorage } from './household.context';
import { RolePermissionInterceptor } from './role-permission.interceptor';

/** Runs the interceptor as `role` on `url` (oRPC posts everything) and reports the outcome. */
async function call(role: HouseholdRole, url: string) {
    const handler = vi.fn<() => string>(() => 'handled');
    const context = { switchToHttp: () => ({ getRequest: () => ({ url, method: 'POST' }) }) };
    const next = { handle: () => of(handler()) };
    const outcome = await householdStorage.run(
        {
            userId: 'user-1',
            householdId: 'household-a',
            role,
            source: HouseholdAccessSource.SEAT,
            relation: null,
        },
        async () => {
            try {
                await firstValueFrom(
                    new RolePermissionInterceptor().intercept(context as never, next as never)
                );
                return 'allowed';
            } catch (error) {
                return (error as { response?: { message?: string } }).response?.message;
            }
        }
    );
    return { outcome, reached: handler.mock.calls.length === 1 };
}

describe('RolePermissionInterceptor: /device registry', () => {
    it.each(['/device/create', '/device/update', '/device/delete'])(
        'denies a VIEWER on %s and never reaches the handler',
        async url => {
            expect(await call(HouseholdRole.VIEWER, url)).toEqual({
                outcome: 'viewer_read_only',
                reached: false,
            });
        }
    );

    it.each([HouseholdRole.OWNER, HouseholdRole.MEMBER])(
        '%s may pair, update and forget a device',
        async role => {
            for (const url of ['/device/create', '/device/update', '/device/delete']) {
                expect(await call(role, url)).toEqual({ outcome: 'allowed', reached: true });
            }
        }
    );

    it.each([HouseholdRole.OWNER, HouseholdRole.MEMBER, HouseholdRole.VIEWER])(
        '%s may read the device list and the kind catalog',
        async role => {
            for (const url of ['/device/list', '/device/kinds']) {
                expect(await call(role, url)).toEqual({ outcome: 'allowed', reached: true });
            }
        }
    );
});
