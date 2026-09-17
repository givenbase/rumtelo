import { CAPABILITIES, contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { RequireCapability } from '../../../../../../common/capability';
import { ControllerSwagger } from '../../../../../../common/decorators/controller-swagger.decorators';
import { DebtService } from './debt.service';

/** Transport only. Handler order is always CRUD. */
@RequireCapability(CAPABILITIES.moneyDebt)
@ControllerSwagger('money/debts', 'public')
export class DebtController {
    constructor(@Inject(DebtService) private readonly debts: DebtService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** Register a new debt for tracking. */
    @Implement(contract.money.debts.create)
    create() {
        return implement(contract.money.debts.create).handler(({ input }) => {
            const { linkFixedCost, ...rest } = input;
            return this.debts.create({ ...rest, linkFixedCost });
        });
    }

    /** Log a payment (OUT transaction) and reduce the balance. */
    @Implement(contract.money.debts.recordPayment)
    recordPayment() {
        return implement(contract.money.debts.recordPayment).handler(({ input }) =>
            this.debts.recordPayment({
                debtId: input.debtId,
                amount: input.amount,
                bookedOn: input.bookedOn,
                note: input.note,
            })
        );
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** List all open debts for the current household. */
    @Implement(contract.money.debts.list)
    list() {
        return implement(contract.money.debts.list).handler(() => this.debts.list());
    }

    /** Debt detail: progress, payment log, linked fixed cost. */
    @Implement(contract.money.debts.get)
    get() {
        return implement(contract.money.debts.get).handler(({ input }) => this.debts.get(input.id));
    }

    /** Return a payoff plan for the chosen strategy. */
    @Implement(contract.money.debts.plan)
    plan() {
        return implement(contract.money.debts.plan).handler(({ input }) =>
            this.debts.plan(input.strategy ?? null)
        );
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /** Patch mutable fields on a debt record. */
    @Implement(contract.money.debts.update)
    update() {
        return implement(contract.money.debts.update).handler(({ input }) => {
            const { id, linkFixedCost, ...patch } = input;
            return this.debts.update(id, { ...patch, linkFixedCost });
        });
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    /** Remove a debt record. */
    @Implement(contract.money.debts.remove)
    remove() {
        return implement(contract.money.debts.remove).handler(({ input }) =>
            this.debts.remove(input.id)
        );
    }
}
