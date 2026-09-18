import { CAPABILITIES, contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { RequireCapability } from '../../../../../../common/capability';
import { ControllerSwagger } from '../../../../../../common/decorators/controller-swagger.decorators';
import { AccountService } from './account.service';

/** Transport only. Handler order is always CRUD. */
@ControllerSwagger('money/accounts', 'public')
export class AccountController {
    constructor(@Inject(AccountService) private readonly accounts: AccountService) {}

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
}
