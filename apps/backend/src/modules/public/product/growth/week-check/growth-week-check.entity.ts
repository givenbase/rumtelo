import { Entity, Property, Unique } from '@mikro-orm/core';

import { HouseholdEntity } from '../../../../../common/database/household.entity';
import { entityConfig } from '../../../../../common/database/entity-config.util';

/**
 * Growth week-check shell — household + week + completion.
 * Product-specific columns land later; do not invent them here.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'growth', tableName: 'week_check' }))
@Unique({ properties: ['household', 'week'] })
export class GrowthWeekCheck extends HouseholdEntity {
    // ? PROPERTIES
    /** YYYY-Www */
    @Property({ length: 8 })
    week!: string;

    @Property({ type: 'timestamptz', nullable: true })
    completedAt: Date | null = null;
}
