import type { z } from 'zod';

import {
    AccountKind,
    Currency,
    HouseholdAnswerKey,
    HouseholdRelation,
    HouseholdRole,
    IncomeKind,
    IncomeStability,
    JarExperience,
    type HouseholdSeatUsage,
    HouseholdPermissionAction,
    HouseholdPermissionSection,
    type JarKey,
    type Locale,
    PlanKey,
    type OnboardingInput,
    type OnboardingSplitPreview,
    type OnboardingSplitPreviewInput,
    PayoffStrategy,
    canAddHouseholdMember,
    canInviteOnPlan,
    effectiveSeatCaps,
    isWritableHouseholdRole,
    localeToIntl,
    planAllowsInviteRole,
    roleCan,
} from '@rumtelo/contracts';

import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, BadRequestException, Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';

import type { Auth } from '../engine/auth.config';

import { apiBadRequest, apiForbidden } from '../../../common/errors/api-user-error';
import {
    currentAuthHeaders,
    currentHouseholdContext,
    currentUserId,
} from '../../../common/household/household.context';
import {
    mapToOrpcClientError,
    parseUniqueConstraint,
} from '../../../common/utils/database-constraint-error.util';
import { EmailService } from '../../backoffice/communication/email';
import { JarTemplateService } from '../../backoffice/product/money/template/jar/jar.service';
import { BankAccount } from '../../public/product/money/ledger/bank-account/bank-account.entity';
import { IncomeAmountPeriod } from '../../public/product/money/plan/income/income-amount-period.entity';
import { IncomeSource } from '../../public/product/money/plan/income/income-source.entity';
import { Jar } from '../../public/product/money/plan/jar/jar.entity';
import { AccountSettingsService } from '../user/account/account-settings/account-settings.service';
import { AccountService } from '../user/account/account.service';
import { personDisplayName } from '../user/account/person-display-name.util';
import { HouseholdBillingService } from './household-billing/household-billing.service';
import { HouseholdSettings } from './household-settings/household-settings.entity';
import { HouseholdSettingsService } from './household-settings/household-settings.service';
import { resolveJarSplit, splitIncomeByJar } from './jar-split.util';
import { defaultHouseholdName, mainAccountName } from './onboarding-defaults.util';
import { AuthHousehold } from './managed/household/auth-household.entity';
import { AuthInvitation } from './managed/invitation/auth-invitation.entity';
import { AuthSession } from '../user/managed/session/auth-session.entity';
import { AuthMember } from './managed/member/auth-member.entity';

