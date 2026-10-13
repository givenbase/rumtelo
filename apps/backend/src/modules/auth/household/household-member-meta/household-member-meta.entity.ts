import { Entity, Enum, Property, Unique } from '@mikro-orm/decorators/legacy';
import { HouseholdRelation } from '@rumtelo/contracts';

import { entityConfig } from '../../../../common/database/entity-config.util';
import { HouseholdEntity } from '../../../../common/database/household.entity';
import { NativeEnum } from '../../../../common/database/native-enum.util';

/**
 * Per-seat relation to the household board (family / circle / external).
 * Access stays on better-auth `member.role`; this is UX + soft-upgrade only.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'platform', tableName: 'household_member_meta' }))
@Unique({ properties: ['household', 'userId'] })
export class HouseholdMemberMeta extends HouseholdEntity {
    // ? PROPERTIES
    /** Better Auth `auth.user.id` for this seat. */
    @Property({ type: 'uuid', fieldName: 'user_id' })
    userId!: string;

    // ? ENUMS
    @Enum(NativeEnum({ HouseholdRelation, domain: 'platform' }))
    relation!: HouseholdRelation;
}
