import {
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    Logger,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    PlanKey,
    PLAN_RANK,
    PracticeSubscriptionStatus,
    SEAT_ADDON_UNIT_CENTS,
    SeatAddonKind,
} from '@rumtelo/contracts';
import Stripe from 'stripe';

import type { Env } from '../../../../common/config/env.config';
import { apiBadRequest } from '../../../../common/errors/api-user-error';
import { isDemoHouseholdSlug } from '@rumtelo/contracts/platform';
import { AuthHousehold } from '../../../auth/household/managed/household/auth-household.entity';
import { HouseholdBillingService } from '../../../auth/household/household-billing/household-billing.service';
import { AccountService } from '../../../auth/user/account/account.service';
import { PracticeBilling } from '../practice/practice-billing/practice-billing.entity';
import {
    stripeLookupKey,
    STRIPE_PRACTICE_BASE_LOOKUP_KEY,
    STRIPE_PRACTICE_CLIENT_LOOKUP_KEY,
    STRIPE_PRACTICE_SEAT_LOOKUP_KEY,
    STRIPE_SEAT_ADDON_LOOKUP_KEYS,
    type BillingInterval,
    type PaidPlanKey,
} from './config/stripe-plans.config';
import {
    customerIdFromStripe,
    isActiveSubscriptionStatus,
    mapPracticeSubscriptionStatus,
    periodFieldsFromSubscription,
    planKeyFromSubscription,
    subscriptionIdFromCheckout,
} from './stripe-subscription.util';

/** Address data used when creating a Stripe customer for a Practice. */
export type PracticeAddressData = {
    line1: string;
    line2: string | null;
    city: string;
    postalCode: string;
    country: string;
};

/**
 * Stripe Checkout for Plus / Max + webhook sync of planKey.
 * Downgrades / cancel keep entitlements until period end (industry standard).
 * Prices resolve via stable lookup keys (seed with `pnpm stripe:seed-plans`).
 * Without STRIPE_SECRET_KEY, paid upgrades are blocked (stay on Basic) unless
 * BILLING_PREVIEW_BYPASS is explicitly true for local/preview.
 *
 * Also handles Practice B2B metering: `syncPracticeSubscription` keeps
 * base + staff seats + client seats in sync on the practice Stripe subscription.
 */
@Injectable()
export class BillingService {
    private readonly logger = new Logger(BillingService.name);
    private readonly stripe: Stripe | null;
    /** Cache lookup_key → price_… for this process. */
    private readonly priceIdCache = new Map<string, string>();

    constructor(
        @Inject(ConfigService) private readonly config: ConfigService<Env, true>,
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(HouseholdBillingService) private readonly billing: HouseholdBillingService,
        @Inject(AccountService) private readonly accounts: AccountService
    ) {
        const key = this.config.get('STRIPE_SECRET_KEY', { infer: true });
        this.stripe = key ? new Stripe(key) : null;
    }

    /** True when Stripe Checkout is the upgrade path. */
    isStripeEnabled(): boolean {
        return Boolean(this.stripe) && !this.isPreviewBypass();
    }

