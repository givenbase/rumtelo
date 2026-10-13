import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

import { AuthHousehold } from '../household/auth-household.entity';
import { AuthUser } from '../../../user/managed/user/auth-user.entity';

/**
 * better-auth `member` table — a user's membership in a household.
 *
 * Written by better-auth's organization plugin (single writer). Read here for
 * role resolution and member listings; the raw role (owner | admin | member |
 * viewer; legacy admin) is mapped to Rumtelo's OWNER | MEMBER | VIEWER at the service layer.
 *
 * `relation` is a BA `additionalFields` column (FAMILY | CIRCLE | EXTERNAL).
 * Schema via `pn auth:migrate` — never commit Mikro ADD/DROP for this column.
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

    /**
     * Who they are to this board (BA additionalField).
     * FAMILY | CIRCLE | EXTERNAL — null only for legacy rows pre-migration.
     */
    @Property({ type: 'text', nullable: true })
    relation?: string | null;

    @Property({ type: 'timestamptz' })
    createdAt!: Date;
}
