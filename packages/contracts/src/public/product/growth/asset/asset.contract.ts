/**
 * Asset Contract (Growth)
 * oRPC procedures for what a household owns.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { HouseholdScoped } from '../../../../common/common.schema';
import { Asset } from './asset.schema';

// ====================================================================
// ? READ Operations
// ====================================================================

export const assetList = oc.input(HouseholdScoped).output(z.array(Asset));

/** Nested contract object mounted at `contract.growth.assets`. */
export const assetContract = {
    list: assetList,
};
