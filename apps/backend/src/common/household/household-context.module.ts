import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { HouseholdScopeInterceptor } from './household-scope.interceptor';
import { MembershipService } from './membership.service';
import { RolePermissionInterceptor } from './role-permission.interceptor';

/**
 * Global because every domain module resolves the same household identity, and
 * re-importing a scoping provider in fourteen modules is the kind of repetition
 * that silently drifts.
 */
@Global()
@Module({
    providers: [
        MembershipService,
        HouseholdScopeInterceptor,
        RolePermissionInterceptor,
        { provide: APP_INTERCEPTOR, useClass: HouseholdScopeInterceptor },
        { provide: APP_INTERCEPTOR, useClass: RolePermissionInterceptor },
    ],
    exports: [MembershipService],
})
export class HouseholdContextModule {}
