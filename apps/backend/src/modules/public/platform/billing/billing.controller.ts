import { contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { ControllerSwagger } from '../../../../common/decorators/controller-swagger.decorators';
import { BillingService } from './billing.service';

/** Transport only — Stripe Checkout + period-end downgrades. */
@ControllerSwagger('billing', 'public')
export class BillingController {
    constructor(@Inject(BillingService) private readonly billing: BillingService) {}

    @Implement(contract.billing.status)
    status() {
        return implement(contract.billing.status).handler(({ input }) =>
            this.billing.status(input.householdId)
        );
    }

    @Implement(contract.billing.createCheckoutSession)
    createCheckoutSession() {
        return implement(contract.billing.createCheckoutSession).handler(({ input }) =>
            this.billing.createCheckoutSession({
                householdId: input.householdId,
                planKey: input.planKey,
                interval: input.interval,
            })
        );
    }

    @Implement(contract.billing.schedulePlanChange)
    schedulePlanChange() {
        return implement(contract.billing.schedulePlanChange).handler(({ input }) =>
            this.billing.schedulePlanChange({
                householdId: input.householdId,
                planKey: input.planKey,
            })
        );
    }

    @Implement(contract.billing.createPortalSession)
    createPortalSession() {
        return implement(contract.billing.createPortalSession).handler(({ input }) =>
            this.billing.createPortalSession(input.householdId)
        );
    }

    @Implement(contract.billing.updateSeatAddons)
    updateSeatAddons() {
        return implement(contract.billing.updateSeatAddons).handler(({ input }) =>
            this.billing.updateSeatAddons({
                householdId: input.householdId,
                extras: input.extras,
                focusKind: input.focusKind,
            })
        );
    }
}
