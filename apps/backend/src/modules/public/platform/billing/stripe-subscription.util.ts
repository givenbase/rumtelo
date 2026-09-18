import type Stripe from 'stripe';

import { PlanKey } from '@rumtelo/contracts';

import { planKeyFromStripeLookupKey, type PaidPlanKey } from './config/stripe-plans.config';

/** Statuses that mean the subscriber still has paid access. */
const ACTIVE_SUB_STATUSES = new Set<Stripe.Subscription.Status>(['active', 'trialing']);

export function isActiveSubscriptionStatus(status: Stripe.Subscription.Status): boolean {
    return ACTIVE_SUB_STATUSES.has(status);
}

export function customerIdFromStripe(
    customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
): string | null {
    if (!customer) return null;
    if (typeof customer === 'string') return customer;
    if ('deleted' in customer && customer.deleted) return null;
    return customer.id;
}

export function subscriptionIdFromCheckout(
    subscription: string | Stripe.Subscription | null | undefined
): string | null {
    if (!subscription) return null;
    return typeof subscription === 'string' ? subscription : subscription.id;
}

/**
 * Resolve Plus/Max from the subscription's first price lookup_key,
 * falling back to metadata.planKey.
 */
export function planKeyFromSubscription(subscription: Stripe.Subscription): PaidPlanKey | null {
    const item = subscription.items.data[0];
    const lookupKey = item?.price?.lookup_key ?? null;
    const fromLookup = planKeyFromStripeLookupKey(lookupKey);
    if (fromLookup) return fromLookup;

    const meta = subscription.metadata?.planKey;
    if (meta === PlanKey.PLUS || meta === PlanKey.MAX) return meta;
    return null;
}

/** Period / trial / cancel flags mirrored onto HouseholdBilling. */
export function periodFieldsFromSubscription(subscription: Stripe.Subscription): {
    periodStartedAt: Date | null;
    periodEndsAt: Date | null;
    trialEndsAt: Date | null;
    willCancelAtPeriodEnd: boolean;
} {
    // Stripe API 2025+: period lives on subscription items, not the subscription root.
    const item = subscription.items.data[0];
    const periodStart = item?.current_period_start;
    const periodEnd = item?.current_period_end;

    return {
        periodStartedAt:
            periodStart !== null && periodStart !== undefined ? new Date(periodStart * 1000) : null,
        periodEndsAt:
            periodEnd !== null && periodEnd !== undefined ? new Date(periodEnd * 1000) : null,
        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        willCancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
}
