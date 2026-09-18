import { Entity, Property } from '@mikro-orm/core';

import { HouseholdEntity } from '../../../../../common/database/household.entity';
import { entityConfig } from '../../../../../common/database/entity-config.util';

/**
 * Things that move earning power. A growth surface, not a budget line.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'growth', tableName: 'lever' }))
export class IncomeLever extends HouseholdEntity {
    // ? PROPERTIES
    @Property({ length: 160 })
    label!: string;

    @Property({ type: 'text', nullable: true })
    note: string | null = null;

    @Property({ type: 'bigint', default: 0 })
    potentialMonthly = 0;

    @Property({ default: false })
    isDone = false;
}
