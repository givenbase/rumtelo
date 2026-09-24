import { CAPABILITIES, contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { RequireCapability } from '../../../../../../common/capability';
import { ControllerSwagger } from '../../../../../../common/decorators/controller-swagger.decorators';
import { BankSyncService } from './bank-sync.service';

/** Transport only. Handler order is always CRUD. */
@ControllerSwagger('money/bank-sync', 'public')
export class BankSyncController {
    constructor(@Inject(BankSyncService) private readonly bankSync: BankSyncService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    @RequireCapability(CAPABILITIES.moneyBank)
    @Implement(contract.money.bankSync.startLink)
    startLink() {
        return implement(contract.money.bankSync.startLink).handler(({ input }) =>
            this.bankSync.startLink({
                bankAccountId: input.bankAccountId,
                institutionId: input.institutionId,
            })
        );
    }

    @RequireCapability(CAPABILITIES.moneyBank)
    @Implement(contract.money.bankSync.completeLink)
    completeLink() {
        return implement(contract.money.bankSync.completeLink).handler(({ input }) =>
            this.bankSync.completeLink({ code: input.code, state: input.state })
        );
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    @Implement(contract.money.bankSync.status)
    status() {
        return implement(contract.money.bankSync.status).handler(() => this.bankSync.status());
    }

    @Implement(contract.money.bankSync.listInstitutions)
    listInstitutions() {
        return implement(contract.money.bankSync.listInstitutions).handler(({ input }) =>
            this.bankSync.listInstitutions(input.country)
        );
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    @RequireCapability(CAPABILITIES.moneyBank)
    @Implement(contract.money.bankSync.syncNow)
    syncNow() {
        return implement(contract.money.bankSync.syncNow).handler(({ input }) =>
            this.bankSync.syncNow(input.bankAccountId)
        );
    }

    /** Soft pull for Money surfaces — no capability gate so any member refreshes Inbox. */
    @Implement(contract.money.bankSync.syncStale)
    syncStale() {
        return implement(contract.money.bankSync.syncStale).handler(() =>
            this.bankSync.syncStale()
        );
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    @RequireCapability(CAPABILITIES.moneyBank)
    @Implement(contract.money.bankSync.disconnect)
    disconnect() {
        return implement(contract.money.bankSync.disconnect).handler(({ input }) =>
            this.bankSync.disconnect(input.bankAccountId)
        );
    }
}
