import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable, Logger } from '@nestjs/common';

import type {
    AccountSettings as AccountSettingsDto,
    AccountTourProgress,
} from '@rumtelo/contracts';

import {
    DEFAULT_ACCOUNT_TOUR_PROGRESS,
    HouseholdAnswerKey,
    Locale,
    SpendingStyle,
    Theme,
} from '@rumtelo/contracts';
import { apiNotFound } from '../../../../../common/errors/api-user-error';
import { currentUserId, householdStorage } from '../../../../../common/household/household.context';
import { PracticeMember } from '../../../../public/platform/practice/practice-member/practice-member.entity';
import { AuthInvitation } from '../../../household/managed/invitation/auth-invitation.entity';
import { AuthMember } from '../../../household/managed/member/auth-member.entity';
import { HouseholdSettings } from '../../../household/household-settings/household-settings.entity';
import { AuthUser } from '../../../user/managed/user/auth-user.entity';
import { Account } from '../account.entity';
import { AccountSettings } from './account-settings.entity';

export type AccountSettingsPatch = {
    locale?: Locale;
    theme?: Theme;
    spendingStyle?: SpendingStyle;
    tour?: AccountTourProgress;
};

/**
 * Account Settings Service
 *
 * CRUD for person-scoped UI prefs on `auth.account_settings` (FK → Account).
 * Session identity is still Better Auth `userId`; we resolve Account first, then
 * read/write settings. Prefer account-centric DTOs (`accountId` in output).
 */
@Injectable()
export class AccountSettingsService {
    private readonly logger = new Logger(AccountSettingsService.name);

    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /**
     * Create settings for the current session's Account (creates Account if missing).
     * Fails if settings already exist — use update or upsert instead.
     */
    async create(patch: AccountSettingsPatch = {}): Promise<AccountSettingsDto> {
        const userId = currentUserId();
        const existing = await this.findEntityByAuthUserId(userId);
        if (existing) {
            throw new Error(`Account settings for account already exist`);
        }
        const row = await this.createForAuthUser(userId, patch);
        return toDto(row);
    }

    /**
     * Ensure settings exist for a Better Auth user → Account bridge (onboarding).
     * Prefer {@link get} / {@link update} for the current session.
     */
    async upsertForUser(
        authUserId: string,
        defaults: AccountSettingsPatch = {}
    ): Promise<AccountSettings> {
        const existing = await this.findEntityByAuthUserId(authUserId);
        if (existing) {
            if (defaults.locale !== undefined) existing.locale = defaults.locale;
            if (defaults.theme !== undefined) existing.theme = defaults.theme;
            if (defaults.spendingStyle !== undefined) {
                existing.spendingStyle = defaults.spendingStyle;
            }
            if (defaults.tour !== undefined) existing.tour = normalizeTour(defaults.tour);
            await this.em.flush();
            return existing;
        }
        return this.createForAuthUser(authUserId, defaults);
    }

    /**
     * Mark personal onboarding complete (idempotent). Used by household.onboard
     * for the creator; invitees can get a lighter personal pass later.
     */
    async markOnboarded(authUserId: string): Promise<AccountSettings> {
        const row = await this.upsertForUser(authUserId);
        if (!row.onboardedAt) {
            row.onboardedAt = new Date();
            await this.em.flush();
        }
        return row;
    }

