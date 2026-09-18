import { Entity, Property } from '@mikro-orm/core';

import { HouseholdEntity } from '../../../../../common/database/household.entity';
import { entityConfig } from '../../../../../common/database/entity-config.util';

/**
 * IncomeMilestone Entity
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'growth', tableName: 'milestone' }))
export class IncomeMilestone extends HouseholdEntity {
    // ? PROPERTIES
    @Property({ length: 160 })
    label!: string;

    @Property({ type: 'bigint' })
    targetMonthly!: number;

    @Property({ type: 'date', nullable: true })
    reachedOn: string | null = null;
}
