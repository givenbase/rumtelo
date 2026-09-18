import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';

import type {
    AccountSettings as AccountSettingsDto,
    AccountTourProgress,
} from '@rumtelo/contracts';

import { DEFAULT_ACCOUNT_TOUR_PROGRESS, Locale, SpendingStyle, Theme } from '@rumtelo/contracts';
import { currentUserId } from '../../../../../common/household/household.context';
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

    async findOne(id: string): Promise<AccountSettingsDto> {
        const row = await this.em.findOne(AccountSettings, { id }, { populate: ['account'] });
        if (!row) throw new NotFoundException(`Account settings ${id} not found`);
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
        if (!row) throw new NotFoundException(`Account settings ${id} not found`);
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
