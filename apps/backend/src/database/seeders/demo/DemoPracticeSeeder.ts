/**
 * Seeds the Practice demo persona (`practice@rumtelo.com`) + control-plane rows.
 * Runs after DemoHouseholdSeeder. Only Basic (`demo-basic`) gets a pending
 * INVITED client link — Max/Plus stay unlinked.
 */
import type { EntityManager } from '@mikro-orm/postgresql';
import { Seeder } from '@mikro-orm/seeder';
import {
    Currency,
    HouseholdKind,
    IncomeStability,
    Locale,
    PayoffStrategy,
    PlanKey,
    PracticeAddressKind,
    PracticeClientAccess,
    PracticeClientControlFlag,
    PracticeClientLinkStatus,
    PracticeRole,
    SpendingStyle,
    Theme,
} from '@rumtelo/contracts';
import { DEMO_PRACTICE } from '@rumtelo/contracts/platform';
import { v7 as uuidv7 } from 'uuid';

import type { Env } from '../../../common/config/env.config';
import { createAuth } from '../../../modules/auth/engine/auth.config';
import { AuthHousehold } from '../../../modules/auth/household/managed/household/auth-household.entity';
import { AuthMember } from '../../../modules/auth/household/managed/member/auth-member.entity';
import { HouseholdBilling } from '../../../modules/auth/household/household-billing/household-billing.entity';
import { HouseholdSettings } from '../../../modules/auth/household/household-settings/household-settings.entity';
import { Account } from '../../../modules/auth/user/account/account.entity';
import { AccountSettings } from '../../../modules/auth/user/account/account-settings/account-settings.entity';
import { AuthUser } from '../../../modules/auth/user/managed/user/auth-user.entity';
import { Address } from '../../../modules/public/platform/address/address.entity';
import { Practice } from '../../../modules/public/platform/practice/practice/practice.entity';
import { PracticeAddress } from '../../../modules/public/platform/practice/practice-address/practice-address.entity';
import { PracticeBilling } from '../../../modules/public/platform/practice/practice-billing/practice-billing.entity';
import { PracticeClientLink } from '../../../modules/public/platform/practice/practice-client-link/practice-client-link.entity';
import { PracticeClientLinkFlag } from '../../../modules/public/platform/practice/practice-client-link-flag/practice-client-link-flag.entity';
import { PracticeMember } from '../../../modules/public/platform/practice/practice-member/practice-member.entity';

