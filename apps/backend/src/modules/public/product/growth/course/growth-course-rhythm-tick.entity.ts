import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { entityConfig } from '../../../../../common/database/entity-config.util';
import { HouseholdEntity } from '../../../../../common/database/household.entity';
import { GrowthCourseRhythm } from './growth-course-rhythm.entity';

/**
 * Growth Course Rhythm Tick Entity
 *
 * One day a routine was done. Done or not — there is no "partly" for a routine, and
 * a missed day is simply empty. Who may see a tick follows its rhythm, so the
 * service only reads ticks of rhythms the viewer can see.
 *
 * @see GrowthCourseRhythm
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'growth', tableName: 'course_rhythm_tick' }))
@Unique({ properties: ['rhythm', 'tickedOn'] })
@Index({ properties: ['household', 'tickedOn'] })
export class GrowthCourseRhythmTick extends HouseholdEntity {
    // ? PROPERTIES
    /** Calendar day of the tick (household timezone, stored as a date). */
    @Property({ type: 'date' })
    tickedOn!: string;

    // ? RELATIONSHIPS
    /** The routine. Ticks go with it if it is ever hard-deleted. */
    @ManyToOne(() => GrowthCourseRhythm, { mapToPk: true, deleteRule: 'cascade' })
    rhythm!: string;
}
