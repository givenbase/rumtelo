import { Collection, Entity, OneToMany, Property, Unique } from '@mikro-orm/core';

import type { MonthScoreEvent } from './month-score-event.entity';

import { HouseholdEntity } from '../../../../../common/database/household.entity';
import { entityConfig } from '../../../../../common/database/entity-config.util';

/**
 * Month Score Entity
 *
 * One budget period's month score. Closing is irreversible by design — the log
 * is the household's honest history, not a scoreboard to replay.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'month_score' }))
@Unique({ properties: ['household', 'period'] })
export class MonthScore extends HouseholdEntity {
    // ? PROPERTIES
    /** Budget period `YYYY-MM`. */
    @Property({ length: 7 })
    period!: string;

    /** Points earned so far this period. */
    @Property({ default: 0 })
    score = 0;

    /** Points available this period — the denominator. */
    @Property({ default: 0 })
    maxScore = 0;

    /** Level reached from the running score. */
    @Property({ default: 1 })
    level = 1;

    /** Closed periods are frozen; nothing can be logged against them. */
    @Property({ default: false })
    isClosed = false;

    /** When the period was closed. */
    @Property({ type: 'timestamptz', nullable: true })
    closedAt: Date | null = null;

    // ? RELATIONSHIPS
    /** Points log for this period (1:N, inverse side). */
    @OneToMany('MonthScoreEvent', 'monthScore')
    events = new Collection<MonthScoreEvent>(this);
}
