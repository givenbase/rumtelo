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
    SkipFixedCostPeriod,
    UnlinkFixedCostSettlement,
} from './fixed-cost.schema';

const ok = z.object({ ok: z.literal(true) });

// ====================================================================
// ? CREATE Operations
// ====================================================================

export const fixedCostCreate = oc.input(FixedCost.omit({ id: true })).output(FixedCost);

export const fixedCostMarkPaid = oc.input(MarkFixedCostPaid).output(FixedCostSettlement);

export const fixedCostSkip = oc.input(SkipFixedCostPeriod).output(FixedCostSettlement);

// ====================================================================
// ? READ Operations
// ====================================================================

export const fixedCostList = oc
    .input(HouseholdScoped.extend({ direction: z.enum(FlowDirection).nullish() }))
    .output(z.array(FixedCost));

export const fixedCostByJar = oc.input(HouseholdScoped).output(z.array(FixedCostsByJar));

export const fixedCostListSettlements = oc
    .input(ListFixedCostSettlements)
    .output(z.array(FixedCostSettlement));

// ====================================================================
// ? UPDATE Operations
// ====================================================================

export const fixedCostUpdate = oc
    .input(FixedCost.partial().extend({ id: Id, householdId: HouseholdId }))
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
