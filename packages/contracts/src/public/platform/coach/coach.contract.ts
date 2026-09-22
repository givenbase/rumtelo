/**
 * Coach Contracts
 * Feed + dismiss for tip inbox; session for the smart fill queue.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { HouseholdId, HouseholdScoped, Id, PeriodKey } from '../../../common/common.schema';
import { CoachMessage } from './coach.schema';
import { CoachSession } from './coach.session.schema';

// ====================================================================
// ? READ Operations
// ====================================================================

export const coachFeed = oc
    .input(HouseholdScoped.extend({ period: PeriodKey.nullish() }))
    .output(z.array(CoachMessage));

/** Smart fill queue — what is missing this week / period, one question at a time. */
export const coachSession = oc.input(HouseholdScoped).output(CoachSession);

// ====================================================================
// ? UPDATE Operations
// ====================================================================

export const coachDismiss = oc
    .input(z.object({ householdId: HouseholdId, id: Id }))
    .output(z.object({ ok: z.literal(true) }));

/** Nested contract object mounted at `contract.coach`. */
export const coachContract = {
    feed: coachFeed,
    session: coachSession,
    dismiss: coachDismiss,
};
