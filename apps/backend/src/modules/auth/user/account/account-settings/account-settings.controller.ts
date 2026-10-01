import { contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { ControllerSwagger } from '../../../../../common/decorators/controller-swagger.decorators';
import { AccountSettingsService } from './account-settings.service';

/**
 * Account Settings Controller
 *
 * Implements oRPC contracts for account settings. Controllers stay thin —
 * validate via the contract, delegate to the service, return the result.
 *
 * Handler order is always CRUD: Create → Read → Update → Delete.
 */
@ControllerSwagger('account/settings', 'auth')
export class AccountSettingsController {
    constructor(
        @Inject(AccountSettingsService) private readonly settings: AccountSettingsService
    ) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** Create settings for the current user (fails if they already exist). */
    @Implement(contract.account.createSettings)
    create() {
        return implement(contract.account.createSettings).handler(({ input }) =>
            this.settings.create(input)
        );
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** Current user's account settings (lazy-creates defaults). */
    @Implement(contract.account.settings)
    get() {
        return implement(contract.account.settings).handler(() => this.settings.get());
    }

    /** Proxy / boot gate — leave `/onboarding` only when ready. */
    @Implement(contract.account.boardReady)
    boardReady() {
        return implement(contract.account.boardReady).handler(() => this.settings.boardReady());
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /** Patch current user's language / theme. */
    @Implement(contract.account.updateSettings)
    update() {
        return implement(contract.account.updateSettings).handler(({ input }) =>
            this.settings.update(input)
        );
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    /** Delete settings by id. */
    @Implement(contract.account.deleteSettings)
    delete() {
        return implement(contract.account.deleteSettings).handler(({ input }) =>
            this.settings.delete(input.id)
        );
    }
}
