import { contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { ControllerSwagger } from '../../../../../../common/decorators/controller-swagger.decorators';
import { RuleService } from './rule.service';

/** Transport only. Handler order is always CRUD. */
@ControllerSwagger('money/rules', 'public')
export class RuleController {
    constructor(@Inject(RuleService) private readonly rules: RuleService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** Persist a new auto-sort rule. */
    @Implement(contract.money.rules.create)
    create() {
        return implement(contract.money.rules.create).handler(({ input }) =>
            this.rules.create({
                field: input.field,
                matcher: input.matcher,
                value: input.value,
                jarId: input.jarId,
                categoryId: input.categoryId,
                priority: input.priority,
                isActive: input.isActive,
            })
        );
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** Return all rules ordered by priority. */
    @Implement(contract.money.rules.list)
    list() {
        return implement(contract.money.rules.list).handler(() => this.rules.list());
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /** Update mutable fields on a rule. */
    @Implement(contract.money.rules.update)
    update() {
        return implement(contract.money.rules.update).handler(({ input }) => {
            const { id, ...patch } = input;
            return this.rules.update(id, patch);
        });
    }

    /** Re-run all isActive rules over the current inbox. */
    @Implement(contract.money.rules.replay)
    replay() {
        return implement(contract.money.rules.replay).handler(() => this.rules.replay());
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    /** Permanently delete a rule. */
    @Implement(contract.money.rules.remove)
    remove() {
        return implement(contract.money.rules.remove).handler(({ input }) =>
            this.rules.remove(input.id)
        );
    }
}
