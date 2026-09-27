import { CAPABILITIES, contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { RequireCapability } from '../../../common/capability';
import { ControllerSwagger } from '../../../common/decorators/controller-swagger.decorators';
import { PracticeService } from '../../public/platform/practice/practice.service';
import { HouseholdService } from './household.service';

/**
 * Implements `contract.household.*` including Practice dual-consent practiceLinks.
 * Settings handlers live in `household-settings/`. Transport only.
 */
@ControllerSwagger('household', 'public')
export class HouseholdController {
    constructor(
        @Inject(HouseholdService) private readonly households: HouseholdService,
        @Inject(PracticeService) private readonly practice: PracticeService
    ) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** Provision a new household and seed jars + settings. */
    @Implement(contract.household.onboard)
    onboard() {
        return implement(contract.household.onboard).handler(({ input }) =>
            this.households.onboard(input)
        );
    }

    /** Send a membership invitation to an e-mail address. */
    @RequireCapability(CAPABILITIES.platformInvite)
    @Implement(contract.household.invite)
    invite() {
        return implement(contract.household.invite).handler(({ input }) =>
            this.households.invite(input.householdId, input.email, input.role)
        );
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** List all households the current user belongs to. */
    @Implement(contract.household.list)
    list() {
        return implement(contract.household.list).handler(() => this.households.listHouseholds());
    }

    /** List members of a household. */
    @Implement(contract.household.members)
    members() {
        return implement(contract.household.members).handler(({ input }) =>
            this.households.members(input.householdId)
        );
    }

    /** Return the active household summary. */
    @Implement(contract.household.current)
    current() {
        return implement(contract.household.current).handler(({ input }) =>
            this.households.current(input.householdId)
        );
    }

    /** Practice contracts pending / active for this household. */
    @Implement(contract.household.practiceLinks.list)
    practiceLinksList() {
        return implement(contract.household.practiceLinks.list).handler(({ input }) =>
            this.practice.listHouseholdPracticeLinks(input.householdId)
        );
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /** Accept a Practice invite (OWNER/ADMIN) → ACTIVE dual consent. */
    @Implement(contract.household.practiceLinks.accept)
    practiceLinksAccept() {
        return implement(contract.household.practiceLinks.accept).handler(({ input }) =>
            this.practice.acceptHouseholdPracticeLink(input.householdId, input.linkId)
        );
    }

    /** Decline a pending Practice invite. */
    @Implement(contract.household.practiceLinks.reject)
    practiceLinksReject() {
        return implement(contract.household.practiceLinks.reject).handler(({ input }) =>
            this.practice.rejectHouseholdPracticeLink(input.householdId, input.linkId)
        );
    }

    /** Unlink an ACTIVE Practice contract. */
    @Implement(contract.household.practiceLinks.unlink)
    practiceLinksUnlink() {
        return implement(contract.household.practiceLinks.unlink).handler(({ input }) =>
            this.practice.unlinkHouseholdPracticeLink(input.householdId, input.linkId)
        );
    }
}
