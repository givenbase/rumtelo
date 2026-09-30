/**
 * Income Contract
 * oRPC procedures for income source CRUD and split application.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { HouseholdId, HouseholdScoped, Id, IsoDate, Money } from '../../../../common/common.schema';
import { SaveParty } from '../party/party.schema';
import { IncomeSource } from './income.schema';

const ok = z.object({ ok: z.literal(true) });

// ====================================================================
// ? CREATE Operations
// ====================================================================

export const incomeCreate = oc
    .input(IncomeSource.omit({ id: true, periods: true }).extend(SaveParty.shape))
    .output(IncomeSource);

// ====================================================================
// ? READ Operations
// ====================================================================

export const incomeList = oc
    .input(
        HouseholdScoped.extend({
            /** Only sources attributed to this growth asset. */
            assetId: Id.nullish(),
        })
    )
    .output(z.array(IncomeSource));

// ====================================================================
// ? UPDATE Operations
// ====================================================================

export const incomeUpdate = oc
    .input(
        IncomeSource.partial()
            .omit({ periods: true })
            .extend({
                ...SaveParty.shape,
                id: Id,
                householdId: HouseholdId,
                /** When amount changes: date the new amount takes effect (default today). */
                amountEffectiveFrom: IsoDate.nullish(),
            })
    )
    .output(IncomeSource);

/** Turns an income event into per-jar allocations atomically. */
export const incomeApplySplit = oc
    .input(
        z.object({
            householdId: HouseholdId,
            incomeSourceId: Id,
            amount: Money,
            bookedOn: IsoDate,
        })
    )
    .output(
        z.object({
            allocations: z.array(z.object({ jarId: Id, amount: Money })),
        })
    );

// ====================================================================
// ? DELETE Operations
// ====================================================================

export const incomeRemove = oc.input(z.object({ householdId: HouseholdId, id: Id })).output(ok);

/** Nested contract object mounted at `contract.money.income`. */
export const incomeContract = {
    list: incomeList,
    create: incomeCreate,
    update: incomeUpdate,
    remove: incomeRemove,
    applySplit: incomeApplySplit,
};
