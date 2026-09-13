import { contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { ControllerSwagger } from '../../../../../../common/decorators/controller-swagger.decorators';
import { FixedCostService } from './fixed-cost.service';

/** Transport only. Handler order is always CRUD. */
@ControllerSwagger('money/fixed-costs', 'public')
export class FixedCostController {
    constructor(@Inject(FixedCostService) private readonly fixedCosts: FixedCostService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** Add a new recurring fixed cost. */
    @Implement(contract.money.fixedCosts.create)
    create() {
        return implement(contract.money.fixedCosts.create).handler(({ input }) =>
            this.fixedCosts.create({
                jarId: input.jarId,
                categoryId: input.categoryId,
                name: input.name,
                counterparty: input.counterparty,
                amount: input.amount,
                cadence: input.cadence,
                dueDay: input.dueDay,
                direction: input.direction,
                isActive: input.isActive,
                endsOn: input.endsOn,
                note: input.note,
            })
        );
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** List fixed costs, optionally filtered by direction. */
    @Implement(contract.money.fixedCosts.list)
    list() {
        return implement(contract.money.fixedCosts.list).handler(({ input }) =>
            this.fixedCosts.list(input.direction)
        );
    }

    /** Fixed costs grouped by jar. */
    @Implement(contract.money.fixedCosts.byJar)
    byJar() {
        return implement(contract.money.fixedCosts.byJar).handler(() => this.fixedCosts.byJar());
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /** Patch mutable fields on a fixed cost. */
    @Implement(contract.money.fixedCosts.update)
    update() {
        return implement(contract.money.fixedCosts.update).handler(({ input }) => {
            const { id, ...patch } = input;
            return this.fixedCosts.update(id, patch);
        });
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    /** Delete a fixed cost. */
    @Implement(contract.money.fixedCosts.remove)
    remove() {
        return implement(contract.money.fixedCosts.remove).handler(({ input }) =>
            this.fixedCosts.remove(input.id)
        );
    }
}
