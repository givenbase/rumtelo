import { Entity, Enum, Index, Property, Unique } from '@mikro-orm/core';
import { PlanKey } from '@rumtelo/contracts';

import { entityConfig } from '../../../../common/database/entity-config.util';
import { HouseholdEntity } from '../../../../common/database/household.entity';
import { NativeEnum } from '../../../../common/database/native-enum.util';

/**
 * Household Billing Entity
 *
 * Commercial subscription state for a household — plan tier + Stripe ids +
 * current billing period (mirrored from the Stripe Subscription).
 * Board prefs stay on {@link HouseholdSettings}.
 *
 * Invoices / payment history remain in Stripe. `trialEndsAt` is reserved for a
 * future 14-day Plus/Max trial (null until that flow exists).
 *
 * UNIQUE(`household`) enforces **1:1**.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'auth', domain: 'household', tableName: 'billing' }))
@Unique({ properties: ['household'] })
@Index({
    name: 'household_billing_stripe_customer_id_index',
    properties: ['stripeCustomerId'],
    options: { where: 'stripe_customer_id IS NOT NULL' },
})
@Unique({
    name: 'household_billing_stripe_subscription_id_unique',
    properties: ['stripeSubscriptionId'],
    options: { where: 'stripe_subscription_id IS NOT NULL' },
})
export class HouseholdBilling extends HouseholdEntity {
    // ? PROPERTIES
    /** Stripe Customer id (`cus_…`) — reused across Checkouts. Server-only. */
    @Property({ type: 'varchar', length: 255, nullable: true })
    stripeCustomerId: string | null = null;

    /** Active Stripe Subscription id (`sub_…`). Null when cancelled / Basic. Server-only. */
    @Property({ type: 'varchar', length: 255, nullable: true })
    stripeSubscriptionId: string | null = null;

    /** Stripe `cancel_at_period_end` — cancelled, but access runs until {@link periodEndsAt}. */
    @Property({ type: 'boolean', default: false })
    willCancelAtPeriodEnd = false;

    /** Current Stripe billing period start (from subscription item). */
    @Property({ type: 'timestamptz', nullable: true })
    periodStartedAt: Date | null = null;

    /** Current Stripe billing period end / next renew boundary. */
    @Property({ type: 'timestamptz', nullable: true })
    periodEndsAt: Date | null = null;

    /**
     * When a future Plus/Max trial ends. Null until trial checkout is shipped
     * (e.g. 14-day try-before-subscribe). Synced from `subscription.trial_end`.
     */
    @Property({ type: 'timestamptz', nullable: true })
    trialEndsAt: Date | null = null;

    // ? ENUMS
    /**
     * Plan that takes effect at {@link periodEndsAt} (Basic cancel or Max→Plus).
     * Null when no change is scheduled. Entitlements stay on {@link planKey} until then.
     */
    @Enum(NativeEnum({ PlanKey, domain: 'backoffice', nullable: true }))
    scheduledPlanKey: PlanKey | null = null;

    /** Commercial tier — stable key for Stripe metadata + capability gating. */
    @Enum(NativeEnum({ PlanKey, domain: 'backoffice', defaultValue: PlanKey.BASIC }))
    planKey: PlanKey = PlanKey.BASIC;
}
