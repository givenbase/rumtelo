import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import { PracticeClientLinkStatus } from '@rumtelo/contracts';

import type { HouseholdContext } from './household.context';

import { AuthMember } from '../../modules/auth/household/managed/member/auth-member.entity';
import { Account } from '../../modules/auth/user/account/account.entity';
import { PracticeClientLink } from '../../modules/public/platform/practice/practice-client-link/practice-client-link.entity';
import { PracticeMember } from '../../modules/public/platform/practice/practice-member/practice-member.entity';

/**
 * Membership lives in better-auth's household table (organization plugin,
 * modelName: household). better-auth owns writes; AuthMember is read-only.
 *
 * Practice staff may also enter a client household via an ACTIVE PracticeClientLink
 * (coach preview) — never by inventing a second personal household seat.
 */
@Injectable()
export class MembershipService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async roleFor(userId: string, householdId: string): Promise<HouseholdContext['role'] | null> {
        const membership = await this.em.findOne(AuthMember, {
            user: userId,
            household: householdId,
        });
        if (!membership) return null;

        switch (membership.role.toLowerCase()) {
            case 'owner':
                return 'OWNER';
            case 'admin':
                return 'ADMIN';
            case 'member':
                return 'MEMBER';
            case 'viewer':
            default:
                return 'VIEWER';
        }
    }

    /**
     * Coach preview: PracticeMember + ACTIVE PracticeClientLink → household role.
     * VIEW and MANAGE both map to VIEWER for now (read-only board). MANAGE writes later.
     */
    async practicePreviewRoleFor(
        userId: string,
        practiceId: string,
        householdId: string
    ): Promise<HouseholdContext['role'] | null> {
        const account = await this.em.findOne(Account, { user: userId });
        if (!account) return null;

        const staff = await this.em.findOne(PracticeMember, {
            practice: practiceId,
            account: account.id,
        });
        if (!staff) return null;

        const link = await this.em.findOne(PracticeClientLink, {
            practice: practiceId,
            household: householdId,
            status: PracticeClientLinkStatus.ACTIVE,
        });
        if (!link) return null;

        return 'VIEWER';
    }
}
