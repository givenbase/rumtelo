import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
    PlanKey,
    PLAN_RANK,
    PRACTICE_BASE_UNIT_CENTS,
    PRACTICE_CLIENT_SEAT_UNIT_CENTS,
    PRACTICE_STAFF_SEAT_UNIT_CENTS,
    PracticeAddressKind,
    PracticeClientAccess,
    PracticeClientControlFlag,
    PracticeClientLinkStatus,
    PracticeRole,
    PracticeSubscriptionStatus,
    type Address as AddressDto,
    type AddressInput,
    type HouseholdPracticeLink as HouseholdPracticeLinkDto,
    type PracticeAddClientInput,
    type PracticeBillingStatus,
    type PracticeClientLink as PracticeClientLinkDto,
    type PracticeClientPortalSnapshot,
    type PracticeCreateInput,
    type PracticeDetail,
    type PracticeInviteMemberInput,
    type Practice as PracticeDto,
    type PracticeMember as PracticeMemberDto,
    type PracticeUpdateInput,
} from '@rumtelo/contracts';

import { apiBadRequest, apiForbidden, apiNotFound } from '../../../../common/errors/api-user-error';
import { currentUserId, householdStorage } from '../../../../common/household/household.context';
import { MembershipService } from '../../../../common/household/membership.service';
import { currentPeriod } from '../../../../common/utils/period.util';
import { HouseholdBillingService } from '../../../auth/household/household-billing/household-billing.service';
import { HouseholdSettingsService } from '../../../auth/household/household-settings/household-settings.service';
import { AuthHousehold } from '../../../auth/household/managed/household/auth-household.entity';
import { AuthMember } from '../../../auth/household/managed/member/auth-member.entity';
import { AuthUser } from '../../../auth/user/managed/user/auth-user.entity';
import { Account } from '../../../auth/user/account/account.entity';
import { AccountService } from '../../../auth/user/account/account.service';
import { EnergyDashboardService } from '../../product/energy/dashboard/dashboard.service';
import { GrowthDashboardService } from '../../product/growth/dashboard/dashboard.service';
import { DashboardService } from '../../product/money/dashboard/dashboard.service';
import { SoulDashboardService } from '../../product/soul/dashboard/dashboard.service';
import { Address } from '../address/address.entity';
import { BillingService } from '../billing/billing.service';
import { PracticeAddress } from './practice-address/practice-address.entity';
import { PracticeBilling } from './practice-billing/practice-billing.entity';
import { PracticeClientLink } from './practice-client-link/practice-client-link.entity';
import { PracticeClientLinkFlag } from './practice-client-link-flag/practice-client-link-flag.entity';
import { PracticeMember } from './practice-member/practice-member.entity';
import { Practice } from './practice/practice.entity';

/** Managed (= coached) households are Practice-sponsored at Plus (or keep Max). */
const SPONSORED_MANAGE_PLAN = PlanKey.PLUS;

