/**
 * Week-Check Contract (Money)
 * oRPC procedures for the money weekly check-in.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { HouseholdId, HouseholdScoped, WeekKey } from '../../../../common/common.schema';
import { JarKey, WeekCheckStage } from '../enums';
import { WeekCheck, WeekCheckAllocation } from './week-check.schema';

// ====================================================================
// ? READ Operations
// ====================================================================

export const weekCheckCurrent = oc
    .input(HouseholdScoped.extend({ week: WeekKey.nullish() }))
    .output(WeekCheck);

export const weekCheckHistory = oc.input(HouseholdScoped).output(z.array(WeekCheck));

// ====================================================================
// ? UPDATE Operations
// ====================================================================

export const weekCheckAdvance = oc
    .input(
        z.object({
            householdId: HouseholdId,
            week: WeekKey,
            stage: z.enum(WeekCheckStage),
            // One allocation per pot at most: never more than there are pots.
            allocations: z.array(WeekCheckAllocation).max(Object.values(JarKey).length).nullish(),
            intention: z.string().max(280).nullish(),
        })
    )
    .output(WeekCheck);

/** Nested contract object mounted at `contract.money.weekCheck`. */
export const weekCheckContract = {
    current: weekCheckCurrent,
    advance: weekCheckAdvance,
    history: weekCheckHistory,
};
