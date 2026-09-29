import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable, Logger } from '@nestjs/common';

import type {
    AccountProfile as AccountProfileDto,
    AccountProfilePatch,
    AccountProfileSeed,
} from '@rumtelo/contracts';

import { currentUserId } from '../../../../common/household/household.context';
import { apiUnauthorized } from '../../../../common/errors/api-user-error';
import { AuthUser } from '../managed/user/auth-user.entity';
import { Account } from './account.entity';

/**
 * Account Service — structured person profile on `auth.account`.
 *
 * Display name is written through to Better Auth `user.name` so session /
 * member lists stay in sync without a second source of truth for greetings.
 *
 * Application code should prefer {@link ensureCurrentAccount} / `accountId`.
 * Better Auth `userId` stays for session, membership, and the Account→User link.
 */
@Injectable()
export class AccountService {
    private readonly logger = new Logger(AccountService.name);

    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    async getProfile(): Promise<AccountProfileDto> {
        const { account, user } = await this.ensureCurrentAccount();
        return toProfileDto(account, user);
    }

    async updateProfile(patch: AccountProfilePatch): Promise<AccountProfileDto> {
        const { account, user } = await this.ensureCurrentAccount();

        if (patch.displayName !== undefined) {
            user.name = patch.displayName.trim();
            user.updatedAt = new Date();
        }
        if (patch.firstName !== undefined) account.firstName = emptyToNull(patch.firstName);
        if (patch.middleName !== undefined) account.middleName = emptyToNull(patch.middleName);
        if (patch.lastName !== undefined) account.lastName = emptyToNull(patch.lastName);
        if (patch.phone !== undefined) account.phone = emptyToNull(patch.phone);
        if (patch.dateOfBirth !== undefined) account.dateOfBirth = patch.dateOfBirth;

        await this.em.flush();
        this.logger.debug(`Updated account profile ${account.id}`);
        return toProfileDto(account, user);
    }

    /**
     * Session → Rumtelo Account (+ Better Auth user via `account.user`).
     * Prefer this in product / platform services over touching `currentUserId()`.
     */
    async ensureCurrentAccount(): Promise<{ account: Account; user: AuthUser }> {
        return this.ensureAccountForUser(currentUserId());
    }

    /**
     * Ensure the Account row exists for a Better Auth user (onboarding / members).
     * Does not create settings — that stays in AccountSettingsService.
     * Optional {@link seed} fills empty profile fields when creating or when still null.
     *
     * Ghost sessions (Redis session after a DB wipe) → 401 so the client re-auths
     * instead of retrying INTERNAL_SERVER_ERROR forever.
     */
    async ensureAccountForUser(
        userId: string,
        seed?: AccountProfileSeed
    ): Promise<{ account: Account; user: AuthUser }> {
        const user = await this.em.findOne(AuthUser, { id: userId });
        if (!user) throw apiUnauthorized('not_authenticated');
        let account = await this.em.findOne(Account, { user: userId }, { populate: ['user'] });
        if (!account) {
            account = this.em.create(Account, {
                user,
                firstName: emptyToNull(seed?.firstName),
                middleName: emptyToNull(seed?.middleName),
                lastName: emptyToNull(seed?.lastName),
                phone: emptyToNull(seed?.phone),
                dateOfBirth: seed?.dateOfBirth ?? null,
            } as never);
            await this.em.persist(account).flush();
        } else if (seed) {
            applySeedIfEmpty(account, seed);
            await this.em.flush();
        }
        return { account, user };
    }
}

function applySeedIfEmpty(account: Account, seed: AccountProfileSeed): void {
    if (account.firstName === null && seed.firstName !== undefined) {
        account.firstName = emptyToNull(seed.firstName);
    }
    if (account.middleName === null && seed.middleName !== undefined) {
        account.middleName = emptyToNull(seed.middleName);
    }
    if (account.lastName === null && seed.lastName !== undefined) {
        account.lastName = emptyToNull(seed.lastName);
    }
    if (account.phone === null && seed.phone !== undefined) {
        account.phone = emptyToNull(seed.phone);
    }
    if (account.dateOfBirth === null && seed.dateOfBirth !== undefined) {
        account.dateOfBirth = seed.dateOfBirth;
    }
}

function emptyToNull(value: string | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function toProfileDto(account: Account, user: AuthUser): AccountProfileDto {
    return {
        accountId: account.id,
        userId: user.id,
        displayName: user.name,
        firstName: account.firstName ?? null,
        middleName: account.middleName ?? null,
        lastName: account.lastName ?? null,
        phone: account.phone ?? null,
        dateOfBirth: account.dateOfBirth ?? null,
        email: user.email,
        image: user.image ?? null,
    };
}
