import { Entity, Unique } from '@mikro-orm/core';

import { WeekCheckEntity } from '../../../../../common/database/week-check.entity';
import { entityConfig } from '../../../../../common/database/entity-config.util';

/**
 * Energy Week Check Entity
 *
 * Energy week-check shell — household + week + completion.
 * Product-specific columns land later; do not invent them here.
 *
 * @see WeekCheckEntity — shared week / completedAt shell across portals
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'energy', tableName: 'week_check' }))
@Unique({ properties: ['household', 'week'] })
export class EnergyWeekCheck extends WeekCheckEntity {}