export class DemoPracticeSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const env = process.env as unknown as Env;
        const auth = createAuth(env);
        const demo = DEMO_PRACTICE;

        let user = await em.findOne(AuthUser, { email: demo.email });
        if (!user) {
            const result = await auth.api.signUpEmail({
                body: {
                    email: demo.email,
                    password: demo.password,
                    name: demo.name,
                },
            });
            const userId = result?.user?.id;
            if (!userId) {
                throw new Error(`DemoPracticeSeeder: signUp failed for ${demo.email}`);
            }
            user = await em.findOneOrFail(AuthUser, { id: userId });
        }

        await this.ensureDemoPassword(auth, user.id, demo.password);

        if (!user.emailVerified) {
            user.emailVerified = true;
            user.updatedAt = new Date();
            em.persist(user);
        }
        if (user.name !== demo.name) {
            user.name = demo.name;
            user.updatedAt = new Date();
            em.persist(user);
        }

        let rumteloAccount = await em.findOne(Account, { user }, { populate: ['settings'] });
        if (!rumteloAccount) {
            rumteloAccount = em.create(Account, {
                user,
                firstName: demo.firstName,
                lastName: demo.lastName,
                phone: demo.phone,
                dateOfBirth: demo.dateOfBirth,
            } as never);
            em.persist(rumteloAccount);
            em.create(AccountSettings, {
                account: rumteloAccount,
                locale: Locale.EN,
                theme: Theme.SYSTEM,
                spendingStyle: SpendingStyle.BALANCED,
                onboardedAt: new Date(),
            } as never);
        } else {
            rumteloAccount.firstName = demo.firstName;
            rumteloAccount.lastName = demo.lastName;
            rumteloAccount.phone = demo.phone;
            rumteloAccount.dateOfBirth = demo.dateOfBirth;
            const settings = await em.findOne(AccountSettings, { account: rumteloAccount });
            if (settings && !settings.onboardedAt) settings.onboardedAt = new Date();
        }

        let org = await em.findOne(AuthHousehold, { slug: demo.householdSlug });
        if (!org) {
            org = em.create(AuthHousehold, {
                id: uuidv7(),
                name: demo.householdName,
                slug: demo.householdSlug,
                createdAt: new Date(),
            } as never);
            em.persist(org);
            em.create(AuthMember, {
                id: uuidv7(),
                household: org,
                user,
                role: 'owner',
                createdAt: new Date(),
            } as never);
        } else {
            org.name = demo.householdName;
        }

        const householdId = org.id;
        let settings = await em.findOne(HouseholdSettings, { household: householdId });
        if (!settings) {
            settings = em.create(HouseholdSettings, {
                household: householdId,
                why: demo.why,
                kind: HouseholdKind.SOLO,
                currency: Currency.EUR,
                money: {
                    periodStartDay: 1,
                    incomeStability: IncomeStability.STABLE,
                    payoffStrategy: PayoffStrategy.AVALANCHE,
                },
                features: { isBankSyncEnabled: false, isCoachEnabled: true },
                weekCheck: { reminderDay: 7, reminderAt: '19:00' },
                answers: {},
                onboardedAt: new Date(),
            } as never);
            em.persist(settings);
        } else {
            settings.why = demo.why;
            if (!settings.onboardedAt) settings.onboardedAt = new Date();
        }

        let householdBilling = await em.findOne(HouseholdBilling, { household: householdId });
        if (!householdBilling) {
            householdBilling = em.create(HouseholdBilling, {
                household: householdId,
                planKey: PlanKey.PLUS,
            } as never);
            em.persist(householdBilling);
        } else {
            householdBilling.planKey = PlanKey.PLUS;
        }

        await em.flush();

        let practice = await em.findOne(Practice, { slug: demo.practice.slug });
        if (!practice) {
            practice = em.create(Practice, {
                legalName: demo.practice.legalName,
                displayName: demo.practice.displayName,
                slug: demo.practice.slug,
                billingEmail: demo.practice.billingEmail,
                registrationNumber: demo.practice.registrationNumber,
                vatNumber: demo.practice.vatNumber,
                phone: demo.practice.phone,
                website: demo.practice.website,
                acceptedTermsAt: new Date(),
            } as never);
            em.persist(practice);
        } else {
            practice.legalName = demo.practice.legalName;
            practice.displayName = demo.practice.displayName;
            practice.billingEmail = demo.practice.billingEmail;
            practice.registrationNumber = demo.practice.registrationNumber;
            practice.vatNumber = demo.practice.vatNumber;
            practice.phone = demo.practice.phone;
            practice.website = demo.practice.website;
        }

        await em.flush();

        let practiceAddressLink = await em.findOne(PracticeAddress, {
            practice: practice.id,
            kind: PracticeAddressKind.BILLING,
        });
        if (!practiceAddressLink) {
            const address = em.create(Address, {
                line1: demo.practice.address.line1,
                line2: demo.practice.address.line2,
                postalCode: demo.practice.address.postalCode,
                city: demo.practice.address.city,
                country: demo.practice.address.country,
            } as never);
            em.persist(address);
            practiceAddressLink = em.create(PracticeAddress, {
                practice: practice.id,
                address: address.id,
                kind: PracticeAddressKind.BILLING,
            } as never);
            em.persist(practiceAddressLink);
        } else {
            const address = await em.findOne(Address, { id: practiceAddressLink.address });
            if (address) {
                address.line1 = demo.practice.address.line1;
                address.line2 = demo.practice.address.line2;
                address.postalCode = demo.practice.address.postalCode;
                address.city = demo.practice.address.city;
                address.country = demo.practice.address.country;
            }
        }

        let member = await em.findOne(PracticeMember, {
            practice: practice.id,
            account: rumteloAccount.id,
        });
        if (!member) {
            member = em.create(PracticeMember, {
                practice: practice.id,
                account: rumteloAccount.id,
                role: PracticeRole.OWNER,
                isSeatBillable: true,
                joinedAt: new Date(),
            } as never);
            em.persist(member);
        } else {
            member.role = PracticeRole.OWNER;
            member.isSeatBillable = true;
        }

        let practiceBilling = await em.findOne(PracticeBilling, { practice: practice.id });
        if (!practiceBilling) {
            practiceBilling = em.create(PracticeBilling, {
                practice: practice.id,
                billableSeatCount: 1,
                billableClientCount: 0,
            } as never);
            em.persist(practiceBilling);
        } else {
            practiceBilling.billableSeatCount = Math.max(practiceBilling.billableSeatCount, 1);
        }

        const clientHousehold = await em.findOne(AuthHousehold, {
            slug: demo.pendingClientHouseholdSlug,
        });
        if (clientHousehold) {
            await this.ensurePendingInviteLink({
                em,
                practiceId: practice.id,
                householdId: clientHousehold.id,
                addedByAccountId: rumteloAccount.id,
                access: PracticeClientAccess.VIEW,
            });
        }

        // Drop stale ACTIVE/INVITED links on other demo households from older seeds.
        await this.revokeStaleDemoClientLinks({
            em,
            practiceId: practice.id,
            keepHouseholdSlug: demo.pendingClientHouseholdSlug,
        });

        practiceBilling.billableClientCount = 0;
        await em.flush();
    }

    /** Revoke demo practice↔household links that are no longer part of the seed story. */
    private async revokeStaleDemoClientLinks(input: {
        em: EntityManager;
        practiceId: string;
        keepHouseholdSlug: string;
    }): Promise<void> {
        const { em, practiceId, keepHouseholdSlug } = input;
        const keep = await em.findOne(AuthHousehold, { slug: keepHouseholdSlug });
        const links = await em.find(PracticeClientLink, { practice: practiceId });
        const now = new Date();
        for (const link of links) {
            if (keep && link.household === keep.id) continue;
            if (link.status === PracticeClientLinkStatus.REVOKED) continue;
            link.status = PracticeClientLinkStatus.REVOKED;
            link.revokedAt = now;
            link.activatedAt = null;
            const sponsor = await em.findOne(PracticeClientLinkFlag, {
                link: link.id,
                flag: PracticeClientControlFlag.SPONSOR_PLAN,
            });
            if (sponsor) em.remove(sponsor);
        }
    }

    /** INVITED only — household has not accepted; no sponsor, no board access. */
    private async ensurePendingInviteLink(input: {
        em: EntityManager;
        practiceId: string;
        householdId: string;
        addedByAccountId: string;
        access: PracticeClientAccess;
    }): Promise<void> {
        const { em, practiceId, householdId, addedByAccountId, access } = input;
        let link = await em.findOne(PracticeClientLink, {
            practice: practiceId,
            household: householdId,
        });
        if (!link) {
            link = em.create(PracticeClientLink, {
                practice: practiceId,
                household: householdId,
                status: PracticeClientLinkStatus.INVITED,
                access,
                addedByAccount: addedByAccountId,
                householdAcceptedAt: null,
                activatedAt: null,
                revokedAt: null,
            } as never);
            em.persist(link);
            await em.flush();
        } else {
            // Re-seed always restores the pending invite for this demo household.
            link.status = PracticeClientLinkStatus.INVITED;
            link.access = access;
            link.addedByAccount = addedByAccountId;
            link.householdAcceptedAt = null;
            link.activatedAt = null;
            link.revokedAt = null;
        }

        const sponsor = await em.findOne(PracticeClientLinkFlag, {
            link: link.id,
            flag: PracticeClientControlFlag.SPONSOR_PLAN,
        });
        if (sponsor) em.remove(sponsor);
    }

    private async ensureDemoPassword(
        auth: ReturnType<typeof createAuth>,
        userId: string,
        password: string
    ): Promise<void> {
        const ctx = await auth.$context;
        const passwordHash = await ctx.password.hash(password);
        const credential = await ctx.internalAdapter.findCredentialAccount(userId);
        if (credential) {
            await ctx.internalAdapter.updateAccount(credential.id, { password: passwordHash });
            return;
        }
        await ctx.internalAdapter.linkAccount({
            userId,
            providerId: 'credential',
            issuer: 'local:credential',
            accountId: userId,
            password: passwordHash,
        });
    }
}
