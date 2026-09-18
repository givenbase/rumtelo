import { PLAN_CAPABILITIES, contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { ControllerSwagger } from '../../../common/decorators/controller-swagger.decorators';
import { PlanService } from './plan.service';

/** Read-only plan catalog for Settings / comparison. */
@ControllerSwagger('plans', 'public')
export class PlanController {
    constructor(@Inject(PlanService) private readonly plans: PlanService) {}

    @Implement(contract.plans.list)
    list() {
        return implement(contract.plans.list).handler(async () => {
            const rows = await this.plans.listActive();
            return rows.map(plan => ({
                key: plan.key,
                name: plan.name,
                priceMonthly: plan.priceMonthly,
                // Limits + capability keys are contracts truth; the DB mirrors only the grant graph.
                capabilities: PLAN_CAPABILITIES[plan.key],
                sortOrder: plan.sortOrder,
                isActive: plan.isActive,
            }));
        });
    }
}