    /**
     * Clear personal onboarded flag (dev / reset flow).
     */
    async clearOnboarded(authUserId: string): Promise<AccountSettings> {
        const row = await this.upsertForUser(authUserId);
        row.onboardedAt = null;
        await this.em.flush();
        return row;
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /**
     * Current session Account's settings (creates defaults if missing).
     */
    async get(): Promise<AccountSettingsDto> {
        const row = await this.upsertForUser(currentUserId());
        return toDto(row);
    }

    /**
     * Boot / proxy gate — may the signed-in person leave `/onboarding`?
     * Uses durable DB state (not a client cookie).
     * `home` tells the proxy where ready users belong (practice desk vs board).
     *
     * Invitees (VIEWER / MEMBER / ADMIN) must never run creator onboarding.
     * Personal `onboardedAt` is a pass for them once they have a household seat.
     * Pending email invites route to `/invite/{id}` — never the income/jars questionnaire.
     * Incomplete jar-bank setup only blocks the OWNER.
     */
    async boardReady(): Promise<{
        ready: boolean;
        home: '/' | '/practice';
        invitePath?: string | null;
    }> {
        const userId = currentUserId();
        const ctx = householdStorage.getStore();
        const householdId = ctx?.householdId ?? null;
        let settings = await this.get();

        if (!settings.onboardedAt) {
            const account = await this.em.findOne(Account, { user: userId });
            if (!account) {
                const invitePath = await this.pendingInvitePath(userId);
                return { ready: false, home: '/', invitePath };
            }

            const membership = await this.em.findOne(AuthMember, { user: userId });
            if (membership) {
                // Joined via invite (or any existing seat) — no income/jars questionnaire.
                await this.markOnboarded(userId);
                settings = await this.get();
            } else {
                const invitePath = await this.pendingInvitePath(userId);
                if (invitePath) return { ready: false, home: '/', invitePath };

                const practiceSeat = await this.em.findOne(PracticeMember, {
                    account: account.id,
                });
                if (practiceSeat) return { ready: true, home: '/practice', invitePath: null };
                return { ready: false, home: '/', invitePath: null };
            }
        }

        if (!householdId) {
            const account = await this.em.findOne(Account, { user: userId });
            if (account) {
                const practiceSeat = await this.em.findOne(PracticeMember, {
                    account: account.id,
                });
                if (practiceSeat) {
                    const membership = await this.em.findOne(AuthMember, { user: userId });
                    if (!membership) return { ready: true, home: '/practice', invitePath: null };
                }
            }
            const invitePath = await this.pendingInvitePath(userId);
            if (invitePath) return { ready: false, home: '/', invitePath };
            return { ready: true, home: '/', invitePath: null };
        }

        const board = await this.em.findOne(HouseholdSettings, { household: householdId });
        if (board?.answers?.[HouseholdAnswerKey.JAR_BANK_SETUP_DONE] === false) {
            // Only the founding OWNER finishes bank ↔ jar setup for the board.
            const role = ctx?.role ?? null;
            if (role === 'OWNER') return { ready: false, home: '/', invitePath: null };
        }
        return { ready: true, home: '/', invitePath: null };
    }

    /** Newest non-expired pending household invite for this user's email, if any. */
    private async pendingInvitePath(userId: string): Promise<string | null> {
        const user = await this.em.findOne(AuthUser, { id: userId });
        const email = user?.email?.trim();
        if (!email) return null;

        const pending = await this.em.findOne(
            AuthInvitation,
            {
                email: { $ilike: email },
                status: 'pending',
                expiresAt: { $gt: new Date() },
            },
            { orderBy: { createdAt: 'DESC' } }
        );
        return pending ? `/invite/${pending.id}` : null;
    }

    async findOne(id: string): Promise<AccountSettingsDto> {
        const row = await this.em.findOne(AccountSettings, { id }, { populate: ['account'] });
        if (!row) throw apiNotFound('account_settings_not_found');
        return toDto(row);
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /**
     * Patch the current session Account's settings.
     */
    async update(patch: AccountSettingsPatch): Promise<AccountSettingsDto> {
        const row = await this.upsertForUser(currentUserId());
        if (patch.locale !== undefined) row.locale = patch.locale;
        if (patch.theme !== undefined) row.theme = patch.theme;
        if (patch.spendingStyle !== undefined) row.spendingStyle = patch.spendingStyle;
        if (patch.tour !== undefined) row.tour = normalizeTour(patch.tour);
        await this.em.flush();
        this.logger.debug(`Updated account settings ${row.id}`);
        return toDto(row);
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    /**
     * Delete settings by id. The Account row is left intact.
     */
    async delete(id: string): Promise<{ ok: true }> {
        const row = await this.em.findOne(AccountSettings, { id });
        if (!row) throw apiNotFound('account_settings_not_found');
        await this.em.remove(row).flush();
        return { ok: true };
    }

    // ====================================================================
    // Private — Better Auth userId → Account bridge
    // ====================================================================

    private async findEntityByAuthUserId(authUserId: string): Promise<AccountSettings | null> {
        const account = await this.em.findOne(
            Account,
            { user: authUserId },
            { populate: ['settings'] }
        );
        return account?.settings ?? null;
    }

    private async createForAuthUser(
        authUserId: string,
        defaults: AccountSettingsPatch
    ): Promise<AccountSettings> {
        let account = await this.em.findOne(Account, { user: authUserId });
        if (!account) {
            account = this.em.create(Account, { user: authUserId } as never);
            this.em.persist(account);
        }

        const settings = this.em.create(AccountSettings, {
            account,
            locale: defaults.locale ?? Locale.NL,
            theme: defaults.theme ?? Theme.LIGHT,
            spendingStyle: defaults.spendingStyle ?? SpendingStyle.UNKNOWN,
            tour: normalizeTour(defaults.tour ?? DEFAULT_ACCOUNT_TOUR_PROGRESS),
        } as never);
        await this.em.persist(settings).flush();
        return settings;
    }
}

function normalizeTour(tour: AccountTourProgress): AccountTourProgress {
    return {
        offer: tour.offer ?? DEFAULT_ACCOUNT_TOUR_PROGRESS.offer,
        tours: tour.tours ?? {},
        seriesActive: tour.seriesActive,
        seriesIndex: Math.max(0, Math.floor(tour.seriesIndex ?? 0)),
    };
}

function toDto(row: AccountSettings): AccountSettingsDto {
    return {
        accountId: row.account.id,
        locale: row.locale,
        theme: row.theme,
        spendingStyle: row.spendingStyle,
        tour: normalizeTour(row.tour ?? DEFAULT_ACCOUNT_TOUR_PROGRESS),
        onboardedAt: row.onboardedAt ? row.onboardedAt.toISOString() : null,
    };
}
