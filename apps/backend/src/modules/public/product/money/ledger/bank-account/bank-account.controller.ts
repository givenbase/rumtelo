import { CAPABILITIES, contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { RequireCapability } from '../../../../../../common/capability';
import { ControllerSwagger } from '../../../../../../common/decorators/controller-swagger.decorators';
import { BankAccountService } from './bank-account.service';

/** Transport only. Handler order is always CRUD. */
@ControllerSwagger('money/accounts', 'public')
export class BankAccountController {
    constructor(@Inject(BankAccountService) private readonly accounts: BankAccountService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** Register a new bank account for this household. */
    @RequireCapability(CAPABILITIES.moneyBank)
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
    @RequireCapability(CAPABILITIES.moneyBank)
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
    @RequireCapability(CAPABILITIES.moneyBank)
    @Implement(contract.money.accounts.remove)
    remove() {
        return implement(contract.money.accounts.remove).handler(({ input }) =>
            this.accounts.remove(input.id)
        );
    }
}
