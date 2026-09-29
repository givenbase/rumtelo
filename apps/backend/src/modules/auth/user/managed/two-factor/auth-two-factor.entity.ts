import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

import { AuthUser } from '../user/auth-user.entity';

/**
 * better-auth `two_factor` table — TOTP secrets and backup codes.
 * Written by better-auth's twoFactor plugin (single writer).
 */
@Entity({ tableName: 'two_factor', schema: 'auth' })
export class AuthTwoFactor {
    @PrimaryKey({ type: 'uuid' })
    id!: string;

    @Property({ type: 'text' })
    secret!: string;

    @Property({ type: 'text' })
    backupCodes!: string;

    @ManyToOne(() => AuthUser, { deleteRule: 'cascade' })
    user!: AuthUser;

    @Property({ type: 'boolean', nullable: true })
    verified?: boolean;

    @Property({ type: 'integer', nullable: true })
    failedVerificationCount?: number;

    @Property({ type: 'timestamptz', nullable: true })
    lockedUntil?: Date;
}
