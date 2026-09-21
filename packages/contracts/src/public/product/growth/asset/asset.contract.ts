/**
 * Asset Contract (Growth)
 * oRPC procedures for what a household owns.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { HouseholdId, HouseholdScoped, Id } from '../../../../common/common.schema';
import { Asset } from './asset.schema';

const ok = z.object({ ok: z.literal(true) });

// ====================================================================
// ? CREATE Operations
// ====================================================================

export const assetCreate = oc.input(Asset.omit({ id: true })).output(Asset);

// ====================================================================
// ? READ Operations
// ====================================================================

export const assetList = oc.input(HouseholdScoped).output(z.array(Asset));

export const assetGet = oc.input(z.object({ householdId: HouseholdId, id: Id })).output(Asset);

// ====================================================================
// ? UPDATE Operations
// ====================================================================

export const assetUpdate = oc.input(Asset).output(Asset);

// ====================================================================
// ? DELETE Operations
// ====================================================================

export const assetRemove = oc.input(z.object({ householdId: HouseholdId, id: Id })).output(ok);

/** Nested contract object mounted at `contract.growth.assets`. */
export const assetContract = {
    create: assetCreate,
    list: assetList,
    get: assetGet,
    update: assetUpdate,
    remove: assetRemove,
};
