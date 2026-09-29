import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

import { AuthHousehold } from '../household/auth-household.entity';
import { AuthUser } from '../../../user/managed/user/auth-user.entity';

/**
 * better-auth `invitation` table — pending invites into a household.
 * Written by better-auth's organization plugin (single writer).
 */
@Entity({ tableName: 'invitation', schema: 'auth' })
export class AuthInvitation {
    @PrimaryKey({ type: 'uuid' })
    id!: string;

    @ManyToOne(() => AuthHousehold, {
        deleteRule: 'cascade',
        fieldName: 'household_id',
    })
    household!: AuthHousehold;

    @Property({ type: 'text' })
    email!: string;

    @Property({ type: 'text', nullable: true })
    role?: string;

    @Property({ type: 'text' })
    status!: string;

    @Property({ type: 'timestamptz' })
    expiresAt!: Date;

    @Property({ type: 'timestamptz', defaultRaw: 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @ManyToOne(() => AuthUser, { deleteRule: 'cascade' })
    inviter!: AuthUser;
}