    /**
     * Explicit local/preview free plan switching (BILLING_PREVIEW_BYPASS).
     * Missing Stripe alone does **not** enable free paid upgrades.
     */
    isPreviewBypass(): boolean {
        return this.config.get('BILLING_PREVIEW_BYPASS', { infer: true });
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async status(householdId: string) {
        const snap = await this.billing.getSnapshot(householdId);
        return {
            stripeEnabled: this.isStripeEnabled(),
            previewBypass: this.isPreviewBypass(),
            planKey: snap.planKey,
            periodEndsAt: toIsoOrNull(snap.periodEndsAt),
            periodStartedAt: toIsoOrNull(snap.periodStartedAt),
            // DB rows may still have NULL before the column default applied.
            willCancelAtPeriodEnd: Boolean(snap.willCancelAtPeriodEnd),
            scheduledPlanKey: snap.scheduledPlanKey ?? null,
            hasStripeCustomer: Boolean(snap.stripeCustomerId),
            hasActiveSubscription: Boolean(snap.stripeSubscriptionId),
            seatAddons: {
                extraContributor: snap.extraContributorSeats ?? 0,
                extraViewer: snap.extraViewerSeats ?? 0,
            },
            prices: await this.loadPriceCatalog(),
            seatAddonCatalog: {
                unitAmountCents: SEAT_ADDON_UNIT_CENTS,
                currency: 'eur' as const,
                kinds: [SeatAddonKind.CONTRIBUTOR, SeatAddonKind.VIEWER],
            },
        };
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /**
     * Purchase / change seat add-on quantities.
     * Persists extras on HouseholdBilling and, when Stripe is live + a
     * subscription exists, upserts the contributor / viewer price items.
     */
    async updateSeatAddons(input: {
        householdId: string;
        extras: { extraContributor: number; extraViewer: number };
        focusKind?: SeatAddonKind;
    }): Promise<Awaited<ReturnType<BillingService['status']>>> {
        const row = await this.billing.ensure(input.householdId);
        row.extraContributorSeats = input.extras.extraContributor;
        row.extraViewerSeats = input.extras.extraViewer;
        await this.em.flush();

        if (this.stripe && row.stripeSubscriptionId && !this.isPreviewBypass()) {
            await this.syncSeatAddonItems(row.stripeSubscriptionId, input.extras);
        }

        return this.status(input.householdId);
    }

    /**
     * Reject client-driven plan changes that must go through Stripe,
     * or paid upgrades when billing is not configured.
     */
    assertFreePlanChangeAllowed(from: PlanKey, to: PlanKey): void {
        if (this.isPreviewBypass()) return;
        if (from === to) return;
        const upgrading = PLAN_RANK[to] > PLAN_RANK[from];
        if (upgrading) {
            if (!this.stripe) {
                throw new ServiceUnavailableException(
                    'Paid plans are unavailable — Stripe billing is not configured'
                );
            }
            throw new ServiceUnavailableException(
                'Paid upgrades require Stripe Checkout — use billing.createCheckoutSession'
            );
        }
        if (this.stripe) {
            throw new ServiceUnavailableException(
                'Plan downgrades take effect at period end — use billing.schedulePlanChange'
            );
        }
        // No Stripe: allow free downgrade back to a lower plan via updateSettings.
    }

    async createCheckoutSession(input: {
        householdId: string;
        planKey: PaidPlanKey;
        interval: BillingInterval;
    }): Promise<{ url: string | null; applied: boolean }> {
        await this.assertNotDemoHousehold(input.householdId);
        if (!this.stripe || this.isPreviewBypass()) {
            throw new ServiceUnavailableException(
                'Stripe Checkout is not enabled — use household.updateSettings (preview / local)'
            );
        }

        const snap = await this.billing.getSnapshot(input.householdId);
        if (PLAN_RANK[input.planKey] <= PLAN_RANK[snap.planKey]) {
            throw new BadRequestException(
                `${input.planKey} is not an upgrade from ${snap.planKey}`
            );
        }

        // Already subscribed (e.g. Plus → Max): change price now with proration.
        if (snap.stripeSubscriptionId) {
            await this.upgradeExistingSubscription({
                householdId: input.householdId,
                subscriptionId: snap.stripeSubscriptionId,
                planKey: input.planKey,
                interval: input.interval,
            });
            return { url: null, applied: true };
        }

        const priceId = await this.priceIdFor(input.planKey, input.interval);
        if (!priceId) {
            throw new ServiceUnavailableException(
                `Missing Stripe price for ${input.planKey} / ${input.interval} — run pnpm stripe:seed-plans`
            );
        }

        const appOrigin = this.config.get('DOMAIN_APP', { infer: true });
        const { account } = await this.accounts.ensureCurrentAccount();
        const existingCustomer = snap.stripeCustomerId;

        const session = await this.stripe.checkout.sessions.create({
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${appOrigin}/settings/general/plan?checkout=success`,
            cancel_url: `${appOrigin}/settings/general/plan?checkout=cancel`,
            client_reference_id: input.householdId,
            ...(existingCustomer ? { customer: existingCustomer } : {}),
            metadata: {
                householdId: input.householdId,
                planKey: input.planKey,
                accountId: account.id,
                entityType: 'household',
            },
            subscription_data: {
                metadata: {
                    householdId: input.householdId,
                    planKey: input.planKey,
                    entityType: 'household',
                },
            },
        });

        if (!session.url) {
            throw new ServiceUnavailableException('Stripe did not return a Checkout URL');
        }

        return { url: session.url, applied: false };
    }

    /**
     * Downgrade / cancel at period end. Keeps current planKey until Stripe
     * applies the change (subscription.deleted or scheduled price change).
     */
    async schedulePlanChange(input: {
        householdId: string;
        planKey: typeof PlanKey.BASIC | typeof PlanKey.PLUS;
    }) {
        await this.assertNotDemoHousehold(input.householdId);
        const snap = await this.billing.getSnapshot(input.householdId);
        if (PLAN_RANK[input.planKey] >= PLAN_RANK[snap.planKey]) {
            throw new BadRequestException(
                `${input.planKey} is not a downgrade from ${snap.planKey}`
            );
        }
        if (input.planKey === PlanKey.PLUS && snap.planKey !== PlanKey.MAX) {
            throw apiBadRequest('plan_downgrade_max_only');
        }

        // Preview / no Stripe: apply immediately.
        if (this.isPreviewBypass() || !this.stripe) {
            await this.billing.setPlanKey(input.householdId, input.planKey);
            return this.status(input.householdId);
        }

        if (!snap.stripeSubscriptionId) {
            await this.billing.setPlanKey(input.householdId, input.planKey);
            return this.status(input.householdId);
        }

        if (input.planKey === PlanKey.BASIC) {
            await this.scheduleCancelAtPeriodEnd(input.householdId, snap.stripeSubscriptionId);
        } else {
            await this.schedulePaidDowngrade(
                input.householdId,
                snap.stripeSubscriptionId,
                PlanKey.PLUS
            );
        }

        return this.status(input.householdId);
    }

    /**
     * Stripe Customer Portal — cards, invoices, cancel / switch plan.
     * Creates a Customer if the household has not checked out yet.
     * Portal mutations sync via `customer.subscription.updated` / `.deleted`.
     */
    async createPortalSession(householdId: string): Promise<{ url: string }> {
        await this.assertNotDemoHousehold(householdId);
        if (!this.stripe || this.isPreviewBypass()) {
            throw new ServiceUnavailableException(
                'Stripe Customer Portal is not enabled — set STRIPE_SECRET_KEY'
            );
        }

        const customerId = await this.ensureStripeCustomer(householdId);
        const appOrigin = this.config.get('DOMAIN_APP', { infer: true });

        const session = await this.stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${appOrigin}/settings/general/plan?billing=return`,
        });

        if (!session.url) {
            throw new ServiceUnavailableException('Stripe did not return a Portal URL');
        }

        return { url: session.url };
    }

    // ====================================================================
    // ? Practice B2B seat metering
    // ====================================================================

    /**
     * Sync Practice Stripe subscription: base (qty 1) + staff seats + client seats.
     * Creates customer + subscription on first call when Stripe is configured.
     *
     * No-op when Stripe is not configured or preview bypass is active so
     * local/staging environments work without seeded prices.
     */
    async syncPracticeSubscription(input: {
        practiceId: string;
        seatCount: number;
        clientCount: number;
        /** Practice display name — used for Stripe customer `name`. */
        name: string;
        /** Practice billing email. */
        email: string;
        /** Practice billing address (may be null if not yet set). */
        address: PracticeAddressData | null;
    }): Promise<void> {
        if (!this.stripe || this.isPreviewBypass()) return;

        const billing = await this.findOrCreatePracticeBilling(input.practiceId);
        const staffCount = Math.max(0, input.seatCount);
        const clientCount = Math.max(0, input.clientCount);

        // Ensure a Stripe customer exists for this practice.
        if (!billing.stripeCustomerId) {
            const customer = await this.stripe.customers.create({
                email: input.email,
                name: input.name,
                address: input.address
                    ? {
                          line1: input.address.line1,
                          line2: input.address.line2 ?? undefined,
                          city: input.address.city,
                          postal_code: input.address.postalCode,
                          country: input.address.country,
                      }
                    : undefined,
                metadata: {
                    practiceId: input.practiceId,
                    entityType: 'practice',
                },
            });
            billing.stripeCustomerId = customer.id;
            await this.em.flush();
            this.logger.log(
                `Stripe customer ${customer.id} created for practice ${input.practiceId}`
            );
        }

        const [basePriceId, staffPriceId, clientPriceId] = await Promise.all([
            this.priceIdForLookupKey(STRIPE_PRACTICE_BASE_LOOKUP_KEY),
            this.priceIdForLookupKey(STRIPE_PRACTICE_SEAT_LOOKUP_KEY),
            this.priceIdForLookupKey(STRIPE_PRACTICE_CLIENT_LOOKUP_KEY),
        ]);
        if (!basePriceId || !staffPriceId || !clientPriceId) {
            this.logger.warn(
                `Missing Practice Stripe prices (base/staff/client) — run pnpm stripe:seed-plans`
            );
            return;
        }

        if (!billing.stripeSubscriptionId) {
            const items: Stripe.SubscriptionCreateParams.Item[] = [
                { price: basePriceId, quantity: 1 },
            ];
            if (staffCount > 0) items.push({ price: staffPriceId, quantity: staffCount });
            if (clientCount > 0) items.push({ price: clientPriceId, quantity: clientCount });

            const sub = await this.stripe.subscriptions.create({
                customer: billing.stripeCustomerId,
                items,
                metadata: {
                    practiceId: input.practiceId,
                    entityType: 'practice',
                },
            });
            billing.stripeSubscriptionId = sub.id;
            billing.billableSeatCount = staffCount;
            billing.billableClientCount = clientCount;
            billing.status = mapPracticeSubscriptionStatus(sub.status);
            const periodItem = sub.items.data[0];
            billing.periodStartedAt = periodItem?.current_period_start
                ? new Date(periodItem.current_period_start * 1000)
                : null;
            billing.periodEndsAt = periodItem?.current_period_end
                ? new Date(periodItem.current_period_end * 1000)
                : null;
            await this.em.flush();
            this.logger.log(
                `Practice subscription ${sub.id} created (base + ${staffCount} staff + ${clientCount} clients)`
            );
            return;
        }

        const sub = await this.stripe.subscriptions.retrieve(billing.stripeSubscriptionId, {
            expand: ['items.data.price'],
        });
        await this.syncPracticeSubscriptionItems(sub, {
            basePriceId,
            staffPriceId,
            clientPriceId,
            staffCount,
            clientCount,
        });

        billing.billableSeatCount = staffCount;
        billing.billableClientCount = clientCount;
        await this.em.flush();
    }

    /**
     * Align subscription line items with desired staff/client quantities.
     * Base stays qty 1; meter lines are added / updated / deleted as needed.
     */
    private async syncPracticeSubscriptionItems(
        sub: Stripe.Subscription,
        opts: {
            basePriceId: string;
            staffPriceId: string;
            clientPriceId: string;
            staffCount: number;
            clientCount: number;
        }
    ): Promise<void> {
        if (!this.stripe) return;

        const findItem = (lookupKey: string, priceId: string) =>
            sub.items.data.find(item => {
                if (typeof item.price === 'string') return item.price === priceId;
                return item.price.lookup_key === lookupKey || item.price.id === priceId;
            });

        const updates: Stripe.SubscriptionUpdateParams.Item[] = [];

        const baseItem = findItem(STRIPE_PRACTICE_BASE_LOOKUP_KEY, opts.basePriceId);
        if (baseItem) {
            if (baseItem.quantity !== 1) {
                updates.push({ id: baseItem.id, quantity: 1 });
            }
        } else {
            updates.push({ price: opts.basePriceId, quantity: 1 });
        }

        const staffItem = findItem(STRIPE_PRACTICE_SEAT_LOOKUP_KEY, opts.staffPriceId);
        if (opts.staffCount > 0) {
            if (staffItem) {
                if (staffItem.quantity !== opts.staffCount) {
                    updates.push({ id: staffItem.id, quantity: opts.staffCount });
                }
            } else {
                updates.push({ price: opts.staffPriceId, quantity: opts.staffCount });
            }
        } else if (staffItem) {
            updates.push({ id: staffItem.id, deleted: true });
        }

        const clientItem = findItem(STRIPE_PRACTICE_CLIENT_LOOKUP_KEY, opts.clientPriceId);
        if (opts.clientCount > 0) {
            if (clientItem) {
                if (clientItem.quantity !== opts.clientCount) {
                    updates.push({ id: clientItem.id, quantity: opts.clientCount });
                }
            } else {
                updates.push({ price: opts.clientPriceId, quantity: opts.clientCount });
            }
        } else if (clientItem) {
            updates.push({ id: clientItem.id, deleted: true });
        }

        if (updates.length === 0) return;

        await this.stripe.subscriptions.update(sub.id, {
            items: updates,
            proration_behavior: 'create_prorations',
        });
        this.logger.log(
            `Practice subscription ${sub.id} synced (staff=${opts.staffCount}, clients=${opts.clientCount})`
        );
    }

    // ====================================================================
    // ? Stripe Webhook
    // ====================================================================

    async handleWebhookEvent(rawBody: Buffer, signature: string): Promise<void> {
        if (!this.stripe) {
            this.logger.warn('Stripe webhook received but STRIPE_SECRET_KEY is unset');
            return;
        }

        const secret = this.config.get('STRIPE_WEBHOOK_SIGNING_SECRET', { infer: true });
        if (!secret) {
            throw new ServiceUnavailableException('STRIPE_WEBHOOK_SIGNING_SECRET is unset');
        }

        const event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);

        switch (event.type) {
            case 'checkout.session.completed':
                await this.onCheckoutCompleted(event.data.object);
                break;
            case 'customer.subscription.updated': {
                const sub = event.data.object;
                if (sub.metadata?.entityType === 'practice') {
                    await this.onPracticeSubscriptionUpdated(sub);
                } else {
                    // Portal cancel / plan switches / renewals land here.
                    await this.onSubscriptionUpdated(sub);
                }
                break;
            }
            case 'customer.subscription.deleted': {
                const sub = event.data.object;
                if (sub.metadata?.entityType === 'practice') {
                    await this.onPracticeSubscriptionDeleted(sub);
                } else {
                    // Portal cancel at period end (or immediate) — drop to Basic.
                    await this.onSubscriptionDeleted(sub);
                }
                break;
            }
            default:
                this.logger.debug(`Ignoring Stripe event ${event.type}`);
        }
    }

    // ====================================================================
    // ? Private — Household helpers
    // ====================================================================

    /** Seeded demo households keep their plan fixed for product walkthroughs. */
    private async assertNotDemoHousehold(householdId: string): Promise<void> {
        const household = await this.em.findOne(AuthHousehold, { id: householdId });
        if (isDemoHouseholdSlug(household?.slug)) {
            throw new ForbiddenException(
                'Demo households cannot change plans or open Stripe billing'
            );
        }
    }

    /** Reuse stored Customer or create one linked to this household. */
    private async ensureStripeCustomer(householdId: string): Promise<string> {
        if (!this.stripe) {
            throw new ServiceUnavailableException('Stripe is not configured');
        }

        const existing = await this.billing.getStripeCustomerId(householdId);
        if (existing) return existing;

        const { account, user } = await this.accounts.ensureCurrentAccount();
        const customer = await this.stripe.customers.create({
            email: user.email,
            name: user.name?.trim() || undefined,
            metadata: {
                householdId,
                accountId: account.id,
                entityType: 'household',
            },
        });

        const snap = await this.billing.getSnapshot(householdId);
        await this.billing.applyStripeBilling(householdId, {
            planKey: snap.planKey,
            stripeCustomerId: customer.id,
        });

        return customer.id;
    }

    private async upgradeExistingSubscription(input: {
        householdId: string;
        subscriptionId: string;
        planKey: PaidPlanKey;
        interval: BillingInterval;
    }): Promise<void> {
        if (!this.stripe) return;

        const priceId = await this.priceIdFor(input.planKey, input.interval);
        if (!priceId) {
            throw new ServiceUnavailableException(
                `Missing Stripe price for ${input.planKey} / ${input.interval} — run pnpm stripe:seed-plans`
            );
        }

        const subscription = await this.stripe.subscriptions.retrieve(input.subscriptionId, {
            expand: ['items.data.price'],
        });
        const item = subscription.items.data[0];
        if (!item) {
            throw new ServiceUnavailableException('Stripe subscription has no items');
        }

        // Clear any pending cancel / schedule before upgrading.
        if (subscription.cancel_at_period_end) {
            await this.stripe.subscriptions.update(input.subscriptionId, {
                cancel_at_period_end: false,
            });
        }
        await this.releaseSubscriptionSchedule(subscription);

        const updated = await this.stripe.subscriptions.update(input.subscriptionId, {
            items: [{ id: item.id, price: priceId }],
            proration_behavior: 'create_prorations',
            metadata: {
                ...subscription.metadata,
                householdId: input.householdId,
                planKey: input.planKey,
                entityType: 'household',
            },
            expand: ['items.data.price'],
        });

        await this.billing.applyStripeBilling(input.householdId, {
            planKey: input.planKey,
            stripeCustomerId: customerIdFromStripe(updated.customer),
            stripeSubscriptionId: updated.id,
            ...periodFieldsFromSubscription(updated),
            scheduledPlanKey: null,
            willCancelAtPeriodEnd: false,
        });
        this.logger.log(
            `Plan ${input.planKey} applied in-place for household ${input.householdId}`
        );
    }

    private async scheduleCancelAtPeriodEnd(
        householdId: string,
        subscriptionId: string
    ): Promise<void> {
        if (!this.stripe) return;

        const subscription = await this.stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['items.data.price'],
        });
        await this.releaseSubscriptionSchedule(subscription);

