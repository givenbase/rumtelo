import { contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { ControllerSwagger } from '../../../../../../common/decorators/controller-swagger.decorators';
import { BankAccountService } from './bank-account.service';

/**
 * Manual bank seats (checking/savings/cash) — available on every plan.
 * Live Open Banking (PSD2) stays behind `money-bank` on bank-sync.
 */
@ControllerSwagger('money/accounts', 'public')
export class BankAccountController {
    constructor(@Inject(BankAccountService) private readonly accounts: BankAccountService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** Register a new bank account for this household. */
    @Implement(contract.money.accounts.create)
    create() {
        return implement(contract.money.accounts.create).handler(({ input }) =>
            this.accounts.create(input)
        );
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** Return all accounts belonging to the current household. */
    @Implement(contract.money.accounts.list)
    list() {
        return implement(contract.money.accounts.list).handler(() => this.accounts.list());
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /** Update a manual account label, IBAN, or kind. */
    @Implement(contract.money.accounts.update)
    update() {
        return implement(contract.money.accounts.update).handler(({ input }) =>
            this.accounts.update(input)
        );
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    /** Remove a manual account. */
    @Implement(contract.money.accounts.remove)
    remove() {
        return implement(contract.money.accounts.remove).handler(({ input }) =>
            this.accounts.remove(input.id)
        );
    }
}
