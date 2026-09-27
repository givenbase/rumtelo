import { Entity, Enum, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { PracticeClientAccess, PracticeClientLinkStatus } from '@rumtelo/contracts';

import { BaseEntity } from '../../../../../common/database/base.entity';
import { entityConfig } from '../../../../../common/database/entity-config.util';
import { NativeEnum } from '../../../../../common/database/native-enum.util';
import { AuthHousehold } from '../../../../auth/household/managed/household/auth-household.entity';
import { Account } from '../../../../auth/user/account/account.entity';
import { Practice } from '../practice/practice.entity';

/**
 * Practice Client Link Entity
 *
 * Hinge: Practice ↔ client Household. Access + control live here —
 * not by burning household VIEWER seats.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'platform', tableName: 'practice_client_link' }))
@Unique({ properties: ['practice', 'household'] })
export class PracticeClientLink extends BaseEntity {
    // ? PROPERTIES
    /**
     * When the household OWNER/ADMIN accepted the Practice offer.
     * Null while INVITED; set on accept (dual-consent middle contract).
     * Practice offer time is `createdAt`.
     */
    @Property({ type: 'timestamptz', nullable: true })
    householdAcceptedAt: Date | null = null;

    /** When the link became ACTIVE (same moment as household accept for v1). */
    @Property({ type: 'timestamptz', nullable: true })
    activatedAt: Date | null = null;

    /** When the link was revoked (status REVOKED). */
    @Property({ type: 'timestamptz', nullable: true })
    revokedAt: Date | null = null;

    // ? ENUMS
    @Enum(
        NativeEnum({
            PracticeClientLinkStatus,
            domain: 'platform',
            defaultValue: PracticeClientLinkStatus.INVITED,
        })
    )
    status: PracticeClientLinkStatus = PracticeClientLinkStatus.INVITED;

    @Enum(
        NativeEnum({
            PracticeClientAccess,
            domain: 'platform',
            defaultValue: PracticeClientAccess.MANAGE,
        })
    )
    access: PracticeClientAccess = PracticeClientAccess.MANAGE;

    // ? RELATIONSHIPS
    @ManyToOne(() => Practice, { mapToPk: true, deleteRule: 'cascade' })
    practice!: string;

    @ManyToOne(() => AuthHousehold, { mapToPk: true, deleteRule: 'cascade' })
    household!: string;

    @ManyToOne(() => Account, { mapToPk: true, nullable: true, deleteRule: 'set null' })
    addedByAccount: string | null = null;
}
