/**
 * Goal Contract
 * oRPC procedures for goal CRUD and projections.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { HouseholdId, HouseholdScoped, Id } from '../../../../common/common.schema';
import { Goal, GoalProjection } from './goal.schema';

const ok = z.object({ ok: z.literal(true) });

// ====================================================================
// ? CREATE Operations
// ====================================================================

export const goalCreate = oc
    .input(Goal.omit({ id: true, saved: true, fulfilledOn: true, sortOrder: true }))
    .output(Goal);

// ====================================================================
// ? READ Operations
// ====================================================================

export const goalList = oc.input(HouseholdScoped).output(z.array(Goal));

export const goalProjections = oc.input(HouseholdScoped).output(z.array(GoalProjection));

// ====================================================================
// ? UPDATE Operations
// ====================================================================

export const goalUpdate = oc
    .input(Goal.partial().extend({ id: Id, householdId: HouseholdId }))
    .output(Goal);

/** Make this SAVE goal #1 focus on its jar; reindex siblings. */
export const goalSetFocus = oc.input(z.object({ householdId: HouseholdId, id: Id })).output(Goal);

/**
 * Mark a SAVE goal achieved.
 * `spend`: book an Out from its jar for the target; otherwise cash stays available.
 */
export const goalAchieve = oc
    .input(
        z.object({
            householdId: HouseholdId,
            id: Id,
            mode: z.enum(['keep', 'spend']),
        })
    )
    .output(Goal);

// ====================================================================
// ? DELETE Operations
// ====================================================================

export const goalRemove = oc.input(z.object({ householdId: HouseholdId, id: Id })).output(ok);

/** Nested contract object mounted at `contract.money.goals`. */
export const goalContract = {
    list: goalList,
    create: goalCreate,
    update: goalUpdate,
    setFocus: goalSetFocus,
    achieve: goalAchieve,
    remove: goalRemove,
    projections: goalProjections,
};
