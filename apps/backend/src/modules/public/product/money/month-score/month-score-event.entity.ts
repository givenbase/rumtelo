import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/core';
import { MonthScoreEventKind } from '@rumtelo/contracts';

import { HouseholdEntity } from '../../../../../common/database/household.entity';
import { NativeEnum } from '../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../common/database/entity-config.util';
import { MonthScore } from './month-score.entity';

/**
 * Month Score Event Entity
 *
 * Points logged against a period's month score (jar held, week check done, etc.).
 * The period lives on the parent `MonthScore`; `occurredOn` orders the log.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'month_score_event' }))
@Index({ properties: ['monthScore', 'occurredOn'] })
export class MonthScoreEvent extends HouseholdEntity {
    // ? PROPERTIES
    /** Human-readable line for the log ("Held the Play jar"). */
    @Property({ length: 240 })
    text!: string;

    /** Points awarded (may be negative). */
    @Property({ default: 0 })
    points = 0;

    /** Calendar date the event happened. */
    @Property({ type: 'date' })
    occurredOn!: string;

    // ? ENUMS
    /** What kind of behaviour earned the points. */
    @Enum(NativeEnum({ MonthScoreEventKind, domain: 'money' }))
    kind!: MonthScoreEventKind;

    // ? RELATIONSHIPS
    /** Period this event belongs to (N:1, required). Deleting the score deletes its log. */
    @ManyToOne(() => MonthScore, { deleteRule: 'cascade' })
    monthScore!: MonthScore;
}
