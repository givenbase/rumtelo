/**
 * Debt Contract
 * oRPC procedures for debt CRUD, detail, payments, and payoff plan.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { HouseholdId, HouseholdScoped, Id } from '../../../../common/common.schema';
import { PayoffStrategy } from '../enums';
import { Debt, DebtDetail, DebtPlan, RecordDebtPayment, refineDebtSchedule } from './debt.schema';

const ok = z.object({ ok: z.literal(true) });

// ====================================================================
// ? CREATE Operations
// ====================================================================

export const debtCreate = oc
    .input(
        Debt.omit({ id: true })
            .extend({
                /** When true (default), upsert a Necessities fixed cost for the minimum. */
                linkFixedCost: z.boolean().optional().default(true),
            })
            .superRefine(refineDebtSchedule)
    )
    .output(Debt);

export const debtRecordPayment = oc.input(RecordDebtPayment).output(DebtDetail);

// ====================================================================
// ? READ Operations
// ====================================================================

export const debtList = oc.input(HouseholdScoped).output(z.array(Debt));

export const debtGet = oc.input(z.object({ householdId: HouseholdId, id: Id })).output(DebtDetail);

export const debtPlan = oc
    .input(HouseholdScoped.extend({ strategy: z.enum(PayoffStrategy).nullish() }))
    .output(DebtPlan);

// ====================================================================
// ? UPDATE Operations
// ====================================================================

export const debtUpdate = oc
    .input(
        Debt.partial()
            .extend({
                id: Id,
                householdId: HouseholdId,
                /** Create or sync the linked Necessities fixed cost. */
                linkFixedCost: z.boolean().optional(),
            })
            .superRefine((value, ctx) => {
                if (value.scheduleKind === undefined) return;
                refineDebtSchedule(
                    {
                        scheduleKind: value.scheduleKind,
                        termPayments: value.termPayments,
                        maturityOn: value.maturityOn,
                    },
                    ctx
                );
            })
    )
    .output(Debt);

// ====================================================================
// ? DELETE Operations
// ====================================================================

export const debtRemove = oc.input(z.object({ householdId: HouseholdId, id: Id })).output(ok);

/** Nested contract object mounted at `contract.money.debts`. */
export const debtContract = {
    list: debtList,
    get: debtGet,
    create: debtCreate,
    recordPayment: debtRecordPayment,
    update: debtUpdate,
    remove: debtRemove,
    plan: debtPlan,
};
