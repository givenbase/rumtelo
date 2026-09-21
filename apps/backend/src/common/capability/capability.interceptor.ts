import {
    ForbiddenException,
    Inject,
    Injectable,
    type CallHandler,
    type ExecutionContext,
    type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
    hasCapability,
    isCapabilityDeferredAtLaunch,
    type CapabilityKey,
} from '@rumtelo/contracts';
import { Observable } from 'rxjs';

import { HouseholdBillingService } from '../../modules/auth/household/household-billing/household-billing.service';
import { isLaunchProductsDeferred } from '../config/launch-products.util';
import { currentHouseholdId, householdStorage } from '../household/household.context';
import { REQUIRE_CAPABILITY_KEY } from './require-capability.decorator';

/**
 * Enforces @RequireCapability after household scope is established.
 * Loads planKey from household billing (contracts hasCapability).
 * Production launch also blocks deferred products (Energy/Soul).
 */
@Injectable()
export class CapabilityInterceptor implements NestInterceptor {
    constructor(
        @Inject(Reflector) private readonly reflector: Reflector,
        @Inject(HouseholdBillingService) private readonly billing: HouseholdBillingService
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const keys = this.reflector.getAllAndOverride<CapabilityKey[] | undefined>(
            REQUIRE_CAPABILITY_KEY,
            [context.getHandler(), context.getClass()]
        );
        if (!keys?.length) return next.handle();

        return new Observable(subscriber => {
            void this.assertGranted(keys)
                .then(() => next.handle().subscribe(subscriber))
                .catch(err => subscriber.error(err));
        });
    }

    private async assertGranted(keys: CapabilityKey[]): Promise<void> {
        if (!householdStorage.getStore()?.householdId) {
            throw new ForbiddenException('Household context required for capability check');
        }
        const householdId = currentHouseholdId();
        const planKey = await this.billing.getPlanKey(householdId);
        const defer = isLaunchProductsDeferred();
        for (const key of keys) {
            if (defer && isCapabilityDeferredAtLaunch(key)) {
                throw new ForbiddenException(`${key} is not available yet`);
            }
            if (!hasCapability(key, planKey)) {
                throw new ForbiddenException(`Plan does not include ${key}`);
            }
        }
    }
}
