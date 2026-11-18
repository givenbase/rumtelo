/**
 * Progress Contract (Money)
 * oRPC procedure for the board stage read.
 */

import { oc } from '@orpc/contract';

import { HouseholdScoped } from '../../../../common/common.schema';
import { MoneyProgress } from './progress.schema';

// ====================================================================
// ? READ Operations
// ====================================================================

/** Board stage for the shell (nav, More, Quick add) and Home. May raise a paid household's stage floor once (idempotent). */
export const progressGet = oc.input(HouseholdScoped).output(MoneyProgress);

/** Nested contract object mounted at `contract.money.progress`. */
export const progressContract = {
    get: progressGet,
};