        const updated = await this.stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
            expand: ['items.data.price'],
        });

        const currentPlan = planKeyFromSubscription(updated) ?? PlanKey.PLUS;
        await this.billing.applyStripeBilling(householdId, {
            planKey: currentPlan,
            stripeCustomerId: customerIdFromStripe(updated.customer),
            stripeSubscriptionId: updated.id,
            ...periodFieldsFromSubscription(updated),
            scheduledPlanKey: PlanKey.BASIC,
            willCancelAtPeriodEnd: true,
        });
        this.logger.log(
            `Cancel at period end scheduled for household ${householdId} (keeps ${currentPlan})`
        );
    }

    private async schedulePaidDowngrade(
        householdId: string,
        subscriptionId: string,
        toPlan: typeof PlanKey.PLUS
    ): Promise<void> {
        if (!this.stripe) return;

        const subscription = await this.stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['items.data.price'],
        });
        const item = subscription.items.data[0];
        if (!item?.price || typeof item.price === 'string') {
            throw new ServiceUnavailableException('Stripe subscription item price missing');
        }

        const interval: BillingInterval =
            item.price.recurring?.interval === 'year' ? 'year' : 'month';
        const newPriceId = await this.priceIdFor(toPlan, interval);
        if (!newPriceId) {
            throw new ServiceUnavailableException(
                `Missing Stripe price for ${toPlan} / ${interval} — run pnpm stripe:seed-plans`
            );
        }

        if (subscription.cancel_at_period_end) {
            await this.stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: false,
            });
        }

        const periodEnd = item.current_period_end;
        if (!periodEnd) {
            throw new ServiceUnavailableException('Stripe subscription has no period end');
        }

        let scheduleId =
            typeof subscription.schedule === 'string'
                ? subscription.schedule
                : subscription.schedule?.id;

        if (!scheduleId) {
            const created = await this.stripe.subscriptionSchedules.create({
                from_subscription: subscriptionId,
            });
            scheduleId = created.id;
        }

        const schedule = await this.stripe.subscriptionSchedules.retrieve(scheduleId);
        const currentPhase = schedule.phases[0];
        if (!currentPhase) {
            throw new ServiceUnavailableException('Stripe subscription schedule has no phase');
        }

        await this.stripe.subscriptionSchedules.update(scheduleId, {
            end_behavior: 'release',
            phases: [
                {
                    start_date: currentPhase.start_date,
                    end_date: periodEnd,
                    items: [{ price: item.price.id, quantity: 1 }],
                },
                {
                    start_date: periodEnd,
                    items: [{ price: newPriceId, quantity: 1 }],
                    metadata: {
                        householdId,
                        planKey: toPlan,
                        entityType: 'household',
                    },
                },
            ],
        });

        const refreshed = await this.stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['items.data.price'],
        });
        const currentPlan = planKeyFromSubscription(refreshed) ?? PlanKey.MAX;
        await this.billing.applyStripeBilling(householdId, {
            planKey: currentPlan,
            stripeCustomerId: customerIdFromStripe(refreshed.customer),
            stripeSubscriptionId: refreshed.id,
            ...periodFieldsFromSubscription(refreshed),
            scheduledPlanKey: toPlan,
            willCancelAtPeriodEnd: false,
        });
        this.logger.log(
            `Downgrade to ${toPlan} scheduled at period end for household ${householdId}`
        );
    }

    private async releaseSubscriptionSchedule(subscription: Stripe.Subscription): Promise<void> {
        if (!this.stripe) return;
        const scheduleId =
            typeof subscription.schedule === 'string'
                ? subscription.schedule
                : subscription.schedule?.id;
        if (!scheduleId) return;
        try {
            await this.stripe.subscriptionSchedules.release(scheduleId);
        } catch (err) {
            this.logger.warn(
                `Could not release schedule ${scheduleId}: ${err instanceof Error ? err.message : String(err)}`
            );
        }
    }

    private async onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
        if (!this.stripe) return;

        const householdId = session.metadata?.householdId ?? session.client_reference_id ?? null;
        if (!householdId) {
            this.logger.warn('checkout.session.completed missing householdId');
            return;
        }

        const subscriptionId = subscriptionIdFromCheckout(session.subscription);
        const customerId = customerIdFromStripe(session.customer);

        let planKey: PaidPlanKey | null = null;
        let period: ReturnType<typeof periodFieldsFromSubscription> | undefined;
        if (subscriptionId) {
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId, {
                expand: ['items.data.price'],
            });
            planKey = planKeyFromSubscription(subscription);
            period = periodFieldsFromSubscription(subscription);
        }

        if (!planKey) {
            const meta = session.metadata?.planKey;
            if (meta === PlanKey.PLUS || meta === PlanKey.MAX) planKey = meta;
        }

        if (!planKey) {
            this.logger.warn(
                `checkout.session.completed could not resolve planKey for household ${householdId}`
            );
            return;
        }

        await this.billing.applyStripeBilling(householdId, {
            planKey,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            ...period,
            scheduledPlanKey: null,
        });
        this.logger.log(`Plan ${planKey} applied for household ${householdId} via Checkout`);
    }

    private async onSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
        if (!isActiveSubscriptionStatus(subscription.status)) {
            // past_due / unpaid / incomplete — keep current plan until deleted
            this.logger.debug(
                `subscription.updated ${subscription.id} status=${subscription.status} — no plan change`
            );
            return;
        }

        const householdId = await this.resolveHouseholdId(subscription);
        if (!householdId) {
            this.logger.warn(
                `subscription.updated ${subscription.id} — no household (metadata or DB)`
            );
            return;
        }

        const planKey = planKeyFromSubscription(subscription);
        if (!planKey) {
            this.logger.warn(
                `subscription.updated ${subscription.id} — unknown price lookup_key / metadata`
            );
            return;
        }

        const period = periodFieldsFromSubscription(subscription);
        const snap = await this.billing.getSnapshot(householdId);

        // Keep a scheduled downgrade marker while cancel_at_period_end is set,
        // or while we still expect Max→Plus and price has not switched yet.
        let scheduledPlanKey: PlanKey | null = null;
        if (period.willCancelAtPeriodEnd) {
            scheduledPlanKey = PlanKey.BASIC;
        } else if (snap.scheduledPlanKey && snap.scheduledPlanKey !== planKey) {
            scheduledPlanKey = snap.scheduledPlanKey;
        }

        await this.billing.applyStripeBilling(householdId, {
            planKey,
            stripeCustomerId: customerIdFromStripe(subscription.customer),
            stripeSubscriptionId: subscription.id,
            ...period,
            scheduledPlanKey,
        });
        this.logger.log(
            `Plan ${planKey} synced for household ${householdId} via subscription.updated`
        );
    }

    private async onSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
        const householdId = await this.resolveHouseholdId(subscription);
        if (!householdId) {
            this.logger.warn(
                `subscription.deleted ${subscription.id} — no household (metadata or DB)`
            );
            return;
        }

        await this.billing.applyStripeBilling(householdId, {
            planKey: PlanKey.BASIC,
            stripeCustomerId: customerIdFromStripe(subscription.customer),
            stripeSubscriptionId: null,
            periodStartedAt: null,
            periodEndsAt: null,
            trialEndsAt: null,
            willCancelAtPeriodEnd: false,
            scheduledPlanKey: null,
        });
        this.logger.log(`Plan BASIC applied for household ${householdId} via subscription.deleted`);
    }

    // ====================================================================
    // ? Private — Practice webhook handlers
    // ====================================================================

    private async onPracticeSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
        const practiceId = await this.resolvePracticeId(subscription);
        if (!practiceId) {
            this.logger.warn(
                `subscription.updated (practice) ${subscription.id} — no practiceId in metadata or DB`
            );
            return;
        }

        const billing = await this.findOrCreatePracticeBilling(practiceId);
        billing.stripeSubscriptionId = subscription.id;
        billing.stripeCustomerId = customerIdFromStripe(subscription.customer);

        let staffQty = billing.billableSeatCount;
        let clientQty = billing.billableClientCount;
        let periodStart: Date | null = null;
        let periodEnd: Date | null = null;

        for (const item of subscription.items.data) {
            const lookup = typeof item.price === 'string' ? null : (item.price.lookup_key ?? null);
            if (lookup === STRIPE_PRACTICE_SEAT_LOOKUP_KEY) {
                staffQty = item.quantity ?? 0;
            } else if (lookup === STRIPE_PRACTICE_CLIENT_LOOKUP_KEY) {
                clientQty = item.quantity ?? 0;
            }
            if (!periodStart && item.current_period_start) {
                periodStart = new Date(item.current_period_start * 1000);
            }
            if (!periodEnd && item.current_period_end) {
                periodEnd = new Date(item.current_period_end * 1000);
            }
        }

        billing.billableSeatCount = staffQty;
        billing.billableClientCount = clientQty;
        billing.periodStartedAt = periodStart;
        billing.periodEndsAt = periodEnd;
        billing.status = mapPracticeSubscriptionStatus(subscription.status);
        await this.em.flush();
        this.logger.log(
            `Practice ${practiceId} billing synced via subscription.updated (${staffQty} staff, ${clientQty} clients)`
        );
    }

    private async onPracticeSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
        const practiceId = await this.resolvePracticeId(subscription);
        if (!practiceId) {
            this.logger.warn(
                `subscription.deleted (practice) ${subscription.id} — no practiceId in metadata or DB`
            );
            return;
        }

        const billing = await this.findOrCreatePracticeBilling(practiceId);
        billing.stripeSubscriptionId = null;
        billing.periodStartedAt = null;
        billing.periodEndsAt = null;
        billing.status = PracticeSubscriptionStatus.NONE;
        await this.em.flush();
        this.logger.log(`Practice ${practiceId} subscription cleared via subscription.deleted`);
    }

    // ====================================================================
    // ? Private — Stripe catalog helpers
    // ====================================================================

    /**
     * Resolve lookup keys → amount / currency / label from Stripe.
     * Returns null when the secret key is unset.
     */
    private async loadPriceCatalog() {
        if (!this.stripe) return null;

        const slots: { plan: PaidPlanKey; interval: BillingInterval }[] = [
            { plan: PlanKey.PLUS, interval: 'month' },
            { plan: PlanKey.PLUS, interval: 'year' },
            { plan: PlanKey.MAX, interval: 'month' },
            { plan: PlanKey.MAX, interval: 'year' },
        ];

        const resolved = await Promise.all(
            slots.map(async ({ plan, interval }) => {
                const priceId = await this.priceIdFor(plan, interval);
                if (!priceId) return { plan, interval, display: null };
                try {
                    const price = await this.stripe!.prices.retrieve(priceId, {
                        expand: ['product'],
                    });
                    const product = price.product;
                    const productName =
                        typeof product === 'object' &&
                        product &&
                        !('deleted' in product && product.deleted)
                            ? product.name
                            : null;
                    return {
                        plan,
                        interval,
                        display: {
                            priceId: price.id,
                            amountCents: price.unit_amount ?? 0,
                            currency: price.currency,
                            label: price.nickname ?? productName ?? null,
                        },
                    };
                } catch (err) {
                    this.logger.warn(
                        `Failed to retrieve Stripe price ${priceId}: ${err instanceof Error ? err.message : String(err)}`
                    );
                    return { plan, interval, display: null };
                }
            })
        );

        const pick = (plan: PaidPlanKey, interval: BillingInterval) =>
            resolved.find(entry => entry.plan === plan && entry.interval === interval)?.display ??
            null;

        return {
            PLUS: { month: pick(PlanKey.PLUS, 'month'), year: pick(PlanKey.PLUS, 'year') },
            MAX: { month: pick(PlanKey.MAX, 'month'), year: pick(PlanKey.MAX, 'year') },
        };
    }

    /**
     * Upsert contributor / viewer add-on items on an existing household subscription.
     * Items with qty = 0 are deleted; new non-zero items are added.
     */
    private async syncSeatAddonItems(
        subscriptionId: string,
        extras: { extraContributor: number; extraViewer: number }
    ): Promise<void> {
        if (!this.stripe) return;

        const subscription = await this.stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['items.data.price'],
        });
        const existingItems = subscription.items.data;
        const updates: Stripe.SubscriptionUpdateParams.Item[] = [];

        const addonKinds: Array<[SeatAddonKind, number]> = [
            [SeatAddonKind.CONTRIBUTOR, extras.extraContributor],
            [SeatAddonKind.VIEWER, extras.extraViewer],
        ];

        for (const [kind, qty] of addonKinds) {
            const lookupKey = STRIPE_SEAT_ADDON_LOOKUP_KEYS[kind];
            const priceId = await this.priceIdForLookupKey(lookupKey);
            if (!priceId) {
                this.logger.warn(
                    `No active Stripe price for seat add-on ${lookupKey} — run pnpm stripe:seed-plans`
                );
                continue;
            }
            const existingItem = existingItems.find(
                item => typeof item.price !== 'string' && item.price.lookup_key === lookupKey
            );
            if (existingItem) {
                if (qty === 0) {
                    updates.push({ id: existingItem.id, deleted: true });
                } else if (existingItem.quantity !== qty) {
                    updates.push({ id: existingItem.id, quantity: qty });
                }
            } else if (qty > 0) {
                updates.push({ price: priceId, quantity: qty });
            }
        }

        if (updates.length > 0) {
            await this.stripe.subscriptions.update(subscriptionId, {
                items: updates,
                proration_behavior: 'create_prorations',
            });
            this.logger.log(`Seat add-on items synced on household subscription ${subscriptionId}`);
        }
    }

    /** Resolve `price_…` via Stripe lookup key. Results are process-cached. */
    private async priceIdForLookupKey(lookupKey: string): Promise<string | undefined> {
        if (!this.stripe) return undefined;

        const cached = this.priceIdCache.get(lookupKey);
        if (cached) return cached;

        const listed = await this.stripe.prices.list({
            lookup_keys: [lookupKey],
            active: true,
            limit: 1,
        });
        const priceId = listed.data[0]?.id;
        if (!priceId) {
            this.logger.warn(
                `No active Stripe price for lookup_key=${lookupKey} — run pnpm stripe:seed-plans`
            );
            return undefined;
        }
        this.priceIdCache.set(lookupKey, priceId);
        return priceId;
    }

    /** Resolve `price_…` for a plan+interval pair via stable lookup key. */
    private async priceIdFor(
        planKey: PaidPlanKey,
        interval: BillingInterval
    ): Promise<string | undefined> {
        return this.priceIdForLookupKey(stripeLookupKey(planKey, interval));
    }

    // ====================================================================
    // ? Private — household / practice resolution helpers
    // ====================================================================

    private async resolveHouseholdId(subscription: Stripe.Subscription): Promise<string | null> {
        const fromMeta = subscription.metadata?.householdId?.trim();
        if (fromMeta) return fromMeta;
        return this.billing.findHouseholdIdByStripeSubscriptionId(subscription.id);
    }

    private async resolvePracticeId(subscription: Stripe.Subscription): Promise<string | null> {
        const fromMeta = subscription.metadata?.practiceId?.trim();
        if (fromMeta) return fromMeta;
        const billing = await this.em.findOne(PracticeBilling, {
            stripeSubscriptionId: subscription.id,
        });
        return billing?.practice ?? null;
    }

    /** Find or lazily create a PracticeBilling row for a practice. */
    private async findOrCreatePracticeBilling(practiceId: string): Promise<PracticeBilling> {
        let billing = await this.em.findOne(PracticeBilling, { practice: practiceId });
        if (!billing) {
            billing = this.em.create(PracticeBilling, {
                practice: practiceId,
                billableSeatCount: 0,
                billableClientCount: 0,
            } as never);
            await this.em.persist(billing).flush();
        }
        return billing;
    }
}

/** Wire-safe ISO datetime — accepts Date or already-string values from the ORM. */
function toIsoOrNull(value: Date | string | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string' && value.trim()) {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }
    return null;
}
