import type { FastifyRequest } from 'fastify';

import {
    Inject,
    Injectable,
    type CallHandler,
    type ExecutionContext,
    type NestInterceptor,
} from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { Observable } from 'rxjs';

import { apiForbidden } from '../errors/api-user-error';
import { toAuthHeaders } from './auth-headers.util';
import { authHeadersStorage, householdStorage, type HouseholdContext } from './household.context';
import { MembershipService } from './membership.service';

type Req = FastifyRequest & {
    user?: { id: string } | null;
    session?: Awaited<ReturnType<AuthService['api']['getSession']>> | null;
};

/**
 * Resolves household scope at oRPC handler time (when req.url is the real route path).
 * Middleware runs too early in Fastify/Nest and sees req.url as `/`.
 * System pages (health, branded HTML, swagger) skip household scope entirely.
 */
@Injectable()
export class HouseholdScopeInterceptor implements NestInterceptor {
    constructor(
        @Inject(MembershipService) private readonly membership: MembershipService,
        @Inject(AuthService) private readonly authService: AuthService
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const req = context.switchToHttp().getRequest<Req>();
        const pathname = (req.url ?? '').split('?')[0] ?? '';
        if (isSystemPublicPath(pathname)) return next.handle();

        return new Observable(subscriber => {
            void this.resolve(req)
                .then(({ ctx, headers }) => {
                    householdStorage.run(ctx, () => {
                        authHeadersStorage.run(headers, () => {
                            next.handle().subscribe(subscriber);
                        });
                    });
                })
                .catch(err => subscriber.error(err));
        });
    }

    private async resolve(req: Req): Promise<{ ctx: HouseholdContext; headers: Headers }> {
        if (!this.authService?.api) {
            throw apiForbidden('auth_not_ready');
        }

        if (!req.user) {
            const session = await this.authService.api.getSession({
                headers: fromNodeHeaders(req.headers),
            });
            req.session = session;
            req.user = session?.user ?? null;
        }

        const userId = req.user?.id;
        if (!userId) throw apiForbidden('not_authenticated');

        const pathname = (req.url ?? '').split('?')[0] ?? '';
        const isOnboard = pathname.endsWith('/household/onboard');

        const householdId = resolveHouseholdId(req);
        const headers = toAuthHeaders(req);

        if (!householdId && isOnboard) {
            return { ctx: { userId, householdId: null, role: 'OWNER' }, headers };
        }

        if (!householdId) throw apiForbidden('no_household_selected');

        const role = await this.membership.roleFor(userId, householdId);
        if (!role) throw apiForbidden('not_household_member');

        return { ctx: { userId, householdId, role }, headers };
    }
}

/** Pages + auth + swagger — no household context required. */
function isSystemPublicPath(pathname: string): boolean {
    if (pathname === '/' || pathname === '') return true;
    return (
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/api/docs') ||
        pathname.startsWith('/health') ||
        pathname.startsWith('/webhooks/') ||
        pathname.startsWith('/access-denied') ||
        pathname.startsWith('/email-preview')
    );
}

/** Explicit header wins, then the oRPC input body, then the session's active org.
 * All three are Better Auth opaque AuthIds (not Rumtelo uuids).
 */
function resolveHouseholdId(req: Req): string | null {
    const header = req.headers['x-household-id'];
    if (typeof header === 'string' && header.length > 0) return header;

    const body = req.body as { householdId?: string } | undefined;
    if (body?.householdId) return body.householdId;

    // SDK name remains activeOrganizationId; DB column is active_household_id.
    const activeOrg = (req.session?.session as { activeOrganizationId?: string | null } | undefined)
        ?.activeOrganizationId;
    return activeOrg ?? null;
}
