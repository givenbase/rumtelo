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
import { practiceStorage, type PracticeContext } from './practice.context';

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
                .then(({ ctx, headers, practiceCtx }) => {
                    householdStorage.run(ctx, () => {
                        authHeadersStorage.run(headers, () => {
                            practiceStorage.run(practiceCtx, () => {
                                next.handle().subscribe(subscriber);
                            });
                        });
                    });
                })
                .catch(err => subscriber.error(err));
        });
    }

    private async resolve(
        req: Req
    ): Promise<{ ctx: HouseholdContext; headers: Headers; practiceCtx: PracticeContext }> {
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
        // Person-scoped account APIs (theme, locale, board gate) — no household required.
        const isAccountPersonal = isAccountPersonalPath(pathname);
        // Practice control plane only — not household.practiceLinks (dual-consent on the board).
        const isPractice = isPracticeControlPlanePath(pathname);

        const householdId = resolveHouseholdId(req);
        const headers = toAuthHeaders(req);
        const practiceCtx = resolvePracticeContext(req);

        // Practice control plane is authz'd via PracticeMember — not household membership.
        // Soft-attach a household when the user is a member (client drill-down later);
        // never 403 practice routes for a missing / foreign household.
        if (isPractice) {
            if (householdId) {
                const role = await this.membership.roleFor(userId, householdId);
                if (role) {
                    return {
                        ctx: { userId, householdId, role },
                        headers,
                        practiceCtx,
                    };
                }
            }
            return {
                ctx: { userId, householdId: null, role: 'OWNER' },
                headers,
                practiceCtx,
            };
        }

        if (!householdId && (isOnboard || isAccountPersonal)) {
            return {
                ctx: { userId, householdId: null, role: 'OWNER' },
                headers,
                practiceCtx,
            };
        }

        if (!householdId) throw apiForbidden('no_household_selected');

        const role = await this.membership.roleFor(userId, householdId);
        if (role) {
            return { ctx: { userId, householdId, role }, headers, practiceCtx };
        }

        // Practice coach preview: not a household member, but linked via PracticeClientLink.
        const practiceId = practiceCtx.practiceId;
        if (practiceId) {
            const previewRole = await this.membership.practicePreviewRoleFor(
                userId,
                practiceId,
                householdId
            );
            if (previewRole) {
                return {
                    ctx: { userId, householdId, role: previewRole },
                    headers,
                    practiceCtx,
                };
            }
        }

        throw apiForbidden('not_household_member');
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
 * Header and body must agree when both are present — never trust a foreign body id.
 */
function resolveHouseholdId(req: Req): string | null {
    const header = req.headers['x-household-id'];
    const headerId = typeof header === 'string' && header.length > 0 ? header : null;

    const body = req.body as { householdId?: string } | undefined;
    const bodyId =
        typeof body?.householdId === 'string' && body.householdId.length > 0
            ? body.householdId
            : null;

    if (headerId && bodyId && headerId !== bodyId) {
        throw apiForbidden('household_mismatch');
    }

    if (headerId) return headerId;
    if (bodyId) return bodyId;

    // SDK name remains activeOrganizationId; DB column is active_household_id.
    const activeOrg = (req.session?.session as { activeOrganizationId?: string | null } | undefined)
        ?.activeOrganizationId;
    return activeOrg ?? null;
}

/** Practice oRPC routes — exclude household dual-consent `practiceLinks`. */
function isPracticeControlPlanePath(pathname: string): boolean {
    if (pathname.includes('practiceLinks') || pathname.includes('practice-links')) {
        return false;
    }
    return pathname.includes('/practice');
}

/**
 * Account profile + settings + boardReady — keyed by the signed-in user, not a household.
 * Must work before active org is set (first paint after onboard / soft session).
 */
function isAccountPersonalPath(pathname: string): boolean {
    // Match `/account/...` but not nested household account aliases if any appear later.
    return /\/account(?:\/|$)/.test(pathname);
}

/** Optional `x-practice-id` — role is resolved in PracticeService when needed. */
function resolvePracticeContext(req: Req): PracticeContext {
    const header = req.headers['x-practice-id'];
    const practiceId = typeof header === 'string' && header.length > 0 ? header : null;
    return { practiceId, role: null };
}
