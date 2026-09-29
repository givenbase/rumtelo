import { Entity, ManyToOne, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';

import { AuthUser } from '../user/auth-user.entity';

/**
 * better-auth `session` table — active sign-ins.
 * Written by better-auth (single writer).
 */
@Entity({ tableName: 'session', schema: 'auth' })
@Unique({ properties: ['token'] })
export class AuthSession {
    @PrimaryKey({ type: 'uuid' })
    id!: string;

    @Property({ type: 'timestamptz' })
    expiresAt!: Date;

    @Property({ type: 'text' })
    token!: string;

    @Property({ type: 'timestamptz', defaultRaw: 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Property({ type: 'timestamptz' })
    updatedAt!: Date;

    @Property({ type: 'text', nullable: true })
    ipAddress?: string;

    @Property({ type: 'text', nullable: true })
    userAgent?: string;

    @ManyToOne(() => AuthUser, { deleteRule: 'cascade' })
    user!: AuthUser;

    /** The household this session acts in — organization plugin column. */
    @Property({ type: 'uuid', nullable: true, fieldName: 'active_household_id' })
    activeHouseholdId?: string;
}
