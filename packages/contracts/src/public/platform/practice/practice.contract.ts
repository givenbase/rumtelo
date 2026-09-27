/**
 * Practice Contracts
 * B2B control-plane oRPC — Nest implements these under public/platform/practice.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { Id } from '../../../common/common.schema';
import {
    Practice,
    PracticeAddClientInput,
    PracticeBillingStatus,
    PracticeClientLink,
    PracticeClientPortalSnapshot,
    PracticeCreateInput,
    PracticeDetail,
    PracticeInviteMemberInput,
    PracticeMember,
    PracticeUpdateInput,
} from './practice.schema';

// ====================================================================
// ? CREATE Operations
// ====================================================================

export const practiceCreate = oc.input(PracticeCreateInput).output(PracticeDetail);

export const practiceInviteMember = oc.input(PracticeInviteMemberInput).output(PracticeMember);

export const practiceAddClient = oc.input(PracticeAddClientInput).output(PracticeClientLink);

// ====================================================================
// ? READ Operations
// ====================================================================

export const practiceList = oc.output(z.array(Practice));

export const practiceGet = oc.input(z.object({ practiceId: Id })).output(PracticeDetail);

export const practiceMembers = oc
    .input(z.object({ practiceId: Id }))
    .output(z.array(PracticeMember));

export const practiceClients = oc
    .input(z.object({ practiceId: Id }))
    .output(z.array(PracticeClientLink));

export const practiceBillingStatus = oc
    .input(z.object({ practiceId: Id }))
    .output(PracticeBillingStatus);

/** Portal metrics for an ACTIVE client link — server composes dashboards. */
export const practiceClientPortalSnapshot = oc
    .input(z.object({ practiceId: Id, linkId: Id }))
    .output(PracticeClientPortalSnapshot);

// ====================================================================
// ? UPDATE Operations
// ====================================================================

export const practiceUpdate = oc.input(PracticeUpdateInput).output(PracticeDetail);

export const practiceRevokeClient = oc
    .input(z.object({ practiceId: Id, linkId: Id }))
    .output(PracticeClientLink);

/** Nested contract object mounted at `contract.practice`. */
export const practiceContract = {
    create: practiceCreate,
    list: practiceList,
    get: practiceGet,
    update: practiceUpdate,
    inviteMember: practiceInviteMember,
    members: practiceMembers,
    addClient: practiceAddClient,
    clients: practiceClients,
    clientPortalSnapshot: practiceClientPortalSnapshot,
    revokeClient: practiceRevokeClient,
    billingStatus: practiceBillingStatus,
};
