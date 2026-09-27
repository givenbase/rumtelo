/**
 * Billing Schemas
 * Household commercial snapshot + checkout plan intent (marketing → Stripe).
 */

import { z } from 'zod';

import { PlanKey, SeatAddonKind } from '../../../enums';

/** Stripe / marketing billing cadence for paid plans. */
export const BillingInterval = z.enum(['month', 'year']);

/** Paid plan chosen on marketing pricing — remembered through sign-up → Stripe Checkout. */
export const PendingPlanIntent = z.object({
    planKey: z.enum([PlanKey.PLUS, PlanKey.MAX]),
    interval: BillingInterval.default('month'),
});

/** Display fields from `stripe.prices.retrieve` (plus expanded product name). */
export const BillingPriceDisplay = z.object({
    priceId: z.string(),
    /** Stripe `unit_amount` in the smallest currency unit (e.g. cents). */
    amountCents: z.number().int().nonnegative(),
    currency: z.string(),
    /** Price nickname, else Product name, else null. */
    label: z.string().nullish(),
});

/** Coerce Date / ISO strings from the ORM into ISO-8601 for the wire. */
const IsoDateTime = z.preprocess((value: unknown) => {
    if (value instanceof Date) return value.toISOString();
    return value;
}, z.iso.datetime());

/** Purchased seat add-on quantities (0 until Stripe add-on qty is live). */
export const SeatAddonQuantities = z.object({
    /** Extra contributor seats (assignable as admin or member). */
    extraContributor: z.number().int().nonnegative(),
    extraViewer: z.number().int().nonnegative(),
});

/** Household commercial snapshot for plan UI (period-end cancel / downgrade). */
export const HouseholdBillingStatus = z.object({
    stripeEnabled: z.boolean(),
    previewBypass: z.boolean(),
    planKey: z.enum(PlanKey),
    /** ISO when current paid period ends; null on Basic / unknown. */
    periodEndsAt: IsoDateTime.nullable(),
    periodStartedAt: IsoDateTime.nullable(),
    /** True when subscription cancels to Basic at {@link periodEndsAt}. */
    willCancelAtPeriodEnd: z.preprocess(value => Boolean(value), z.boolean()),
    /**
     * Plan that takes effect at period end (Basic cancel, or Max→Plus).
     * Null when no change is scheduled.
     */
    scheduledPlanKey: z.enum(PlanKey).nullable(),
    /** Stripe Customer exists (or will be created) for Customer Portal. */
    hasStripeCustomer: z.boolean(),
    /** Active Stripe subscription id is stored (paid tier). */
    hasActiveSubscription: z.boolean(),
    /**
     * Purchased seat add-ons beyond the plan matrix.
     * Always present; quantities are `0` until Stripe add-on wiring ships.
     */
    seatAddons: SeatAddonQuantities,
    /**
     * Live Stripe catalog for Plus/Max (month + year). Null when Stripe is unset.
     * Always include this key (use `null`, never omit).
     */
    prices: z
        .object({
            PLUS: z.object({
                month: BillingPriceDisplay.nullable(),
                year: BillingPriceDisplay.nullable(),
            }),
            MAX: z.object({
                month: BillingPriceDisplay.nullable(),
                year: BillingPriceDisplay.nullable(),
            }),
        })
        .nullable(),
    /**
     * Stub catalog for seat add-ons (€2.50 / seat). Stripe price ids null until seeded.
     */
    seatAddonCatalog: z.object({
        unitAmountCents: z.number().int().nonnegative(),
        currency: z.literal('eur'),
        kinds: z.array(z.enum(SeatAddonKind)),
    }),
});

// Inferred types (same-module merge for consumers)
export type BillingInterval = z.infer<typeof BillingInterval>;
export type PendingPlanIntent = z.infer<typeof PendingPlanIntent>;
export type BillingPriceDisplay = z.infer<typeof BillingPriceDisplay>;
export type SeatAddonQuantities = z.infer<typeof SeatAddonQuantities>;
export type HouseholdBillingStatus = z.infer<typeof HouseholdBillingStatus>;
