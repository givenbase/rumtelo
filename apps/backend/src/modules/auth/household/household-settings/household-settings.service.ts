import {
    type HouseholdKind,
    type HouseholdSettings as HouseholdSettingsDto,
    type HouseholdSettingsPatch,
    type PlanKey,
    PLAN_RANK,
    canUseHouseholdKind,
    capabilitiesFor,
    householdFitsPlan,
} from '@rumtelo/contracts';

import { EntityManager } from '@mikro-orm/postgresql';
import {
    BadRequestException,
    Inject,
    Injectable,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../../../common/config/env.config';
import { apiForbidden } from '../../../../common/errors/api-user-error';
import { isDemoHouseholdSlug } from '@rumtelo/contracts/platform';
import { AuthHousehold } from '../managed/household/auth-household.entity';
import { AuthMember } from '../managed/member/auth-member.entity';
import { HouseholdBilling } from '../household-billing/household-billing.entity';
import { HouseholdBillingService } from '../household-billing/household-billing.service';
import {
    DEFAULT_FEATURE_SETTINGS,
    DEFAULT_MONEY_SETTINGS,
    DEFAULT_WEEK_CHECK_SETTINGS,
    HouseholdSettings,
} from './household-settings.entity';

/** Fields onboarding fixes at creation; everything else takes entity defaults. */
export interface CreateHouseholdSettingsInput {
    householdId: string;
    kind: HouseholdKind;
    planKey: PlanKey;
    currency: HouseholdSettingsDto['currency'];
    why: string | null;
    money: Partial<HouseholdSettingsDto['money']>;
}

/**
 * Household money-board preferences (`household_settings`).
 *
 * One row per Better Auth household; created by onboarding or lazily on first
 * read. Plan tier lives on {@link HouseholdBilling}; this DTO still exposes
 * `planKey` for the app by composing both rows.
 */
@Injectable()
export class HouseholdSettingsService {
    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(ConfigService) private readonly config: ConfigService<Env, true>,
        @Inject(HouseholdBillingService) private readonly billing: HouseholdBillingService
    ) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /**
     * Seed settings + billing during onboarding. Caller flushes.
     * Billing is persisted here so planKey is set before first get().
     */
    create(input: CreateHouseholdSettingsInput): HouseholdSettings {
        const settings = this.em.create(HouseholdSettings, {
            household: input.householdId,
            kind: input.kind,
            currency: input.currency,
            why: input.why,
            money: { ...DEFAULT_MONEY_SETTINGS, ...input.money },
            weekCheck: { ...DEFAULT_WEEK_CHECK_SETTINGS },
            features: { ...DEFAULT_FEATURE_SETTINGS },
            answers: {},
            audienceKeys: [],
            onboardedAt: new Date(),
        } as never);
        this.em.persist(
            this.em.create(HouseholdBilling, {
                household: input.householdId,
                planKey: input.planKey,
            } as never)
        );
        return settings;
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** Settings row is created lazily so onboarding never has to pre-seed it. */
    async get(householdId: string): Promise<HouseholdSettingsDto> {
        let row = await this.em.findOne(HouseholdSettings, { household: householdId });
        if (!row) {
            row = this.em.create(HouseholdSettings, { household: householdId } as never);
            await this.em.persist(row).flush();
        }
        const planKey = await this.billing.getPlanKey(householdId);
        return toSettingsDto(row, planKey);
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    async update(
        householdId: string,
        patch: Omit<HouseholdSettingsPatch, 'householdId'>,
        opts?: { allowPaidUpgrade?: boolean; allowStripeBillingSync?: boolean }
    ): Promise<HouseholdSettingsDto> {
        let row = await this.em.findOne(HouseholdSettings, { household: householdId });
        if (!row) {
            row = this.em.create(HouseholdSettings, { household: householdId } as never);
            this.em.persist(row);
        }

        const currentPlan = await this.billing.getPlanKey(householdId);
        const nextPlan = patch.planKey ?? currentPlan;
        const nextKind = patch.kind ?? row.kind;

        if (patch.kind !== undefined && !canUseHouseholdKind(nextPlan, patch.kind)) {
            throw new BadRequestException(
                `${nextPlan} does not allow household kind ${patch.kind}`
            );
        }

        if (patch.planKey !== undefined) {
            if (!opts?.allowPaidUpgrade && !opts?.allowStripeBillingSync) {
                await this.assertNotDemoHousehold(householdId);
                this.assertClientPlanChangeAllowed(currentPlan, patch.planKey);
            }
            // Stripe is billing source of truth — skip seat/kind fit on cancel/sync
            // so multi-member households can downgrade to Basic without blocking the webhook.
            if (!opts?.allowStripeBillingSync) {
                const memberCount = await this.em.count(AuthMember, { household: householdId });
                if (!householdFitsPlan(patch.planKey, { memberCount, kind: nextKind })) {
                    const caps = capabilitiesFor(patch.planKey);
                    throw new BadRequestException(
                        caps.maxMembers !== null && memberCount > caps.maxMembers
                            ? `Cannot switch to ${patch.planKey}: household has ${memberCount} members (max ${caps.maxMembers})`
                            : `Cannot switch to ${patch.planKey}: household kind ${nextKind} is not allowed`
                    );
                }
            }
        }

        if (patch.why !== undefined) row.why = patch.why;
        if (patch.kind !== undefined) row.kind = patch.kind;
        if (patch.currency !== undefined) row.currency = patch.currency;
        if (patch.money) {
            row.money = { ...row.money, ...patch.money };
        }
        if (patch.weekCheck) {
            row.weekCheck = { ...row.weekCheck, ...patch.weekCheck };
        }
        if (patch.features) {
            row.features = { ...row.features, ...patch.features };
        }
        if (patch.answers) {
            row.answers = { ...row.answers, ...patch.answers };
        }
        if (patch.audienceKeys !== undefined) {
            row.audienceKeys = patch.audienceKeys;
        }

        await this.em.flush();

        if (patch.planKey !== undefined) {
            await this.billing.setPlanKey(householdId, patch.planKey);
        }

        const planKey = await this.billing.getPlanKey(householdId);
        return toSettingsDto(row, planKey);
    }

    /**
     * Plan changes via updateSettings:
     * - BILLING_PREVIEW_BYPASS → free switch (local/preview only)
     * - No Stripe → paid upgrades blocked; downgrades to Basic allowed
     * - Stripe live → upgrades → Checkout; downgrades → schedulePlanChange
     */
    private assertClientPlanChangeAllowed(from: PlanKey, to: PlanKey): void {
        const bypass = this.config.get('BILLING_PREVIEW_BYPASS', { infer: true });
        if (bypass) return;
        if (from === to) return;

        const stripeKey = this.config.get('STRIPE_SECRET_KEY', { infer: true });
        const upgrading = PLAN_RANK[to] > PLAN_RANK[from];

        if (upgrading) {
            if (!stripeKey) {
                throw new ServiceUnavailableException(
                    'Paid plans are unavailable — Stripe billing is not configured'
                );
            }
            throw new ServiceUnavailableException(
                'Paid upgrades require Stripe Checkout — use billing.createCheckoutSession'
            );
        }

        if (stripeKey) {
            throw new ServiceUnavailableException(
                'Plan downgrades take effect at period end — use billing.schedulePlanChange'
            );
        }
        // No Stripe: allow free downgrade via updateSettings.
    }

    /** Seeded demo households keep their plan fixed for product walkthroughs. */
    private async assertNotDemoHousehold(householdId: string): Promise<void> {
        const household = await this.em.findOne(AuthHousehold, { id: householdId });
        if (isDemoHouseholdSlug(household?.slug)) {
            throw apiForbidden('demo_no_plan_change');
        }
    }
}

function toSettingsDto(row: HouseholdSettings, planKey: PlanKey): HouseholdSettingsDto {
    return {
        householdId: row.household,
        why: row.why,
        kind: row.kind,
        currency: row.currency,
        planKey,
        money: { ...DEFAULT_MONEY_SETTINGS, ...row.money },
        weekCheck: { ...DEFAULT_WEEK_CHECK_SETTINGS, ...row.weekCheck },
        features: { ...DEFAULT_FEATURE_SETTINGS, ...row.features },
        answers: row.answers ?? {},
        audienceKeys: row.audienceKeys ?? [],
        onboardedAt: row.onboardedAt ? row.onboardedAt.toISOString() : null,
    };
}
