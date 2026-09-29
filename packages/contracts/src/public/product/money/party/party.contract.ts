/**
 * Party Contract
 * oRPC procedures for the household's saved parties.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { HouseholdId, HouseholdScoped, Id } from '../../../../common/common.schema';
import { Party, PartySuggestResult, PartyWithUsage } from './party.schema';

const ok = z.object({ ok: z.literal(true) });

// ====================================================================
// ? CREATE Operations
// ====================================================================

export const partyCreate = oc.input(Party.omit({ id: true })).output(Party);

/** Nominate a saved party for the Rumtelo merchant catalog (aggregated by name). */
export const partySuggest = oc
    .input(z.object({ householdId: HouseholdId, partyId: Id }))
    .output(PartySuggestResult);

// ====================================================================
// ? READ Operations
// ====================================================================

/** All saved parties with usage counts, sorted by name. */
export const partyList = oc.input(HouseholdScoped).output(z.array(PartyWithUsage));

// ====================================================================
// ? UPDATE Operations
// ====================================================================

/** Renaming fans out to the `counterparty` snapshot on every row linked to this party. */
export const partyUpdate = oc
    .input(Party.partial().extend({ id: Id, householdId: HouseholdId }))
    .output(Party);

/** Move every row from `fromId` onto `intoId`, then delete `fromId`. */
export const partyMerge = oc
    .input(z.object({ householdId: HouseholdId, fromId: Id, intoId: Id }))
    .output(Party);

// ====================================================================
// ? DELETE Operations
// ====================================================================

/** Rows keep their `counterparty` text; only the link is cleared. */
export const partyRemove = oc.input(z.object({ householdId: HouseholdId, id: Id })).output(ok);

/** Nested contract object mounted at `contract.money.parties`. */
export const partyContract = {
    list: partyList,
    create: partyCreate,
    suggest: partySuggest,
    update: partyUpdate,
    merge: partyMerge,
    remove: partyRemove,
};
