import { Entity, Enum, Index, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { PracticeClientAccess, PracticeClientInviteStatus } from '@rumtelo/contracts';

import { BaseEntity } from '../../../../../common/database/base.entity';
import { entityConfig } from '../../../../../common/database/entity-config.util';
import { NativeEnum } from '../../../../../common/database/native-enum.util';
import { Account } from '../../../../auth/user/account/account.entity';
import { Practice } from '../practice/practice.entity';

/**
 * Practice Client Invite Entity
 *
 * Email-token invite when the client has no Rumtelo household yet
 * (new account or user who never finished onboarding). After they create
 * a household, redeem → PracticeClientLink INVITED (dual-consent).
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'platform', tableName: 'practice_client_invite' }))
@Unique({ properties: ['token'] })
@Index({ properties: ['practice', 'email'] })
export class PracticeClientInvite extends BaseEntity {
    // ? PROPERTIES
    @Property({ type: 'text' })
    email!: string;

    /** Opaque redeem token (uuid). */
    @Property({ type: 'text' })
    token!: string;

    /** Set when redeemed into a PracticeClientLink. */
    @Property({ type: 'uuid', nullable: true })
    acceptedLinkId: string | null = null;

    @Property({ type: 'timestamptz' })
    expiresAt!: Date;

    // ? ENUMS
    @Enum(
        NativeEnum({
            PracticeClientInviteStatus,
            domain: 'platform',
            defaultValue: PracticeClientInviteStatus.PENDING,
        })
    )
    status: PracticeClientInviteStatus = PracticeClientInviteStatus.PENDING;

    @Enum(
        NativeEnum({
            PracticeClientAccess,
            domain: 'platform',
            defaultValue: PracticeClientAccess.VIEW,
        })
    )
    access: PracticeClientAccess = PracticeClientAccess.VIEW;

    // ? RELATIONSHIPS
    @ManyToOne(() => Practice, { mapToPk: true, deleteRule: 'cascade' })
    practice!: string;

    @ManyToOne(() => Account, { mapToPk: true, nullable: true, deleteRule: 'set null' })
    addedByAccount: string | null = null;
}