@Injectable()
export class PracticeService {
    private readonly logger = new Logger(PracticeService.name);

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(AccountService) private readonly accounts: AccountService,
        @Inject(BillingService) private readonly billingService: BillingService,
        @Inject(HouseholdBillingService)
        private readonly householdBilling: HouseholdBillingService,
        @Inject(HouseholdSettingsService)
        private readonly householdSettings: HouseholdSettingsService,
        @Inject(MembershipService) private readonly membership: MembershipService,
        @Inject(DashboardService) private readonly moneyDashboard: DashboardService,
        @Inject(GrowthDashboardService) private readonly growthDashboard: GrowthDashboardService,
        @Optional()
        @Inject(EnergyDashboardService)
        private readonly energyDashboard: EnergyDashboardService | null,
        @Optional()
        @Inject(SoulDashboardService)
        private readonly soulDashboard: SoulDashboardService | null
    ) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async create(input: PracticeCreateInput): Promise<PracticeDetail> {
        const { account } = await this.accounts.ensureCurrentAccount();
        const displayName = (input.displayName?.trim() || input.legalName).trim();
        const slug = await this.ensureUniqueSlug(input.slug?.trim() || slugify(displayName));

        const practice = this.em.create(Practice, {
            legalName: input.legalName.trim(),
            displayName,
            slug,
            billingEmail: input.billingEmail.trim().toLowerCase(),
            registrationNumber: emptyToNull(input.registrationNumber),
            vatNumber: emptyToNull(input.vatNumber),
            phone: emptyToNull(input.phone),
            website: emptyToNull(input.website),
            acceptedTermsAt: new Date(input.acceptedTermsAt),
        } as never);

        const address = this.em.create(Address, addressProps(input.billingAddress) as never);
        this.em.persist(practice);
        this.em.persist(address);

        const practiceAddress = this.em.create(PracticeAddress, {
            practice: practice.id,
            address: address.id,
            kind: PracticeAddressKind.BILLING,
        } as never);
        this.em.persist(practiceAddress);

        const member = this.em.create(PracticeMember, {
            practice: practice.id,
            account: account.id,
            role: PracticeRole.OWNER,
            isSeatBillable: true,
            joinedAt: new Date(),
        } as never);
        this.em.persist(member);

        const billing = this.em.create(PracticeBilling, {
            practice: practice.id,
            billableSeatCount: 1,
            billableClientCount: 0,
        } as never);
        this.em.persist(billing);

        await this.em.flush();

        // Fire-and-forget: create Stripe customer + subscription for this practice.
        // Errors are logged but do not fail practice creation.
        void this.billingService
            .syncPracticeSubscription({
                practiceId: practice.id,
                seatCount: 1,
                clientCount: 0,
                name: displayName,
                email: practice.billingEmail,
                address: address
                    ? {
                          line1: address.line1,
                          line2: address.line2,
                          city: address.city,
                          postalCode: address.postalCode,
                          country: address.country,
                      }
                    : null,
            })
            .catch(err =>
                this.logger.warn(
                    `Stripe practice sync failed on create for ${practice.id}: ${err instanceof Error ? err.message : String(err)}`
                )
            );

        return this.toDetail(practice, address);
    }

    async inviteMember(input: PracticeInviteMemberInput): Promise<PracticeMemberDto> {
        await this.assertPracticeRole(input.practiceId, [PracticeRole.OWNER, PracticeRole.ADMIN]);

        if (input.role === PracticeRole.OWNER) {
            throw apiBadRequest('practice_forbidden');
        }

        const user = await this.em.findOne(AuthUser, { email: input.email.trim().toLowerCase() });
        if (!user) throw apiNotFound('practice_invite_user_not_found');

        const { account } = await this.accounts.ensureAccountForUser(user.id);
        const existing = await this.em.findOne(PracticeMember, {
            practice: input.practiceId,
            account: account.id,
        });
        if (existing) return this.toMemberDto(existing);

        const member = this.em.create(PracticeMember, {
            practice: input.practiceId,
            account: account.id,
            role: input.role,
            isSeatBillable: input.isSeatBillable,
            joinedAt: new Date(),
        } as never);
        this.em.persist(member);
        await this.refreshBillableCounts(input.practiceId);
        await this.em.flush();
        void this.syncPracticeStripe(input.practiceId);
        return this.toMemberDto(member);
    }

    async addClient(input: PracticeAddClientInput): Promise<PracticeClientLinkDto> {
        const { account } = await this.assertPracticeRole(input.practiceId, [
            PracticeRole.OWNER,
            PracticeRole.ADMIN,
            PracticeRole.COACH,
        ]);

        const householdId = await this.resolveClientHouseholdId(input);
        const access = input.access ?? PracticeClientAccess.MANAGE;
        const existing = await this.em.findOne(PracticeClientLink, {
            practice: input.practiceId,
            household: householdId,
        });

        if (existing) {
            // Idempotent: already ACTIVE with same access — leave dual-consent alone.
            if (
                existing.status === PracticeClientLinkStatus.ACTIVE &&
                existing.access === access &&
                existing.householdAcceptedAt
            ) {
                return this.toClientLinkDto(existing);
            }
            // Re-offer (access change or re-invite after revoke): INVITED until household accepts.
            await this.applyPracticeInvite(existing, access, account.id);
            await this.refreshBillableCounts(input.practiceId);
            await this.em.flush();
            void this.syncPracticeStripe(input.practiceId);
            return this.toClientLinkDto(existing);
        }

        const link = this.em.create(PracticeClientLink, {
            practice: input.practiceId,
            household: householdId,
            status: PracticeClientLinkStatus.INVITED,
            access,
            addedByAccount: account.id,
            activatedAt: null,
            householdAcceptedAt: null,
        } as never);
        this.em.persist(link);
        await this.refreshBillableCounts(input.practiceId);
        await this.em.flush();
        void this.syncPracticeStripe(input.practiceId);
        return this.toClientLinkDto(link);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async list(): Promise<PracticeDto[]> {
        const { account } = await this.accounts.ensureCurrentAccount();
        const memberships = await this.em.find(PracticeMember, { account: account.id });
        if (memberships.length === 0) return [];
        const practices = await this.em.find(Practice, {
            id: { $in: memberships.map(m => m.practice) },
        });
        return practices.map(practice => this.toPracticeDto(practice));
    }

    async get(practiceId: string): Promise<PracticeDetail> {
        await this.assertPracticeMember(practiceId);
        const practice = await this.em.findOneOrFail(Practice, { id: practiceId });
        const billingAddress = await this.loadBillingAddress(practiceId);
        return this.toDetail(practice, billingAddress);
    }

    async members(practiceId: string): Promise<PracticeMemberDto[]> {
        await this.assertPracticeMember(practiceId);
        const rows = await this.em.find(PracticeMember, { practice: practiceId });
        return this.toMemberDtos(rows);
    }

    async clients(practiceId: string): Promise<PracticeClientLinkDto[]> {
        await this.assertPracticeMember(practiceId);
        const rows = await this.em.find(PracticeClientLink, {
            practice: practiceId,
            status: { $ne: PracticeClientLinkStatus.REVOKED },
        });
        return this.toClientLinkDtos(rows);
    }

    /**
     * Server-composed portal metrics for an ACTIVE dual-consent link.
     * Practice UI must not rely on client header query-scope for these reads.
     */
    async clientPortalSnapshot(
        practiceId: string,
        linkId: string
    ): Promise<PracticeClientPortalSnapshot> {
        await this.assertPracticeMember(practiceId);
        const link = await this.em.findOne(PracticeClientLink, {
            id: linkId,
            practice: practiceId,
        });
        if (!link) throw apiNotFound('practice_client_link_not_found');
        if (link.status !== PracticeClientLinkStatus.ACTIVE || !link.householdAcceptedAt) {
            throw apiForbidden('practice_client_link_not_active');
        }

        const period = currentPeriod();
        const settings = await this.householdSettings.get(link.household);
        const userId = currentUserId();

        return householdStorage.run(
            { userId, householdId: link.household, role: 'VIEWER' },
            async () => {
                const [money, growth, energy, soul] = await Promise.all([
                    this.moneyDashboard.get(link.household, period),
                    this.growthDashboard.get(),
                    this.energyDashboard?.get() ?? Promise.resolve(null),
                    this.soulDashboard?.get() ?? Promise.resolve(null),
                ]);
                return {
                    linkId: link.id,
                    practiceId,
                    householdId: link.household,
                    currency: settings.currency,
                    period,
                    moneySpentTotal: money.spentTotal,
                    growthIncomeMonthly: growth.incomeMonthly,
                    energyTrainSessionsThisWeek: energy?.trainSessionsThisWeek ?? 0,
                    soulStillnessStreakDays: soul?.stillnessStreakDays ?? null,
                };
            }
        );
    }

    /** Household-facing Practice contracts (INVITED + ACTIVE). */
    async listHouseholdPracticeLinks(householdId: string): Promise<HouseholdPracticeLinkDto[]> {
        await this.assertHouseholdOwnerOrAdmin(householdId);
        const rows = await this.em.find(PracticeClientLink, {
            household: householdId,
            status: { $ne: PracticeClientLinkStatus.REVOKED },
        });
        return this.toHouseholdPracticeLinkDtos(rows);
    }

    async acceptHouseholdPracticeLink(
        householdId: string,
        linkId: string
    ): Promise<HouseholdPracticeLinkDto> {
        await this.assertHouseholdOwnerOrAdmin(householdId);
        const link = await this.em.findOne(PracticeClientLink, {
            id: linkId,
            household: householdId,
        });
        if (!link) throw apiNotFound('practice_client_link_not_found');
        if (link.status !== PracticeClientLinkStatus.INVITED) {
            throw apiBadRequest('practice_client_link_not_invited');
        }

        const now = new Date();
        link.householdAcceptedAt = now;
        link.activatedAt = now;
        link.status = PracticeClientLinkStatus.ACTIVE;
        link.revokedAt = null;

        await this.applyAccessBilling(link.id, householdId, link.access);
        await this.refreshBillableCounts(link.practice);
        await this.em.flush();
        void this.syncPracticeStripe(link.practice);
        return this.toHouseholdPracticeLinkDto(link);
    }

    async rejectHouseholdPracticeLink(
        householdId: string,
        linkId: string
    ): Promise<HouseholdPracticeLinkDto> {
        await this.assertHouseholdOwnerOrAdmin(householdId);
        const link = await this.em.findOne(PracticeClientLink, {
            id: linkId,
            household: householdId,
        });
        if (!link) throw apiNotFound('practice_client_link_not_found');
        if (link.status !== PracticeClientLinkStatus.INVITED) {
            throw apiBadRequest('practice_client_link_not_invited');
        }
        link.status = PracticeClientLinkStatus.REVOKED;
        link.revokedAt = new Date();
        await this.clearSponsorFlag(link.id);
        await this.refreshBillableCounts(link.practice);
        await this.em.flush();
        void this.syncPracticeStripe(link.practice);
        return this.toHouseholdPracticeLinkDto(link);
    }

    async unlinkHouseholdPracticeLink(
        householdId: string,
        linkId: string
    ): Promise<HouseholdPracticeLinkDto> {
        await this.assertHouseholdOwnerOrAdmin(householdId);
        const link = await this.em.findOne(PracticeClientLink, {
            id: linkId,
            household: householdId,
        });
        if (!link) throw apiNotFound('practice_client_link_not_found');
        if (link.status === PracticeClientLinkStatus.REVOKED) {
            return this.toHouseholdPracticeLinkDto(link);
        }
        link.status = PracticeClientLinkStatus.REVOKED;
        link.revokedAt = new Date();
        await this.clearSponsorFlag(link.id);
        await this.refreshBillableCounts(link.practice);
        await this.em.flush();
        void this.syncPracticeStripe(link.practice);
        return this.toHouseholdPracticeLinkDto(link);
    }

    async billingStatus(practiceId: string): Promise<PracticeBillingStatus> {
        await this.assertPracticeMember(practiceId);
        const practice = await this.em.findOneOrFail(Practice, { id: practiceId });
        let billing = await this.em.findOne(PracticeBilling, { practice: practiceId });
        if (!billing) {
            billing = this.em.create(PracticeBilling, {
                practice: practiceId,
                billableSeatCount: 0,
                billableClientCount: 0,
                status: PracticeSubscriptionStatus.NONE,
            } as never);
            this.em.persist(billing);
        }
        billing.billableSeatCount = await this.countBillableSeats(practiceId);
        billing.billableClientCount = await this.countBillableClients(practiceId);
        await this.em.flush();
        const status = billing.status ?? PracticeSubscriptionStatus.NONE;
        return {
            practiceId,
            stripeCustomerId: billing.stripeCustomerId,
            stripeSubscriptionId: billing.stripeSubscriptionId,
            status,
            hasActiveSubscription:
                status === PracticeSubscriptionStatus.ACTIVE ||
                status === PracticeSubscriptionStatus.TRIALING,
            practiceStartedAt: practice.createdAt.toISOString(),
            billableSeatCount: billing.billableSeatCount,
            billableClientCount: billing.billableClientCount,
            baseAmountCents: PRACTICE_BASE_UNIT_CENTS,
            staffUnitAmountCents: PRACTICE_STAFF_SEAT_UNIT_CENTS,
            clientUnitAmountCents: PRACTICE_CLIENT_SEAT_UNIT_CENTS,
            currency: 'eur',
            periodStartedAt: billing.periodStartedAt?.toISOString() ?? null,
            periodEndsAt: billing.periodEndsAt?.toISOString() ?? null,
        };
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    async update(input: PracticeUpdateInput): Promise<PracticeDetail> {
        await this.assertPracticeRole(input.practiceId, [PracticeRole.OWNER, PracticeRole.ADMIN]);
        const practice = await this.em.findOneOrFail(Practice, { id: input.practiceId });

        if (input.legalName !== undefined) practice.legalName = input.legalName.trim();
        if (input.displayName !== undefined) practice.displayName = input.displayName.trim();
        if (input.billingEmail !== undefined) {
            practice.billingEmail = input.billingEmail.trim().toLowerCase();
        }
        if (input.registrationNumber !== undefined) {
            practice.registrationNumber = emptyToNull(input.registrationNumber);
        }
        if (input.vatNumber !== undefined) practice.vatNumber = emptyToNull(input.vatNumber);
        if (input.phone !== undefined) practice.phone = emptyToNull(input.phone);
        if (input.website !== undefined) practice.website = emptyToNull(input.website);

        let billingAddress = await this.loadBillingAddress(input.practiceId);
        if (input.billingAddress) {
            billingAddress = await this.upsertBillingAddress(
                input.practiceId,
                input.billingAddress
            );
        }

        await this.em.flush();
        return this.toDetail(practice, billingAddress);
    }

    async revokeClient(practiceId: string, linkId: string): Promise<PracticeClientLinkDto> {
        await this.assertPracticeRole(practiceId, [
            PracticeRole.OWNER,
            PracticeRole.ADMIN,
            PracticeRole.COACH,
        ]);
        const link = await this.em.findOne(PracticeClientLink, {
            id: linkId,
            practice: practiceId,
        });
        if (!link) throw apiNotFound('practice_client_link_not_found');
        link.status = PracticeClientLinkStatus.REVOKED;
        link.revokedAt = new Date();
        await this.clearSponsorFlag(link.id);
        await this.refreshBillableCounts(practiceId);
        await this.em.flush();
        void this.syncPracticeStripe(practiceId);
        return this.toClientLinkDto(link);
    }

    /** Role of the current account on a practice, or null. */
    async roleForCurrentAccount(practiceId: string): Promise<PracticeRole | null> {
        const { account } = await this.accounts.ensureCurrentAccount();
        const member = await this.em.findOne(PracticeMember, {
            practice: practiceId,
            account: account.id,
        });
        return member?.role ?? null;
    }

    // ====================================================================
    // ? Helpers
    // ====================================================================

    private async assertPracticeMember(practiceId: string) {
        const role = await this.roleForCurrentAccount(practiceId);
        if (!role) throw apiForbidden('practice_not_member');
        const practice = await this.em.findOne(Practice, { id: practiceId });
        if (!practice) throw apiNotFound('practice_not_found');
        return role;
    }

    private async assertPracticeRole(practiceId: string, allowed: PracticeRole[]) {
        const { account } = await this.accounts.ensureCurrentAccount();
        const member = await this.em.findOne(PracticeMember, {
            practice: practiceId,
            account: account.id,
        });
        if (!member) throw apiForbidden('practice_not_member');
        if (!allowed.includes(member.role)) throw apiForbidden('practice_forbidden');
        const practice = await this.em.findOne(Practice, { id: practiceId });
        if (!practice) throw apiNotFound('practice_not_found');
        return { account, member, practice };
    }

    private async resolveClientHouseholdId(input: PracticeAddClientInput): Promise<string> {
        if (input.householdId) {
            const hh = await this.em.findOne(AuthHousehold, { id: input.householdId });
            if (!hh) throw apiNotFound('household_not_found');
            return hh.id;
        }
        if (!input.email) throw apiBadRequest('practice_invite_user_not_found');
        const user = await this.em.findOne(AuthUser, { email: input.email.trim().toLowerCase() });
        if (!user) throw apiNotFound('practice_invite_user_not_found');
        const membership = await this.em.findOne(
            AuthMember,
            { user: user.id },
            { orderBy: { createdAt: 'ASC' } }
        );
        if (!membership) throw apiNotFound('household_not_found');
        return typeof membership.household === 'string'
            ? membership.household
            : membership.household.id;
    }

    private async loadBillingAddress(practiceId: string): Promise<Address | null> {
        const link = await this.em.findOne(PracticeAddress, {
            practice: practiceId,
            kind: PracticeAddressKind.BILLING,
        });
        if (!link) return null;
        return this.em.findOne(Address, { id: link.address });
    }

    private async upsertBillingAddress(practiceId: string, input: AddressInput): Promise<Address> {
        const link = await this.em.findOne(PracticeAddress, {
            practice: practiceId,
            kind: PracticeAddressKind.BILLING,
        });
        if (link) {
            const address = await this.em.findOneOrFail(Address, { id: link.address });
            Object.assign(address, addressProps(input));
            return address;
        }
        const address = this.em.create(Address, addressProps(input) as never);
        this.em.persist(address);
        this.em.persist(
            this.em.create(PracticeAddress, {
                practice: practiceId,
                address: address.id,
                kind: PracticeAddressKind.BILLING,
            } as never)
        );
        return address;
    }

    private async countBillableSeats(practiceId: string): Promise<number> {
        return this.em.count(PracticeMember, { practice: practiceId, isSeatBillable: true });
    }

    private async countBillableClients(practiceId: string): Promise<number> {
        // VIEW = free (Basic look-along). Only MANAGE clients meter the Practice.
        return this.em.count(PracticeClientLink, {
            practice: practiceId,
            status: PracticeClientLinkStatus.ACTIVE,
            access: PracticeClientAccess.MANAGE,
        });
    }

    private async refreshBillableCounts(practiceId: string): Promise<void> {
        const billing = await this.em.findOne(PracticeBilling, { practice: practiceId });
        if (!billing) return;
        billing.billableSeatCount = await this.countBillableSeats(practiceId);
        billing.billableClientCount = await this.countBillableClients(practiceId);
    }

    /**
     * Practice invite / re-offer: always INVITED. Sponsorship waits for household accept.
     */
    private async applyPracticeInvite(
        link: PracticeClientLink,
        access: PracticeClientAccess,
        addedByAccountId: string
    ): Promise<void> {
        link.access = access;
        link.addedByAccount = addedByAccountId;
        link.revokedAt = null;
        link.status = PracticeClientLinkStatus.INVITED;
        link.activatedAt = null;
        link.householdAcceptedAt = null;
        await this.clearSponsorFlag(link.id);
    }

    /**
     * MANAGE ⇒ Practice sponsors ⇒ household at least Plus + billable client seat.
     * VIEW ⇒ no sponsor flag, no client seat.
     */
    private async applyAccessBilling(
        linkId: string,
        householdId: string,
        access: PracticeClientAccess
    ): Promise<void> {
        if (access === PracticeClientAccess.MANAGE) {
            await this.ensureLinkFlag(linkId, PracticeClientControlFlag.SPONSOR_PLAN);
            const snap = await this.householdBilling.getSnapshot(householdId);
            if (PLAN_RANK[snap.planKey] < PLAN_RANK[SPONSORED_MANAGE_PLAN]) {
                await this.householdBilling.setPlanKey(householdId, SPONSORED_MANAGE_PLAN);
                this.logger.log(
                    `Practice-sponsored household ${householdId} → ${SPONSORED_MANAGE_PLAN}`
                );
            }
            return;
        }

        await this.clearSponsorFlag(linkId);
    }

    private async clearSponsorFlag(linkId: string): Promise<void> {
        const sponsor = await this.em.findOne(PracticeClientLinkFlag, {
            link: linkId,
            flag: PracticeClientControlFlag.SPONSOR_PLAN,
        });
        if (sponsor) this.em.remove(sponsor);
    }

    private async ensureLinkFlag(linkId: string, flag: PracticeClientControlFlag): Promise<void> {
        const existing = await this.em.findOne(PracticeClientLinkFlag, { link: linkId, flag });
        if (existing) return;
        this.em.persist(this.em.create(PracticeClientLinkFlag, { link: linkId, flag } as never));
    }

    private async assertHouseholdOwnerOrAdmin(householdId: string): Promise<void> {
        const userId = currentUserId();
        const role = await this.membership.roleFor(userId, householdId);
        if (role !== 'OWNER' && role !== 'ADMIN') {
            throw apiForbidden('practice_household_forbidden');
        }
    }

    /**
     * Sync billable seat count to Stripe for the given practice.
     * Loads practice + billing address and fires syncPracticeSubscription.
     * Errors are logged but never thrown to callers.
     */
    private async syncPracticeStripe(practiceId: string): Promise<void> {
        try {
            const practice = await this.em.findOne(Practice, { id: practiceId });
            if (!practice) return;
            const seatCount = await this.countBillableSeats(practiceId);
            const clientCount = await this.countBillableClients(practiceId);
            const billingAddress = await this.loadBillingAddress(practiceId);
            await this.billingService.syncPracticeSubscription({
                practiceId,
                seatCount,
                clientCount,
                name: practice.displayName,
                email: practice.billingEmail,
                address: billingAddress
                    ? {
                          line1: billingAddress.line1,
                          line2: billingAddress.line2,
                          city: billingAddress.city,
                          postalCode: billingAddress.postalCode,
                          country: billingAddress.country,
                      }
                    : null,
            });
        } catch (err) {
            this.logger.warn(
                `Stripe practice sync failed for ${practiceId}: ${err instanceof Error ? err.message : String(err)}`
            );
        }
    }

    private toPracticeDto(practice: Practice): PracticeDto {
        return {
            id: practice.id,
            legalName: practice.legalName,
            displayName: practice.displayName,
            slug: practice.slug,
            billingEmail: practice.billingEmail,
            registrationNumber: practice.registrationNumber,
            vatNumber: practice.vatNumber,
            phone: practice.phone,
            website: practice.website,
            acceptedTermsAt: practice.acceptedTermsAt.toISOString(),
            createdAt: practice.createdAt.toISOString(),
            updatedAt: practice.updatedAt.toISOString(),
        };
    }

    private toAddressDto(address: Address): AddressDto {
        return {
            id: address.id,
            line1: address.line1,
            line2: address.line2,
            postalCode: address.postalCode,
            city: address.city,
            country: address.country,
            createdAt: address.createdAt.toISOString(),
            updatedAt: address.updatedAt.toISOString(),
        };
    }

    private toDetail(practice: Practice, address: Address | null): PracticeDetail {
        return {
            ...this.toPracticeDto(practice),
            billingAddress: address ? this.toAddressDto(address) : null,
        };
    }

    private async toMemberDto(member: PracticeMember): Promise<PracticeMemberDto> {
        const [dto] = await this.toMemberDtos([member]);
        return dto!;
    }

    private async toMemberDtos(members: PracticeMember[]): Promise<PracticeMemberDto[]> {
        if (members.length === 0) return [];
        const accountIds = [...new Set(members.map(member => member.account))];
        const accounts = await this.em.find(
            Account,
            { id: { $in: accountIds } },
            { populate: ['user'] }
        );
        const accountById = new Map(accounts.map(account => [account.id, account]));

        return members.map(member => {
            const account = accountById.get(member.account);
            const user = account?.user;
            const name =
                user?.name?.trim() ||
                [account?.firstName, account?.lastName].filter(Boolean).join(' ').trim() ||
                member.account;
            const email = user?.email?.trim() || '';

            return {
                id: member.id,
                practiceId: member.practice,
                accountId: member.account,
                name,
                email: email || `${member.account}@unknown`,
                role: member.role,
                isSeatBillable: member.isSeatBillable,
                joinedAt: member.joinedAt.toISOString(),
            };
        });
    }

    private async toClientLinkDto(link: PracticeClientLink): Promise<PracticeClientLinkDto> {
        const [dto] = await this.toClientLinkDtos([link]);
        return dto!;
    }

    private async toClientLinkDtos(links: PracticeClientLink[]): Promise<PracticeClientLinkDto[]> {
        if (links.length === 0) return [];

        const householdIds = [...new Set(links.map(link => link.household))];
        const linkIds = links.map(link => link.id);

        const [households, members, flagRows] = await Promise.all([
            this.em.find(AuthHousehold, { id: { $in: householdIds } }),
            this.em.find(AuthMember, { household: { $in: householdIds } }, { populate: ['user'] }),
            this.em.find(PracticeClientLinkFlag, { link: { $in: linkIds } }),
        ]);

        const householdById = new Map(households.map(row => [row.id, row]));
        const membersByHousehold = new Map<string, AuthMember[]>();
        for (const member of members) {
            const householdId = member.household.id;
            const list = membersByHousehold.get(householdId) ?? [];
            list.push(member);
            membersByHousehold.set(householdId, list);
        }
        const flagsByLink = new Map<string, PracticeClientControlFlag[]>();
        for (const flag of flagRows) {
            const list = flagsByLink.get(flag.link) ?? [];
            list.push(flag.flag);
            flagsByLink.set(flag.link, list);
        }

        return links.map(link => {
            const household = householdById.get(link.household);
            const householdMembers = membersByHousehold.get(link.household) ?? [];
            const owner = householdMembers.find(member => member.role.toLowerCase() === 'owner');
            const ownerName = owner?.user?.name?.trim() || null;

            return {
                id: link.id,
                practiceId: link.practice,
                householdId: link.household,
                householdName: household?.name?.trim() || link.household,
                ownerName,
                memberCount: householdMembers.length,
                status: link.status,
                access: link.access,
                controlFlags: flagsByLink.get(link.id) ?? [],
                addedByAccountId: link.addedByAccount,
                householdAcceptedAt: link.householdAcceptedAt?.toISOString() ?? null,
                activatedAt: link.activatedAt?.toISOString() ?? null,
                revokedAt: link.revokedAt?.toISOString() ?? null,
                createdAt: link.createdAt.toISOString(),
                updatedAt: link.updatedAt.toISOString(),
            };
        });
    }

    private async toHouseholdPracticeLinkDto(
        link: PracticeClientLink
    ): Promise<HouseholdPracticeLinkDto> {
        const [dto] = await this.toHouseholdPracticeLinkDtos([link]);
        return dto!;
    }

    private async toHouseholdPracticeLinkDtos(
        links: PracticeClientLink[]
    ): Promise<HouseholdPracticeLinkDto[]> {
        if (links.length === 0) return [];
        const practiceIds = [...new Set(links.map(link => link.practice))];
        const practices = await this.em.find(Practice, { id: { $in: practiceIds } });
        const practiceById = new Map(practices.map(row => [row.id, row]));

        return links.map(link => {
            const practice = practiceById.get(link.practice);
            return {
                id: link.id,
                practiceId: link.practice,
                practiceName: practice?.displayName?.trim() || link.practice,
                householdId: link.household,
                status: link.status,
                access: link.access,
                householdAcceptedAt: link.householdAcceptedAt?.toISOString() ?? null,
                activatedAt: link.activatedAt?.toISOString() ?? null,
                revokedAt: link.revokedAt?.toISOString() ?? null,
                createdAt: link.createdAt.toISOString(),
                updatedAt: link.updatedAt.toISOString(),
            };
        });
    }

    private async ensureUniqueSlug(base: string): Promise<string> {
        let slug = slugify(base) || `practice-${Date.now().toString(36)}`;
        let attempt = 0;
        // Sequential: each candidate must be checked before inventing the next.
        while (await this.em.findOne(Practice, { slug })) {
            attempt += 1;
            slug = `${slugify(base).slice(0, 70)}-${attempt}`;
            if (attempt > 50) throw apiBadRequest('practice_slug_taken');
        }
        return slug;
    }
}

function addressProps(input: AddressInput) {
    return {
        line1: input.line1.trim(),
        line2: emptyToNull(input.line2),
        postalCode: input.postalCode.trim(),
        city: input.city.trim(),
        country: input.country.toUpperCase(),
    };
}

function emptyToNull(value: string | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function slugify(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}
