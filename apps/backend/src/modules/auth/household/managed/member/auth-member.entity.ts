import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

import { AuthHousehold } from '../household/auth-household.entity';
import { AuthUser } from '../../../user/managed/user/auth-user.entity';

/**
 * better-auth `member` table — a user's membership in a household.
 *
 * Written by better-auth's organization plugin (single writer). Read here for
 * role resolution and member listings; the raw role (owner | admin | member |
 * viewer) is mapped to Rumtelo's OWNER | MEMBER | VIEWER at the service layer.
 */
@Entity({ tableName: 'member', schema: 'auth' })
export class AuthMember {
    @PrimaryKey({ type: 'uuid' })
    id!: string;

    @ManyToOne(() => AuthHousehold, {
        deleteRule: 'cascade',
        fieldName: 'household_id',
    })
    household!: AuthHousehold;

    @ManyToOne(() => AuthUser, { deleteRule: 'cascade' })
    user!: AuthUser;

    /** Raw better-auth role: owner | admin | member | viewer. */
    @Property({ type: 'text' })
    role!: string;

    @Property({ type: 'timestamptz' })
    createdAt!: Date;
}
