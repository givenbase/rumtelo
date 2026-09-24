import type { z } from 'zod';

import {
    Currency,
    HouseholdKind,
    HouseholdRole,
    IncomeKind,
    IncomeStability,
    PlanKey,
    type OnboardingInput,
    PayoffStrategy,
    canAddHouseholdMember,
    canInviteOnPlan,
    canUseHouseholdKind,
    capabilitiesFor,
} from '@rumtelo/contracts';

import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, BadRequestException, Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';

import type { Auth } from '../engine/auth.config';

import { apiBadRequest } from '../../../common/errors/api-user-error';
import { currentUserId, currentAuthHeaders } from '../../../common/household/household.context';
import { mapToOrpcClientError } from '../../../common/utils/database-constraint-error.util';
import { EmailService } from '../../backoffice/communication/email';
import { JarTemplateService } from '../../backoffice/product/money/template/jar/jar.service';
import { IncomeAmountPeriod } from '../../public/product/money/plan/income/income-amount-period.entity';
import { IncomeSource } from '../../public/product/money/plan/income/income-source.entity';
import { Jar } from '../../public/product/money/plan/jar/jar.entity';
import { AccountSettingsService } from '../user/account/account-settings/account-settings.service';
import { AccountService } from '../user/account/account.service';
import { HouseholdSettingsService } from './household-settings/household-settings.service';
import { AuthHousehold } from './managed/household/auth-household.entity';
import { AuthInvitation } from './managed/invitation/auth-invitation.entity';
import { AuthMember } from './managed/member/auth-member.entity';

/**
 * Household aggregate — orchestrates Better Auth's organization plugin
 * (`auth.household`, `auth.member`, `auth.invitation`) for Rumtelo.
 *
 * Better Auth writes those tables; this service calls its API for create /
 * invite / set-active and reads the managed entities for lists. Board prefs
 * live in `household-settings/`.
 */
