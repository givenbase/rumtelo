import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/core';

import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { Account } from '../../../../../auth/user/account/account.entity';

/**
 * Learn Skill Focus Entity
 *
 * A skill the person has put in focus. Presence is the switch.
 * A book is not required — focusing Communication opens the library.
 * The skill is a key, not an enum, so the list can grow.
 *
 * @see LearnProgress — the pieces on that skill
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'growth', tableName: 'learn_focus' }))
@Unique({ properties: ['household', 'account', 'skill'] })
export class LearnSkillFocus extends HouseholdEntity {
    // ? PROPERTIES
    /** Catalog key of the skill in focus. */
    @Property({ length: 64 })
    skill!: string;

    // ? RELATIONSHIPS
    /** The person whose focus this is. */
    @ManyToOne(() => Account, { mapToPk: true, deleteRule: 'cascade' })
    account!: string;
}
