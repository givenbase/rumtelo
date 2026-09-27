/**
 * Billing Contracts
 * Stripe checkout, portal, plan changes, status, seat add-on stubs.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { HouseholdId, HouseholdScoped } from '../../../common/common.schema';
import { PlanKey, SeatAddonKind } from '../../../enums';
import { BillingInterval, HouseholdBillingStatus, SeatAddonQuantities } from './billing.schema';

// ====================================================================
// ? CREATE Operations
// ====================================================================

export const billingCreateCheckoutSession = oc
    .input(
        z.object({
            householdId: HouseholdId,
            planKey: z.enum([PlanKey.PLUS, PlanKey.MAX]),
            interval: BillingInterval,
        })
    )
    .output(
        z.object({
            /** Checkout URL when a new subscription is needed. */
            url: z.url().nullable(),
            /** True when an existing subscription was upgraded in place (proration). */
            applied: z.boolean(),
        })
    );

/**
 * Stripe Customer Portal — payment methods, invoices, cancel / change plan.
 * Changes sync back via webhooks (`customer.subscription.*`).
 */
export const billingCreatePortalSession = oc
    .input(z.object({ householdId: HouseholdId }))
    .output(z.object({ url: z.url() }));

// ====================================================================
// ? READ Operations
// ====================================================================

export const billingStatus = oc.input(HouseholdScoped).output(HouseholdBillingStatus);

// ====================================================================
// ? UPDATE Operations
// ====================================================================

/**
 * Downgrade / cancel — keeps current entitlements until period end
 * (industry standard). Preview / no-Stripe applies immediately.
 */
export const billingSchedulePlanChange = oc
    .input(
        z.object({
            householdId: HouseholdId,
            planKey: z.enum([PlanKey.BASIC, PlanKey.PLUS]),
        })
    )
    .output(HouseholdBillingStatus);

/**
 * Purchase / change seat add-on quantities (€2.50 / seat).
 * Stub — Stripe qty wiring not live; handlers throw NOT_IMPLEMENTED.
 */
export const billingUpdateSeatAddons = oc
    .input(
        z.object({
            householdId: HouseholdId,
            extras: SeatAddonQuantities,
            /** Optional: which kind the UI focused (telemetry / future proration). */
            focusKind: z.enum(SeatAddonKind).optional(),
        })
    )
    .output(HouseholdBillingStatus);

/** Nested contract object mounted at `contract.billing`. */
export const billingContract = {
    status: billingStatus,
    createCheckoutSession: billingCreateCheckoutSession,
    schedulePlanChange: billingSchedulePlanChange,
    createPortalSession: billingCreatePortalSession,
    updateSeatAddons: billingUpdateSeatAddons,
};