@Injectable()
export class HouseholdService {
    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(AuthService) private readonly authService: AuthService<Auth>,
        @Inject(AccountService) private readonly accounts: AccountService,
        @Inject(AccountSettingsService) private readonly accountSettings: AccountSettingsService,
        @Inject(HouseholdSettingsService)
        private readonly householdSettings: HouseholdSettingsService,
        @Inject(JarTemplateService) private readonly jarTemplates: JarTemplateService,
        @Inject(EmailService) private readonly email: EmailService
    ) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async onboard(input: z.infer<typeof OnboardingInput>) {
        const headers = currentAuthHeaders();
        return this.onboardInternal(input, headers);
    }

    async invite(householdId: string, email: string, role: HouseholdRole) {
        const settings = await this.householdSettings.get(householdId);
        const planKey = settings.planKey;
        if (!canInviteOnPlan(planKey)) {
            throw new BadRequestException(
                'Basic is solo-only — upgrade to Plus to invite household members'
            );
        }

        const occupied = await this.occupiedSeats(householdId);
        if (!canAddHouseholdMember(planKey, occupied)) {
            const max = capabilitiesFor(planKey).maxMembers;
            throw new BadRequestException(
                max === null
                    ? 'Cannot invite another member right now'
                    : `This plan allows up to ${max} household members (including you)`
            );
        }

        const headers = currentAuthHeaders();
        const result = await this.authService.api.createInvitation({
            body: {
                email,
                role: role.toLowerCase() as 'owner' | 'member' | 'viewer',
                organizationId: householdId,
            },
            headers,
        });
        if (!result?.id) throw apiBadRequest('invitation_create_failed');

        const org = await this.em.findOne(AuthHousehold, { id: householdId });
        await this.email.sendHouseholdInvite({
            to: email,
            householdName: org?.name ?? 'Rumtelo',
            inviteUrl: this.email.inviteUrl(result.id),
            role,
        });

        return { invitationId: result.id };
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async listHouseholds() {
        const userId = currentUserId();
        const memberships = await this.em.find(
            AuthMember,
            { user: userId },
            { populate: ['household'], orderBy: { household: { createdAt: 'DESC' } } }
        );
        return memberships.map(member => ({
            id: member.household.id,
            name: member.household.name,
            slug: member.household.slug,
            currency: Currency.EUR,
            periodStartDay: 1,
            createdAt: member.household.createdAt.toISOString(),
        }));
    }

    async members(householdId: string) {
        const memberships = await this.em.find(
            AuthMember,
            { household: householdId },
            { populate: ['user'] }
        );
        return Promise.all(
            memberships.map(async member => {
                // Application person is Account; display fields come from Account→User.
                const { account, user } = await this.accounts.ensureAccountForUser(member.user.id);
                return {
                    id: member.id,
                    householdId,
                    accountId: account.id,
                    userId: user.id,
                    role: mapRole(member.role),
                    displayName: user.name,
                    email: user.email,
                    image: user.image ?? null,
                };
            })
        );
    }

    async current(householdId: string) {
        const org = await this.em.findOne(AuthHousehold, { id: householdId });
        if (!org) throw apiBadRequest('household_not_found');

        const settings = await this.householdSettings.get(householdId);
        return {
            id: org.id,
            name: org.name,
            slug: org.slug,
            currency: settings.currency,
            periodStartDay: settings.money.periodStartDay,
            createdAt: new Date(org.createdAt).toISOString(),
        };
    }

    // ====================================================================
    // Private helpers
    // ====================================================================

    /** Members + pending invites occupy seats against plan.maxMembers. */
    private async occupiedSeats(householdId: string): Promise<number> {
        const members = await this.em.count(AuthMember, { household: householdId });
        const pending = await this.em.count(AuthInvitation, {
            household: householdId,
            status: 'pending',
        });
        return members + pending;
    }

    /**
     * Unique organization.slug. Prefer readable slugify(name); on collision append
     * a short random suffix. householdId is a uuid minted by Better Auth.
     */
    private async uniqueOrgSlug(name: string): Promise<string> {
        const base = slugify(name);
        const existing = await this.em.findOne(AuthHousehold, { slug: base });
        if (!existing) return base;
        return `${base.slice(0, 72)}-${crypto.randomUUID().slice(0, 8)}`;
    }

    private async onboardInternal(input: z.infer<typeof OnboardingInput>, headers: Headers) {
        const userId = currentUserId();
        const planKey = PlanKey.BASIC;
        const kind = canUseHouseholdKind(planKey, input.kind) ? input.kind : HouseholdKind.SOLO;

        const splitTotal = input.split.reduce(
            (sum: number, share: { percentage: number }) => sum + share.percentage,
            0
        );
        if (Math.abs(splitTotal - 100) > 0.01) {
            throw apiBadRequest('jar_split_total', { total: splitTotal });
        }

        const slug = await this.uniqueOrgSlug(input.householdName);
        let org: { id: string; name: string; slug: string };
        try {
            const created = await this.authService.api.createOrganization({
                body: { name: input.householdName, slug },
                headers,
            });
            if (!created?.id) throw apiBadRequest('household_create_failed');
            org = { id: created.id, name: created.name, slug: created.slug };
        } catch (error) {
            throw mapToOrpcClientError(error);
        }

        await this.authService.api.setActiveOrganization({
            body: { organizationId: org.id },
            headers,
        });

        const splitByKey = new Map(
            input.split.map((share: { key: string; percentage: number }) => [
                share.key.toUpperCase(),
                share.percentage,
            ])
        );

        const templates = await this.jarTemplates.listActive();
        if (templates.length === 0) {
            throw new BadRequestException(
                'Jar catalog is empty — seed backoffice.reference_money_jar_template'
            );
        }

        for (const meta of templates) {
            const pct = splitByKey.get(meta.key) ?? Number(meta.percentage);
            this.em.create(Jar, {
                household: org.id,
                key: meta.key,
                name: meta.name,
                subtitle: meta.subtitle,
                icon: meta.icon,
                percentage: pct.toFixed(2),
                capabilities: { ...meta.capabilities },
                sortOrder: meta.sortOrder,
            } as never);
        }

        this.householdSettings.create({
            householdId: org.id,
            kind,
            planKey,
            currency: input.currency,
            why: input.why,
            money: {
                incomeStability: input.incomeStability ?? IncomeStability.STABLE,
                payoffStrategy: input.payoffStrategy ?? PayoffStrategy.AVALANCHE,
            },
        });

        await this.accountSettings.upsertForUser(userId, {
            locale: input.locale as never,
            spendingStyle: input.spendingStyle,
        });
        await this.accountSettings.markOnboarded(userId);

        if (input.monthlyNetIncome > 0) {
            const startedOn = new Date().toISOString().slice(0, 10);
            const source = this.em.create(IncomeSource, {
                household: org.id,
                name: 'Netto inkomen',
                kind: IncomeKind.SALARY,
                amount: input.monthlyNetIncome,
                isActive: true,
                startedOn,
            } as never);
            this.em.create(IncomeAmountPeriod, {
                household: org.id,
                incomeSource: source,
                amount: input.monthlyNetIncome,
                effectiveOn: startedOn,
            } as never);
        }

        await this.em.flush();

        return {
            id: org.id,
            name: org.name,
            slug: org.slug,
            currency: input.currency,
            periodStartDay: 1,
            createdAt: new Date().toISOString(),
        };
    }
}

function slugify(name: string) {
    return (
        name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 80) || 'huishouden'
    );
}

function mapRole(raw: string): HouseholdRole {
    switch (raw.toLowerCase()) {
        case 'owner':
        case 'admin':
            return HouseholdRole.OWNER;
        case 'member':
            return HouseholdRole.MEMBER;
        case 'viewer':
        default:
            return HouseholdRole.VIEWER;
    }
}
