/**
 * Fixed-Cost Contract
 * oRPC procedures for fixed cost CRUD, jar grouping, and period settlements.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { HouseholdId, HouseholdScoped, Id } from '../../../../common/common.schema';
import { FlowDirection } from '../../../../common/common.enums';
import {
    FixedCost,
    FixedCostSettlement,
    FixedCostsByJar,
    ListFixedCostSettlements,
    MarkFixedCostPaid,
    refineFixedCostDueMonth,
    SkipFixedCostPeriod,
    UnlinkFixedCostSettlement,
} from './fixed-cost.schema';
import { SaveParty } from '../party/party.schema';

const ok = z.object({ ok: z.literal(true) });

// ====================================================================
// ? CREATE Operations
// ====================================================================

export const fixedCostCreate = oc
    .input(
        FixedCost.omit({ id: true }).extend(SaveParty.shape).superRefine(refineFixedCostDueMonth)
    )
    .output(FixedCost);

export const fixedCostMarkPaid = oc.input(MarkFixedCostPaid).output(FixedCostSettlement);

export const fixedCostSkip = oc.input(SkipFixedCostPeriod).output(FixedCostSettlement);

// ====================================================================
// ? READ Operations
// ====================================================================

export const fixedCostList = oc
    .input(
        HouseholdScoped.extend({
            direction: z.enum(FlowDirection).nullish(),
            /** Only bills attributed to this growth asset. */
            assetId: Id.nullish(),
        })
    )
    .output(z.array(FixedCost));

export const fixedCostByJar = oc.input(HouseholdScoped).output(z.array(FixedCostsByJar));

export const fixedCostListSettlements = oc
    .input(ListFixedCostSettlements)
    .output(z.array(FixedCostSettlement));

// ====================================================================
// ? UPDATE Operations
// ====================================================================

export const fixedCostUpdate = oc
    .input(
        FixedCost.partial()
            .extend({ ...SaveParty.shape, id: Id, householdId: HouseholdId })
            .superRefine((value, ctx) => {
                // Only when cadence is present on the patch (create-like); else service checks final row.
                if (value.cadence === undefined) return;
                refineFixedCostDueMonth(value, ctx);
            })
    )
    .output(FixedCost);

// ====================================================================
// ? DELETE Operations
// ====================================================================

export const fixedCostRemove = oc.input(z.object({ householdId: HouseholdId, id: Id })).output(ok);

export const fixedCostUnlinkSettlement = oc.input(UnlinkFixedCostSettlement).output(ok);

/** Nested contract object mounted at `contract.money.fixedCosts`. */
export const fixedCostContract = {
    list: fixedCostList,
    byJar: fixedCostByJar,
    listSettlements: fixedCostListSettlements,
    create: fixedCostCreate,
    markPaid: fixedCostMarkPaid,
    skip: fixedCostSkip,
    update: fixedCostUpdate,
    remove: fixedCostRemove,
    unlinkSettlement: fixedCostUnlinkSettlement,
};
