/**
 * Household Contracts
 * oRPC procedures for households, members, settings, onboard, invite,
 * and Practice dual-consent middle-contract accept/reject.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { AuthId, HouseholdId, HouseholdScoped } from '../../../common/common.schema';
import { HouseholdRole } from '../enums';
import { HouseholdPracticeLink, HouseholdPracticeLinkInput } from '../practice/practice.schema';
import {
    Household,
    HouseholdMember,
    HouseholdSettings,
    HouseholdSettingsPatch,
    OnboardingInput,
} from './household.schema';

// ====================================================================
// ? CREATE Operations
// ====================================================================

export const householdOnboard = oc.input(OnboardingInput).output(Household);

export const householdInvite = oc
    .input(
        z.object({
            householdId: HouseholdId,
            email: z.email(),
            role: z.enum(HouseholdRole),
        })
    )
    .output(z.object({ invitationId: AuthId }));

// ====================================================================
// ? READ Operations
// ====================================================================

export const householdList = oc.output(z.array(Household));

export const householdCurrent = oc.input(z.object({ householdId: HouseholdId })).output(Household);

export const householdMembers = oc.input(HouseholdScoped).output(z.array(HouseholdMember));

export const householdSettings = oc.input(HouseholdScoped).output(HouseholdSettings);

/** Practice contracts for this household (INVITED + ACTIVE; not REVOKED). */
export const householdPracticeLinksList = oc
    .input(HouseholdScoped)
    .output(z.array(HouseholdPracticeLink));

// ====================================================================
// ? UPDATE Operations
// ====================================================================

export const householdUpdateSettings = oc.input(HouseholdSettingsPatch).output(HouseholdSettings);

/** Household OWNER/ADMIN accepts a Practice invite → ACTIVE + timestamps. */
export const householdPracticeLinksAccept = oc
    .input(HouseholdPracticeLinkInput)
    .output(HouseholdPracticeLink);

/** Household OWNER/ADMIN declines a pending Practice invite. */
export const householdPracticeLinksReject = oc
    .input(HouseholdPracticeLinkInput)
    .output(HouseholdPracticeLink);

/** Household OWNER/ADMIN unlinks an ACTIVE Practice contract. */
export const householdPracticeLinksUnlink = oc
    .input(HouseholdPracticeLinkInput)
    .output(HouseholdPracticeLink);

/** Nested Practice dual-consent APIs under `contract.household.practiceLinks`. */
export const householdPracticeLinksContract = {
    list: householdPracticeLinksList,
    accept: householdPracticeLinksAccept,
    reject: householdPracticeLinksReject,
    unlink: householdPracticeLinksUnlink,
};

/** Nested contract object mounted at `contract.household`. */
export const householdContract = {
    list: householdList,
    current: householdCurrent,
    members: householdMembers,
    settings: householdSettings,
    updateSettings: householdUpdateSettings,
    onboard: householdOnboard,
    invite: householdInvite,
    practiceLinks: householdPracticeLinksContract,
};