function parseHouseholdRelation(raw: string | null | undefined): HouseholdRelation | null {
    if (
        raw === HouseholdRelation.FAMILY ||
        raw === HouseholdRelation.CIRCLE ||
        raw === HouseholdRelation.EXTERNAL
    ) {
        return raw;
    }
    return null;
}

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
        @Inject(HouseholdBillingService) private readonly householdBilling: HouseholdBillingService,
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

    async invite(
        householdId: string,
        email: string,
        role: HouseholdRole.MEMBER | HouseholdRole.VIEWER,
        relation: HouseholdRelation
    ) {
        const settings = await this.householdSettings.get(householdId);
        const planKey = settings.planKey;
        if (!canInviteOnPlan(planKey)) {
            throw new BadRequestException('Invites are not available on this plan');
        }

        const snap = await this.householdBilling.getSnapshot(householdId);
        const extras = {
            extraContributor: snap.extraContributorSeats,
            extraViewer: snap.extraViewerSeats,
        };
        if (!planAllowsInviteRole(planKey, role, extras)) {
            throw new BadRequestException(
                role === HouseholdRole.VIEWER
                    ? 'This plan does not allow that invite role'
                    : 'This plan has no contributor seat left to invite — add a seat or invite as viewer'
            );
        }

        const seats = await this.seatOccupation(householdId, new Date());
        if (
            !canAddHouseholdMember(planKey, {
                occupiedSeats: seats.members + seats.pendingInvites,
                writableCount: seats.writableCount,
                viewerCount: seats.viewerCount,
                role,
                extras,
            })
        ) {
            const caps = effectiveSeatCaps(planKey, extras);
            throw new BadRequestException(
                `This plan allows up to ${caps.maxMembers} household members ` +
                    `(${caps.maxWritable} writable / ${caps.maxViewer} viewer, including you)`
            );
        }

        const headers = currentAuthHeaders();
        const result = await this.authService.api.createInvitation({
            body: {
                email,
                role: role.toLowerCase() as 'member' | 'viewer',
                organizationId: householdId,
                // BA organization additionalFields — see auth.config schema.invitation
                relation,
            },
            headers,
        });
        if (!result?.id) throw apiBadRequest('invitation_create_failed');

        const org = await this.em.findOne(AuthHousehold, { id: householdId });
        const { account, user } = await this.accounts.ensureCurrentAccount();
        const inviterSettings = await this.accountSettings.get();
        await this.email.sendHouseholdInvite({
            to: email,
            householdName: org?.name ?? 'Rumtelo',
            inviteUrl: this.email.inviteUrl(result.id, email),
            inviterName: personDisplayName({
                displayName: user.name,
                firstName: account.firstName,
                lastName: account.lastName,
            }),
            role,
            locale: localeToIntl(inviterSettings.locale),
        });

        return { invitationId: result.id };
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    /** Owner removes a MEMBER or VIEWER. The owner seat stays. */
    async removeMember(householdId: string, memberId: string) {
        const target = await this.em.findOne(AuthMember, {
            id: memberId,
            household: householdId,
        });
        if (!target) throw apiBadRequest('member_not_found');
        if (mapRole(target.role) === HouseholdRole.OWNER) {
            throw apiBadRequest('cannot_remove_owner');
        }

        const headers = currentAuthHeaders();
        try {
            await this.authService.api.removeMember({
                body: {
                    memberIdOrEmail: memberId,
                    organizationId: householdId,
                },
                headers,
            });
        } catch (error) {
            throw mapToOrpcClientError(error);
        }

        return { ok: true as const };
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /**
     * Onboarding split preview: income into the six jars in minor units, nothing written.
     * Needs a signed-in session only (no household), and never reads one.
     */
    async previewSplit(
        input: z.infer<typeof OnboardingSplitPreviewInput>
    ): Promise<OnboardingSplitPreview> {
        const templates = await this.requireJarTemplates();
        const shares = resolveJarSplit(templates, input.split);
        return {
            currency: input.currency,
            monthlyNetIncome: input.monthlyNetIncome,
            jars: splitIncomeByJar(input.monthlyNetIncome, shares),
        };
    }

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
        const userIds = memberships.map(member => member.user.id);
        const lastSeenByUserId = await this.lastSeenByUserIds(userIds);
        return Promise.all(
            memberships.map(async member => {
                // Application person is Account; display fields come from Account→User.
                const { account, user } = await this.accounts.ensureAccountForUser(member.user.id);
                const lastSeen = lastSeenByUserId.get(user.id);
                return {
                    id: member.id,
                    householdId,
                    accountId: account.id,
                    userId: user.id,
                    role: mapRole(member.role),
                    relation: parseHouseholdRelation(member.relation),
                    displayName: user.name,
                    email: user.email,
                    image: user.image ?? null,
                    lastSeenAt: lastSeen?.toISOString() ?? null,
                };
            })
        );
    }

    /**
     * Seat use as `invite` counts it: members plus pending, unexpired invitations, against
     * the plan's effective caps. Counts only (no e-mails). Inviting is what this answers, so
     * it follows the invite permission: OWNER and MEMBER, never VIEWER.
     */
    async seats(householdId: string, now = new Date()): Promise<HouseholdSeatUsage> {
        const role = HouseholdRole[currentHouseholdContext().role];
        if (
            !roleCan(
                role,
                HouseholdPermissionSection.HOUSEHOLD_MEMBERS,
                HouseholdPermissionAction.CREATE
            )
        ) {
            throw apiForbidden('role_permission_denied');
        }

        const [settings, snap, seats] = await Promise.all([
            this.householdSettings.get(householdId),
            this.householdBilling.getSnapshot(householdId),
            this.seatOccupation(householdId, now),
        ]);
        const caps = effectiveSeatCaps(settings.planKey, {
            extraContributor: snap.extraContributorSeats,
            extraViewer: snap.extraViewerSeats,
        });
        return {
            members: seats.members,
            pendingInvites: seats.pendingInvites,
            writableUsed: seats.writableCount,
            viewerUsed: seats.viewerCount,
            maxMembers: caps.maxMembers,
            maxWritable: caps.maxWritable,
            maxViewer: caps.maxViewer,
        };
    }

    /** Max `session.updated_at` per user — proxy for last signed-in activity. */
    private async lastSeenByUserIds(userIds: string[]): Promise<Map<string, Date>> {
        const map = new Map<string, Date>();
        if (userIds.length === 0) return map;
        const sessions = await this.em.find(
            AuthSession,
            { user: { $in: userIds } },
            { fields: ['user', 'updatedAt'], orderBy: { updatedAt: 'DESC' } }
        );
        for (const session of sessions) {
            const userId = typeof session.user === 'string' ? session.user : session.user.id;
            if (!map.has(userId)) map.set(userId, session.updatedAt);
        }
        return map;
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

    /**
     * Members + pending invites by role bucket: the single source for `invite` and `seats`.
     * An invitation past `expiresAt` holds no seat (better-auth keeps the row as 'pending'
     * until someone cancels it).
     */
    private async seatOccupation(
        householdId: string,
        now: Date
    ): Promise<{
        members: number;
        pendingInvites: number;
        writableCount: number;
        viewerCount: number;
    }> {
        const memberships = await this.em.find(AuthMember, { household: householdId });
        const pending = await this.em.find(AuthInvitation, {
            household: householdId,
            status: 'pending',
            expiresAt: { $gt: now },
        });

        let writableCount = 0;
        let viewerCount = 0;
        for (const member of memberships) {
            if (isWritableHouseholdRole(mapRole(member.role))) writableCount += 1;
            else viewerCount += 1;
        }
        for (const invite of pending) {
            const role = mapRole(invite.role ?? 'member');
            if (isWritableHouseholdRole(role)) writableCount += 1;
            else viewerCount += 1;
        }

        return {
            members: memberships.length,
            pendingInvites: pending.length,
            writableCount,
            viewerCount,
        };
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

    /** Active jar templates in display order; an empty catalog is a setup error, not a split. */
    private async requireJarTemplates() {
        const templates = await this.jarTemplates.listActive();
        if (templates.length === 0) {
            throw new BadRequestException(
                'Jar catalog is empty — seed backoffice.reference_money_jar_template'
            );
        }
        return templates;
    }

    /**
     * An organization this person owns that never finished onboarding (no settings row):
     * the leftover of a failed `onboard`. Reused on retry so a second call never makes a
     * second organization.
     */
    private async findUnfinishedOwnedHousehold(
        seats: AuthMember[]
    ): Promise<{ id: string; name: string; slug: string } | null> {
        const ownedIds = seats
            .filter(seat => mapRole(seat.role) === HouseholdRole.OWNER)
            .map(seat => seat.household.id);
        if (ownedIds.length === 0) return null;
        const finished = await this.em.find(HouseholdSettings, { household: { $in: ownedIds } });
        const finishedIds = new Set(finished.map(settings => settings.household));
        const unfinishedId = ownedIds.find(householdId => !finishedIds.has(householdId));
        if (!unfinishedId) return null;
        const org = await this.em.findOne(AuthHousehold, { id: unfinishedId });
        return org ? { id: org.id, name: org.name, slug: org.slug } : null;
    }

    private async onboardInternal(input: z.infer<typeof OnboardingInput>, headers: Headers) {
        const userId = currentUserId();
        // Fail fast on ghost sessions (Redis cookie after DB wipe) before BA org create.
        await this.accounts.ensureAccountForUser(userId);

        // Writable seats already own a board — block a second creator onboard.
        // VIEWER-only seats may still start their own household (soft upgrade).
        // An owner seat whose organization never got settings is a failed earlier attempt:
        // it does not count, and is reused below.
        const existingSeats = await this.em.find(AuthMember, { user: userId });
        const unfinished = await this.findUnfinishedOwnedHousehold(existingSeats);
        const hasWritableSeat = existingSeats.some(
            seat => mapRole(seat.role) !== HouseholdRole.VIEWER
        );
        if (hasWritableSeat && !unfinished) {
            throw apiBadRequest('already_household_member');
        }

        const planKey = PlanKey.BASIC;
        const locale = input.locale;

        // Validate before anything is created: the same rules `previewSplit` applies, so the
        // board always matches what the person saw.
        const templates = await this.requireJarTemplates();
        const shares = resolveJarSplit(templates, input.split);
        const percentageByKey = new Map(shares.map(share => [share.key, share.percentage]));

        const householdName = input.householdName?.trim() || defaultHouseholdName(locale);
        let org: { id: string; name: string; slug: string };
        if (unfinished) {
            org = unfinished;
        } else {
            const slug = await this.uniqueOrgSlug(householdName);
            try {
                const created = await this.authService.api.createOrganization({
                    body: { name: householdName, slug },
                    headers,
                });
                if (!created?.id) throw apiBadRequest('household_create_failed');
                org = { id: created.id, name: created.name, slug: created.slug };
            } catch (error) {
                throw mapToOrpcClientError(error);
            }
        }

        await this.authService.api.setActiveOrganization({
            body: { organizationId: org.id },
            headers,
        });

        try {
            await this.seedBoard(org, userId, input, {
                templates,
                percentageByKey,
                planKey,
                locale,
            });
        } catch (error) {
            // Two retries raced on the same unfinished organization and the other one wrote
            // the jars first (unique household + key). Onboarding is idempotent: hand back
            // the household that is already there instead of a 500.
            if (!parseUniqueConstraint(error)) throw error;
            this.em.clear();
            return this.alreadyOnboarded(org, input.currency);
        }

        return {
            id: org.id,
            name: org.name,
            slug: org.slug,
            currency: input.currency,
            periodStartDay: 1,
            createdAt: new Date().toISOString(),
        };
    }

    /** The household a racing onboard already finished, as the caller would have received it. */
    private async alreadyOnboarded(
        org: { id: string; name: string; slug: string },
        fallbackCurrency: Currency
    ) {
        const settings = await this.em.findOne(HouseholdSettings, { household: org.id });
        return {
            id: org.id,
            name: org.name,
            slug: org.slug,
            currency: settings?.currency ?? fallbackCurrency,
            periodStartDay: settings?.money.periodStartDay ?? 1,
            createdAt: new Date().toISOString(),
        };
    }

    /** Everything one onboard writes into the new household, in one flush. */
    private async seedBoard(
        org: { id: string; name: string; slug: string },
        userId: string,
        input: z.infer<typeof OnboardingInput>,
        resolved: {
            templates: Awaited<ReturnType<HouseholdService['requireJarTemplates']>>;
            percentageByKey: Map<JarKey, number>;
            planKey: PlanKey;
            locale: Locale;
        }
    ): Promise<void> {
        const { templates, percentageByKey, planKey, locale } = resolved;
        // One account for the whole board: no bank, no IBAN — those come later from the
        // checklist or Settings. Every jar and the income land on it.
        const mainAccount = this.em.create(BankAccount, {
            household: org.id,
            name: mainAccountName(locale),
            iban: null,
            bank: null,
            kind: AccountKind.CHECKING,
            balance: 0,
            isPrimary: true,
        } as never);

        for (const meta of templates) {
            const percentage = percentageByKey.get(meta.key) ?? Number(meta.percentage);
            this.em.create(Jar, {
                household: org.id,
                key: meta.key,
                name: meta.name,
                subtitle: meta.subtitle,
                icon: meta.icon,
                percentage: percentage.toFixed(2),
                capabilities: { ...meta.capabilities },
                sortOrder: meta.sortOrder,
                defaultAccount: mainAccount.id,
            } as never);
        }

        const settings = this.householdSettings.create({
            householdId: org.id,
            planKey,
            currency: input.currency,
            why: input.why,
            money: {
                incomeStability: input.incomeStability ?? IncomeStability.STABLE,
                payoffStrategy: input.payoffStrategy ?? PayoffStrategy.AVALANCHE,
            },
        });
        // Kept for compatibility: the old bank wizard keyed off these two answers.
        settings.answers = {
            [HouseholdAnswerKey.JAR_EXPERIENCE]: JarExperience.NEW,
            [HouseholdAnswerKey.JAR_BANK_SETUP_DONE]: true,
        };

        await this.accountSettings.upsertForUser(userId, {
            locale: locale as never,
            spendingStyle: input.spendingStyle,
        });
        await this.accountSettings.markOnboarded(userId);

        if (input.monthlyNetIncome > 0) {
            const startedOn = new Date().toISOString().slice(0, 10);
            const source = this.em.create(IncomeSource, {
                household: org.id,
                name: 'My income',
                kind: IncomeKind.SALARY,
                amount: input.monthlyNetIncome,
                isActive: true,
                startedOn,
                endsOn: null,
                account: mainAccount.id,
            } as never);
            this.em.create(IncomeAmountPeriod, {
                household: org.id,
                incomeSource: source,
                amount: input.monthlyNetIncome,
                effectiveOn: startedOn,
            } as never);
        }

        await this.em.flush();
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
            return HouseholdRole.OWNER;
        case 'admin':
            // Collapsed into MEMBER — Owner / Member / Viewer product ladder.
            return HouseholdRole.MEMBER;
        case 'member':
            return HouseholdRole.MEMBER;
        case 'viewer':
        default:
            return HouseholdRole.VIEWER;
    }
}
