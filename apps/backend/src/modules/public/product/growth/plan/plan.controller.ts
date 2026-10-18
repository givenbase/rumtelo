import { CAPABILITIES, contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { RequireCapability } from '../../../../../common/capability';
import { ControllerSwagger } from '../../../../../common/decorators/controller-swagger.decorators';
import { PlanService } from './plan.service';

/** Implements `contract.growth.plan`. Transport only; handler order is always CRUD. */
@ControllerSwagger('growth/plan', 'public')
@RequireCapability(CAPABILITIES.growthPlan)
export class PlanController {
    constructor(@Inject(PlanService) private readonly plans: PlanService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** New item in a slot (max 3). */
    @Implement(contract.growth.plan.create)
    create() {
        return implement(contract.growth.plan.create).handler(({ input }) =>
            this.plans.create(input)
        );
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** One period with its "why" chain and the layer below. */
    @Implement(contract.growth.plan.period)
    period() {
        return implement(contract.growth.plan.period).handler(({ input }) =>
            this.plans.period(input)
        );
    }

    /** Year, quarter and month items of one year. */
    @Implement(contract.growth.plan.year)
    year() {
        return implement(contract.growth.plan.year).handler(({ input }) =>
            this.plans.year(input.year)
        );
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /** Edit, re-parent, reorder or change visibility. */
    @Implement(contract.growth.plan.update)
    update() {
        return implement(contract.growth.plan.update).handler(({ input }) =>
            this.plans.update(input)
        );
    }

    /** Review status and note. */
    @Implement(contract.growth.plan.updateStatus)
    updateStatus() {
        return implement(contract.growth.plan.updateStatus).handler(({ input }) =>
            this.plans.updateStatus(input)
        );
    }

    /** Carry an unfinished item into the next period. */
    @Implement(contract.growth.plan.carry)
    carry() {
        return implement(contract.growth.plan.carry).handler(({ input }) =>
            this.plans.carry(input.id)
        );
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    /** Delete; children become loose. */
    @Implement(contract.growth.plan.remove)
    remove() {
        return implement(contract.growth.plan.remove).handler(({ input }) =>
            this.plans.remove(input.id)
        );
    }
}
