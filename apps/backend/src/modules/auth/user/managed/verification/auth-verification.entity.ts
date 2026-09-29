import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

/**
 * better-auth `verification` table — short-lived verification tokens
 * (email verification, password reset). Written by better-auth (single writer).
 */
@Entity({ tableName: 'verification', schema: 'auth' })
export class AuthVerification {
    @PrimaryKey({ type: 'uuid' })
    id!: string;

    @Property({ type: 'text' })
    identifier!: string;

    @Property({ type: 'text' })
    value!: string;

    @Property({ type: 'timestamptz' })
    expiresAt!: Date;

    @Property({ type: 'timestamptz', defaultRaw: 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Property({ type: 'timestamptz', defaultRaw: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;
}
