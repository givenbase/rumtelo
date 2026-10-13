import { Entity, Enum, Property, Unique } from '@mikro-orm/decorators/legacy';
import { HouseholdRelation } from '@rumtelo/contracts';

import { entityConfig } from '../../../../common/database/entity-config.util';
import { HouseholdEntity } from '../../../../common/database/household.entity';
import { NativeEnum } from '../../../../common/database/native-enum.util';

/**
 * Pending invite relation — copied to {@link HouseholdMemberMeta} on accept.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'platform', tableName: 'household_invite_meta' }))
@Unique({ properties: ['invitationId'] })
export class HouseholdInviteMeta extends HouseholdEntity {
    // ? PROPERTIES
    /** Better Auth `auth.invitation.id`. */
    @Property({ type: 'uuid', fieldName: 'invitation_id' })
    invitationId!: string;

    // ? ENUMS
    @Enum(NativeEnum({ HouseholdRelation, domain: 'platform' }))
    relation!: HouseholdRelation;
}
