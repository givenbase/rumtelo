/**
 * Rule Contract
 * oRPC procedures for auto-sort rule CRUD and inbox replay.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { HouseholdId, HouseholdScoped, Id } from '../../../../common/common.schema';
import { Rule } from './rule.schema';

const ok = z.object({ ok: z.literal(true) });

// ====================================================================
// ? CREATE Operations
// ====================================================================

export const ruleCreate = oc.input(Rule.omit({ id: true, hitCount: true })).output(Rule);

// ====================================================================
// ? READ Operations
// ====================================================================

export const ruleList = oc.input(HouseholdScoped).output(z.array(Rule));

// ====================================================================
// ? UPDATE Operations
// ====================================================================

export const ruleUpdate = oc
    .input(Rule.partial().extend({ id: Id, householdId: HouseholdId }))
    .output(Rule);

/** Re-runs isActive rules over the inbox, then the merchant catalog — the "clean my inbox" button. */
export const ruleReplay = oc.input(HouseholdScoped).output(z.object({ sorted: z.int() }));

// ====================================================================
// ? DELETE Operations
// ====================================================================

export const ruleRemove = oc.input(z.object({ householdId: HouseholdId, id: Id })).output(ok);

/** Nested contract object mounted at `contract.money.rules`. */
export const ruleContract = {
    list: ruleList,
    create: ruleCreate,
    update: ruleUpdate,
    remove: ruleRemove,
    replay: ruleReplay,
};
