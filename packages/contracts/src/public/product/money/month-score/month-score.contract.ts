/**
 * Month-Score Contract
 * oRPC procedures for the monthly scoring system.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { HouseholdScoped, PeriodKey } from '../../../../common/common.schema';
import { Level, MonthCloseBillDisposition, MonthScore, PeriodRecap } from './month-score.schema';

// ====================================================================
// ? READ Operations
// ====================================================================

export const monthScoreCurrent = oc
    .input(HouseholdScoped.extend({ period: PeriodKey.nullish() }))
    .output(MonthScore);

export const monthScoreLevels = oc.input(HouseholdScoped).output(z.array(Level));

export const monthScoreRecap = oc
    .input(HouseholdScoped.extend({ period: PeriodKey }))
    .output(PeriodRecap);

// ====================================================================
// ? UPDATE Operations
// ====================================================================

/** Idempotent: closing an already-closed month score returns the existing recap. */
export const monthScoreClose = oc
    .input(
        HouseholdScoped.extend({
            period: PeriodKey,
            /**
             * Required for every due bill when any remain unpaid.
             * `skip` = intentional non-payment; `roll` = carry into later months.
             */
            billDispositions: z.array(MonthCloseBillDisposition).optional(),
        })
    )
    .output(PeriodRecap);
/** Nested contract object mounted at `contract.money.monthScore`. */
export const monthScoreContract = {
    current: monthScoreCurrent,
    levels: monthScoreLevels,
    recap: monthScoreRecap,
    close: monthScoreClose,
};
