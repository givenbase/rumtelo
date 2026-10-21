import { Check, Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { CourseArea, CourseRhythmCadence, CourseRhythmKind } from '@rumtelo/contracts';

import { entityConfig } from '../../../../../common/database/entity-config.util';
import { Jsonb } from '../../../../../common/database/jsonb.util';
import { NativeEnum } from '../../../../../common/database/native-enum.util';
import {
    PersonalHouseholdEntity,
    personalRowCheck,
} from '../../../../../common/database/personal.entity';
import { GrowthCourseItem } from './growth-course-item.entity';

/**
 * Growth Course Rhythm Entity (Koers › Ritme)
 *
 * A routine you keep — "training 3× a week" — next to the three Focus choices. It
 * describes a pattern; it is never copied into new periods. A new week or month
 * turns the pattern into a proposal the person confirms. Ticks live in
 * {@link GrowthCourseRhythmTick}; a parent with a counter counts them. Area
 * `growth.course` through `PersonalScopedRepository`.
 *
 * @see docs/engineering/growth-cascade-plan.md — "Focus, Ritme en Home-schema"
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'growth', tableName: 'course_rhythm' }))
@Index({ properties: ['parent'] })
@Check(personalRowCheck('growth_course_rhythm'))
@Check({ name: 'growth_course_rhythm_target_range', expression: '(target BETWEEN 1 AND 31)' })
export class GrowthCourseRhythm extends PersonalHouseholdEntity {
    // ? PROPERTIES
    /** "Training", "Read 20 minutes". */
    @Property({ length: 140 })
    name!: string;

    /** Times per cadence; DAILY is always 1. */
    @Property({ type: 'smallint' })
    target!: number;

    /** ISO weekdays of the pattern (1 = Monday … 7 = Sunday); null = any day. */
    @Property(Jsonb({ nullable: true }))
    weekdays: number[] | null = null;

    /** Last week whose proposal was answered with "keep going" (`YYYY-Www`). */
    @Property({ length: 8, nullable: true })
    confirmedWeek: string | null = null;

    /** Paused on purpose; resumes without losing its ticks. */
    @Property({ type: 'timestamptz', nullable: true })
    pausedAt: Date | null = null;

    /** Stopped. Hidden from lists; ticks stay for past counters. */
    @Property({ type: 'timestamptz', nullable: true })
    endedAt: Date | null = null;

    // ? ENUMS
    /** Mini habit or countable discipline. */
    @Enum(NativeEnum({ CourseRhythmKind, domain: 'growth' }))
    kind!: CourseRhythmKind;

    /** Period the target counts in. */
    @Enum(NativeEnum({ CourseRhythmCadence, domain: 'growth' }))
    cadence!: CourseRhythmCadence;

    /** Portal for colour and icon in Schedule; null = Growth. */
    @Enum(NativeEnum({ CourseArea, domain: 'growth', nullable: true }))
    area: CourseArea | null = null;

    // ? RELATIONSHIPS
    /** Year, quarter or month item this routine feeds. Null = loose. */
    @ManyToOne(() => GrowthCourseItem, { mapToPk: true, nullable: true, deleteRule: 'set null' })
    parent: string | null = null;
}
