import { contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { ControllerSwagger } from '../../../../common/decorators/controller-swagger.decorators';
import { PracticeService } from './practice.service';

/** Transport only. Handler order is always CRUD. */
@ControllerSwagger('practice', 'public')
export class PracticeController {
    constructor(@Inject(PracticeService) private readonly practice: PracticeService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    @Implement(contract.practice.create)
    create() {
        return implement(contract.practice.create).handler(({ input }) =>
            this.practice.create(input)
        );
    }

    @Implement(contract.practice.inviteMember)
    inviteMember() {
        return implement(contract.practice.inviteMember).handler(({ input }) =>
            this.practice.inviteMember(input)
        );
    }

    @Implement(contract.practice.addClient)
    addClient() {
        return implement(contract.practice.addClient).handler(({ input }) =>
            this.practice.addClient(input)
        );
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    @Implement(contract.practice.list)
    list() {
        return implement(contract.practice.list).handler(() => this.practice.list());
    }

    @Implement(contract.practice.get)
    get() {
        return implement(contract.practice.get).handler(({ input }) =>
            this.practice.get(input.practiceId)
        );
    }

    @Implement(contract.practice.members)
    members() {
        return implement(contract.practice.members).handler(({ input }) =>
            this.practice.members(input.practiceId)
        );
    }

    @Implement(contract.practice.clients)
    clients() {
        return implement(contract.practice.clients).handler(({ input }) =>
            this.practice.clients(input.practiceId)
        );
    }

    @Implement(contract.practice.clientPortalSnapshot)
    clientPortalSnapshot() {
        return implement(contract.practice.clientPortalSnapshot).handler(({ input }) =>
            this.practice.clientPortalSnapshot(input.practiceId, input.linkId)
        );
    }

    @Implement(contract.practice.billingStatus)
    billingStatus() {
        return implement(contract.practice.billingStatus).handler(({ input }) =>
            this.practice.billingStatus(input.practiceId)
        );
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    @Implement(contract.practice.update)
    update() {
        return implement(contract.practice.update).handler(({ input }) =>
            this.practice.update(input)
        );
    }

    @Implement(contract.practice.revokeClient)
    revokeClient() {
        return implement(contract.practice.revokeClient).handler(({ input }) =>
            this.practice.revokeClient(input.practiceId, input.linkId)
        );
    }
}
