import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';

import { AuthUser } from '../user/auth-user.entity';

/**
 * better-auth's credential store, renamed from `account` to `provider`
 * Holds sign-in provider links per user: the
 * password hash for email-and-password, OAuth tokens for social providers.
 * Nothing profile-like lives here; the Rumtelo-owned `account` entity lives in
 * `modules/auth/user/account`.
 *
 * Written by better-auth (single writer).
 */
@Entity({ tableName: 'provider', schema: 'auth' })
export class AuthProvider {
    @PrimaryKey({ type: 'uuid' })
    id!: string;

    @Property({ type: 'text' })
    issuer!: string;

    @Property({ type: 'text' })
    accountId!: string;

    @Property({ type: 'text' })
    providerId!: string;

    @ManyToOne(() => AuthUser, { deleteRule: 'cascade' })
    user!: AuthUser;

    @Property({ type: 'text', nullable: true })
    accessToken?: string;

    @Property({ type: 'text', nullable: true })
    refreshToken?: string;

    @Property({ type: 'text', nullable: true })
    idToken?: string;

    @Property({ type: 'timestamptz', nullable: true })
    accessTokenExpiresAt?: Date;

    @Property({ type: 'timestamptz', nullable: true })
    refreshTokenExpiresAt?: Date;

    @Property({ type: 'text', nullable: true })
    scope?: string;

    @Property({ type: 'text', nullable: true })
    password?: string;

    @Property({ type: 'timestamptz', defaultRaw: 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Property({ type: 'timestamptz' })
    updatedAt!: Date;
}
