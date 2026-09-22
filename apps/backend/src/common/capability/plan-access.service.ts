import { Inject, Injectable } from '@nestjs/common';

import { apiForbidden } from '../errors/api-user-error';
import {
    hasCapability,
    isCapabilityDeferredAtLaunch,
    withinLimit,
    type CapabilityKey,
    type PlanKey,
    type PlanLimitKey,
} from '@rumtelo/contracts';

import { HouseholdBillingService } from '../../modules/auth/household/household-billing/household-billing.service';
import { isLaunchProductsDeferred } from '../config/launch-products.util';
import { currentHouseholdId } from '../household/household.context';

/** Shared plan access checks for services (limits + capability). */
@Injectable()
export class PlanAccessService {
    constructor(
        @Inject(HouseholdBillingService) private readonly billing: HouseholdBillingService
    ) {}

    async planKeyForCurrentHousehold(): Promise<PlanKey> {
        return this.billing.getPlanKey(currentHouseholdId());
    }

    async assertCapability(capabilityKey: CapabilityKey): Promise<void> {
        if (isLaunchProductsDeferred() && isCapabilityDeferredAtLaunch(capabilityKey)) {
            throw apiForbidden('capability_unavailable');
        }
        const planKey = await this.planKeyForCurrentHousehold();
        if (!hasCapability(capabilityKey, planKey)) {
            throw apiForbidden('plan_missing_capability');
        }
    }

    async assertWithinLimit(limitKey: PlanLimitKey, occupied: number): Promise<void> {
        const planKey = await this.planKeyForCurrentHousehold();
        if (!withinLimit(planKey, limitKey, occupied)) {
            throw apiForbidden('plan_limit_reached');
        }
    }
}
