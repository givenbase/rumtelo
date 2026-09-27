import {
    Injectable,
    type CallHandler,
    type ExecutionContext,
    type NestInterceptor,
} from '@nestjs/common';
import {
    HouseholdRole,
    permissionActionFromPath,
    permissionSectionFromPath,
    roleCan,
} from '@rumtelo/contracts';
import { type Observable } from 'rxjs';

import { apiForbidden } from '../errors/api-user-error';
import { householdStorage } from './household.context';

/**
 * Enforces {@link ROLE_PERMISSIONS} after household scope is set.
 * Plan capabilities stay on CapabilityInterceptor — this is membership ACL only.
 *
 * Skips account/auth (person prefs) and paths with no mapped section.
 */
@Injectable()
export class RolePermissionInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const http = context.switchToHttp();
        const req = http.getRequest<{ method?: string; url?: string }>();
        const pathname = (req.url ?? '').split('?')[0] ?? '';
        const method = req.method ?? 'GET';

        const ctx = householdStorage.getStore();
        if (!ctx?.householdId) return next.handle();

        const section = permissionSectionFromPath(pathname);
        if (!section) return next.handle();

        const action = permissionActionFromPath(pathname, method);
        const role = ctx.role as HouseholdRole;

        if (!roleCan(role, section, action)) {
            throw apiForbidden(
                role === HouseholdRole.VIEWER ? 'viewer_read_only' : 'role_permission_denied'
            );
        }

        return next.handle();
    }
}
