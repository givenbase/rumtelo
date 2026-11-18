/**
 * Household Contracts
 * oRPC procedures for households, members, settings, onboard, invite,
 * and Practice dual-consent middle-contract accept/reject.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { AuthId, HouseholdId, HouseholdScoped, MemberId } from '../../../common/common.schema';
import { HouseholdRelation, HouseholdRole } from '../enums';
import { HouseholdPracticeLink, HouseholdPracticeLinkInput } from '../practice/practice.schema';
import {
    Household,
    HouseholdMember,
    HouseholdSeatUsage,
    HouseholdSettings,
    HouseholdSettingsPatch,
    OnboardingInput,
    OnboardingSplitPreview,
    OnboardingSplitPreviewInput,
} from './household.schema';

// ====================================================================
// ? CREATE Operations
// ====================================================================

/**
 * Provision a household in one call: organization, six jars, settings, the
 * creator's account settings, income (when > 0) and one "Main account" with
 * every jar placed on it.
 */
export const householdOnboard = oc.input(OnboardingInput).output(Household);

export const householdInvite = oc
    .input(
        z.object({
            householdId: HouseholdId,
            email: z.email(),
            /** Invitees only — never OWNER. */
            role: z.enum([HouseholdRole.MEMBER, HouseholdRole.VIEWER]),
            relation: z.enum(HouseholdRelation),
        })
    )
    .output(z.object({ invitationId: AuthId }));

// ====================================================================
// ? READ Operations
// ====================================================================

/**
 * Split preview for onboarding: income into six jars in minor units. Needs a
 * signed-in session but no household; nothing is written.
 */
export const householdPreviewSplit = oc
    .input(OnboardingSplitPreviewInput)
    .output(OnboardingSplitPreview);

export const householdList = oc.output(z.array(Household));

export const householdCurrent = oc.input(z.object({ householdId: HouseholdId })).output(Household);

export const householdMembers = oc.input(HouseholdScoped).output(z.array(HouseholdMember));

/**
 * Seat usage for invite UIs (week-1 checklist, members settings): members plus pending,
 * unexpired invitations against the plan's effective caps. OWNER and MEMBER only.
 */
export const householdSeats = oc.input(HouseholdScoped).output(HouseholdSeatUsage);

export const householdSettings = oc.input(HouseholdScoped).output(HouseholdSettings);

/** Practice contracts for this household (INVITED + ACTIVE; not REVOKED). */
export const householdPracticeLinksList = oc
    .input(HouseholdScoped)
    .output(z.array(HouseholdPracticeLink));

// ====================================================================
// ? UPDATE Operations
// ====================================================================

export const householdUpdateSettings = oc.input(HouseholdSettingsPatch).output(HouseholdSettings);

/** Household OWNER accepts a Practice invite → ACTIVE + timestamps. */
export const householdPracticeLinksAccept = oc
    .input(HouseholdPracticeLinkInput)
    .output(HouseholdPracticeLink);

/** Household OWNER declines a pending Practice invite. */
export const householdPracticeLinksReject = oc
    .input(HouseholdPracticeLinkInput)
    .output(HouseholdPracticeLink);

/** Household OWNER unlinks an ACTIVE Practice contract. */
export const householdPracticeLinksUnlink = oc
    .input(HouseholdPracticeLinkInput)
    .output(HouseholdPracticeLink);

// ====================================================================
// ? DELETE Operations
// ====================================================================

/** Owner removes a MEMBER or VIEWER seat (not the owner). */
export const householdRemoveMember = oc
    .input(
        z.object({
            householdId: HouseholdId,
            memberId: MemberId,
        })
    )
    .output(z.object({ ok: z.literal(true) }));

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
    seats: householdSeats,
    settings: householdSettings,
    updateSettings: householdUpdateSettings,
    onboard: householdOnboard,
    previewSplit: householdPreviewSplit,
    invite: householdInvite,
    removeMember: householdRemoveMember,
    practiceLinks: householdPracticeLinksContract,
};
