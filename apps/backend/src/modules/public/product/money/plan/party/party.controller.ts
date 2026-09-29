import { contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { ControllerSwagger } from '../../../../../../common/decorators/controller-swagger.decorators';
import { PartyService } from './party.service';

/** Transport only. Handler order is always CRUD. */
@ControllerSwagger('money/parties', 'public')
export class PartyController {
    constructor(@Inject(PartyService) private readonly parties: PartyService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** Save a party by hand (the forms usually do it via `saveParty`). */
    @Implement(contract.money.parties.create)
    create() {
        return implement(contract.money.parties.create).handler(({ input }) => {
            const { householdId: _householdId, ...data } = input;
            return this.parties.create(data);
        });
    }

    /** Nominate a party for the Rumtelo catalog. */
    @Implement(contract.money.parties.suggest)
    suggest() {
        return implement(contract.money.parties.suggest).handler(({ input }) =>
            this.parties.suggest(input.partyId)
        );
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** All saved parties with usage counts. */
    @Implement(contract.money.parties.list)
    list() {
        return implement(contract.money.parties.list).handler(() => this.parties.list());
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /** Edit name / note / aliases / styling. */
    @Implement(contract.money.parties.update)
    update() {
        return implement(contract.money.parties.update).handler(({ input }) => {
            const { id, householdId: _householdId, ...patch } = input;
            return this.parties.update(id, patch);
        });
    }

    /** Merge duplicates. */
    @Implement(contract.money.parties.merge)
    merge() {
        return implement(contract.money.parties.merge).handler(({ input }) =>
            this.parties.merge(input.fromId, input.intoId)
        );
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    /** Remove a party; linked rows keep their name text. */
    @Implement(contract.money.parties.remove)
    remove() {
        return implement(contract.money.parties.remove).handler(({ input }) =>
            this.parties.remove(input.id)
        );
    }
}
