import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import { PlanKey } from '@rumtelo/contracts';

import { HouseholdBilling } from './household-billing.entity';

export type StripeBillingSyncInput = {
    planKey: PlanKey;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    periodStartedAt?: Date | null;
    periodEndsAt?: Date | null;
    trialEndsAt?: Date | null;
    willCancelAtPeriodEnd?: boolean;
    scheduledPlanKey?: PlanKey | null;
};

export type HouseholdBillingSnapshot = {
    planKey: PlanKey;
    periodEndsAt: Date | null;
    periodStartedAt: Date | null;
    willCancelAtPeriodEnd: boolean;
    scheduledPlanKey: PlanKey | null;
    stripeSubscriptionId: string | null;
    stripeCustomerId: string | null;
};

/**
 * Household commercial state — plan tier + Stripe ids + billing period.
 *
 * Does **not** store invoice/payment history; those live in Stripe. Webhooks
 * sync entitlement + period / trial pointers onto this 1:1 row.
 */
@Injectable()
export class HouseholdBillingService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    /** Ensure billing row exists (lazy create with Basic). */
    async ensure(householdId: string): Promise<HouseholdBilling> {
        let row = await this.em.findOne(HouseholdBilling, { household: householdId });
        if (!row) {
            row = this.em.create(HouseholdBilling, {
                household: householdId,
                planKey: PlanKey.BASIC,
            } as never);
            await this.em.persist(row).flush();
        }
        return row;
    }

    async getPlanKey(householdId: string): Promise<PlanKey> {
        const row = await this.ensure(householdId);
        return row.planKey;
    }

    async getSnapshot(householdId: string): Promise<HouseholdBillingSnapshot> {
        const row = await this.ensure(householdId);
        return {
            planKey: row.planKey,
            periodEndsAt: row.periodEndsAt,
            periodStartedAt: row.periodStartedAt,
            willCancelAtPeriodEnd: row.willCancelAtPeriodEnd,
            scheduledPlanKey: row.scheduledPlanKey ?? null,
            stripeSubscriptionId: row.stripeSubscriptionId,
            stripeCustomerId: row.stripeCustomerId,
        };
    }

    /**
     * Set plan key after validation (settings update / preview bypass).
     * Does not touch Stripe ids or period fields.
     */
    async setPlanKey(householdId: string, planKey: PlanKey): Promise<HouseholdBilling> {
        const row = await this.ensure(householdId);
        row.planKey = planKey;
        row.scheduledPlanKey = null;
        row.willCancelAtPeriodEnd = false;
        if (planKey === PlanKey.BASIC) {
            row.periodStartedAt = null;
            row.periodEndsAt = null;
            row.trialEndsAt = null;
            row.stripeSubscriptionId = null;
        }
        await this.em.flush();
        return row;
    }

    /** Internal — Stripe webhook / Checkout sync. */
    async applyStripeBilling(householdId: string, input: StripeBillingSyncInput): Promise<void> {
        const row = await this.ensure(householdId);
        row.planKey = input.planKey;
        if (input.stripeCustomerId !== undefined) {
            row.stripeCustomerId = input.stripeCustomerId;
        }
        if (input.stripeSubscriptionId !== undefined) {
            row.stripeSubscriptionId = input.stripeSubscriptionId;
        }
        if (input.periodStartedAt !== undefined) {
            row.periodStartedAt = input.periodStartedAt;
        }
        if (input.periodEndsAt !== undefined) {
            row.periodEndsAt = input.periodEndsAt;
        }
        if (input.trialEndsAt !== undefined) {
            row.trialEndsAt = input.trialEndsAt;
        }
        if (input.willCancelAtPeriodEnd !== undefined) {
            row.willCancelAtPeriodEnd = input.willCancelAtPeriodEnd;
        }
        if (input.scheduledPlanKey !== undefined) {
            row.scheduledPlanKey = input.scheduledPlanKey;
        }
        await this.em.flush();
    }

    async findHouseholdIdByStripeSubscriptionId(
        stripeSubscriptionId: string
    ): Promise<string | null> {
        const row = await this.em.findOne(HouseholdBilling, { stripeSubscriptionId });
        return row?.household ?? null;
    }

    async getStripeCustomerId(householdId: string): Promise<string | null> {
        const row = await this.em.findOne(HouseholdBilling, { household: householdId });
        return row?.stripeCustomerId ?? null;
    }

    async getStripeSubscriptionId(householdId: string): Promise<string | null> {
        const row = await this.em.findOne(HouseholdBilling, { household: householdId });
        return row?.stripeSubscriptionId ?? null;
    }
}
