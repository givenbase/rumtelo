import { CAPABILITIES, contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { RequireCapability } from '../../../../../../common/capability';
import { ControllerSwagger } from '../../../../../../common/decorators/controller-swagger.decorators';
import { GoalService } from './goal.service';

/** Transport only. Handler order is always CRUD. */
@RequireCapability(CAPABILITIES.growthGoals)
@ControllerSwagger('money/goals', 'public')
export class GoalController {
    constructor(@Inject(GoalService) private readonly goals: GoalService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** Create a new savings goal. */
    @Implement(contract.money.goals.create)
    create() {
        return implement(contract.money.goals.create).handler(({ input }) =>
            this.goals.create({
                kind: input.kind,
                jarId: input.jarId,
                name: input.name,
                icon: input.icon,
                target: input.target,
                monthlyContribution: input.monthlyContribution,
                targetOn: input.targetOn,
                status: input.status,
                why: input.why,
                cause: input.cause,
                givingOrganisationKey: input.givingOrganisationKey,
            })
        );
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** Return all active goals. */
    @Implement(contract.money.goals.list)
    list() {
        return implement(contract.money.goals.list).handler(() => this.goals.list());
    }

    /** Straight-line projections for each active goal. */
    @Implement(contract.money.goals.projections)
    projections() {
        return implement(contract.money.goals.projections).handler(() => this.goals.projections());
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /** Patch mutable fields on a goal. */
    @Implement(contract.money.goals.update)
    update() {
        return implement(contract.money.goals.update).handler(({ input }) => {
            const { id, ...patch } = input;
            return this.goals.update(id, patch);
        });
    }

    /** Make this SAVE goal the #1 focus on its jar. */
    @Implement(contract.money.goals.setFocus)
    setFocus() {
        return implement(contract.money.goals.setFocus).handler(({ input }) =>
            this.goals.setFocus(input.id)
        );
    }

    /** Mark a SAVE goal achieved — keep cash in jar or spend it out. */
    @Implement(contract.money.goals.achieve)
    achieve() {
        return implement(contract.money.goals.achieve).handler(({ input }) =>
            this.goals.achieve(input.id, input.mode)
        );
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    /** Remove a goal. */
    @Implement(contract.money.goals.remove)
    remove() {
        return implement(contract.money.goals.remove).handler(({ input }) =>
            this.goals.remove(input.id)
        );
    }
}
