/**
 * Plan Contract (Growth)
 * oRPC procedures for the cascade year → quarter → month → week → day.
 * Reads only return items the viewer may see (household visibility).
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import {
    PlanItem,
    PlanItemCreateInput,
    PlanItemRef,
    PlanItemStatusInput,
    PlanItemUpdateInput,
    PlanPeriodInput,
    PlanPeriodView,
    PlanYearInput,
} from './plan.schema';

const ok = z.object({ ok: z.literal(true) });

// ====================================================================
// ? CREATE Operations
// ====================================================================

/** New item; refuses a fourth in the same slot. */
export const planCreate = oc.input(PlanItemCreateInput).output(PlanItem);

// ====================================================================
// ? READ Operations
// ====================================================================

/** One period: items, their "why" chain and the layer below. */
export const planPeriod = oc.input(PlanPeriodInput).output(PlanPeriodView);

/** Year, quarter and month items of one year — the year overview. */
export const planYear = oc.input(PlanYearInput).output(z.array(PlanItem));

// ====================================================================
// ? UPDATE Operations
// ====================================================================

/** Edit, re-parent, reorder or change who sees it. */
export const planUpdate = oc.input(PlanItemUpdateInput).output(PlanItem);

/** Review: done, partial, missed or let go. */
export const planUpdateStatus = oc.input(PlanItemStatusInput).output(PlanItem);

/** Snooze: copy an unfinished item into the next period; the source becomes DEFERRED. */
export const planCarry = oc.input(PlanItemRef).output(PlanItem);

// ====================================================================
// ? DELETE Operations
// ====================================================================

/** Children stay and become loose (`parentId = null`). */
export const planRemove = oc.input(PlanItemRef).output(ok);

/** Nested contract object mounted at `contract.growth.plan`. */
export const planContract = {
    create: planCreate,
    period: planPeriod,
    year: planYear,
    update: planUpdate,
    updateStatus: planUpdateStatus,
    carry: planCarry,
    remove: planRemove,
};
