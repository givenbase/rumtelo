/**
 * Jar Contract
 * oRPC procedures for jar list, balances, split, and categories.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import {
    HouseholdId,
    HouseholdScoped,
    Id,
    Money,
    PeriodKey,
} from '../../../../common/common.schema';
import { Category, Jar, JarBalance, UpdateJarPlacement, UpdateJarSplit } from './jar.schema';

const ok = z.object({ ok: z.literal(true) });

// ====================================================================
// ? READ Operations
// ====================================================================

export const jarList = oc.input(HouseholdScoped).output(z.array(Jar));

export const jarBalances = oc
    .input(HouseholdScoped.extend({ period: PeriodKey.nullish() }))
    .output(z.array(JarBalance));

// ====================================================================
// ? UPDATE Operations
// ====================================================================

export const jarUpdate = oc
    .input(
        Jar.partial().omit({ defaultAccountId: true }).extend({ id: Id, householdId: HouseholdId })
    )
    .output(Jar);

export const jarUpdateSplit = oc.input(UpdateJarSplit).output(z.array(Jar));

/** Map jars onto manual (or linked) bank seats — one write for the board. */
export const jarUpdatePlacement = oc.input(UpdateJarPlacement).output(z.array(Jar));

export const jarCreateCategory = oc
    .input(
        z.object({
            householdId: HouseholdId,
            jarId: Id,
            name: z.string().min(1).max(80),
            budgeted: Money,
        })
    )
    .output(Category);

export const jarUpdateCategory = oc
    .input(Category.partial().extend({ id: Id, householdId: HouseholdId }))
    .output(Category);

// ====================================================================
// ? DELETE Operations
// ====================================================================

export const jarDeleteCategory = oc
    .input(z.object({ householdId: HouseholdId, id: Id }))
    .output(ok);

/** Nested contract object mounted at `contract.money.jars`. */
export const jarContract = {
    list: jarList,
    balances: jarBalances,
    update: jarUpdate,
    updateSplit: jarUpdateSplit,
    updatePlacement: jarUpdatePlacement,
    createCategory: jarCreateCategory,
    updateCategory: jarUpdateCategory,
    deleteCategory: jarDeleteCategory,
};
