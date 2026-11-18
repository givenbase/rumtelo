import {
    Check,
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
    Unique,
} from '@mikro-orm/decorators/legacy';
import {
    COURSE_FOCUS_MAX,
    COURSE_POSITION_MAX,
    CourseHorizon,
    CourseItemStatus,
    CourseScope,
} from '@rumtelo/contracts';

import { entityConfig } from '../../../../../common/database/entity-config.util';
import { NativeEnum } from '../../../../../common/database/native-enum.util';
import {
    PersonalHouseholdEntity,
    personalRowCheck,
} from '../../../../../common/database/personal.entity';
import { Goal } from '../../money/targets/goal/goal.entity';

/**
 * Growth Course Item Entity (Koers)
 *
 * One step of the cascade year → quarter → month → week → day. An item may hang
 * under any higher item whose period contains its own (`parent`, optional). Week and
 * day hold 3 per period (recommended) and 5 at most; year, quarter and month have no
 * limit — `position` only orders them under their parent goal. Progress is computed
 * from the children, never stored. Household writes, through
 * `PersonalScopedRepository` (area `growth.course`).
 *
 * @see PersonalHouseholdEntity — maker + visibility
 * @see docs/engineering/growth-cascade-plan.md
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'growth', tableName: 'course_item' }))
@Index({ properties: ['household', 'horizon', 'period'] })
@Index({ properties: ['parent'] })
// Week and day: at most 5 per maker and period, whatever each item hangs under. Year,
// quarter and month have no unique slot: their `position` is plain ordering.
@Unique({
    name: 'growth_course_item_period_slot_unique',
    expression:
        'create unique index "growth_course_item_period_slot_unique" on "public"."growth_course_item" ("household_id", "account_id", "horizon", "period", "position") nulls not distinct where "horizon" in (\'WEEK\', \'DAY\')',
})
@Check(personalRowCheck('growth_course_item'))
// 0 only while two week / day items swap positions: the unique slot index checks every row
// at once. Past COURSE_FOCUS_MAX only the uncapped layers may go.
@Check({
    name: 'growth_course_item_position_range',
    expression: `(position BETWEEN 0 AND ${COURSE_POSITION_MAX}) AND (position <= ${COURSE_FOCUS_MAX} OR horizon IN ('YEAR', 'QUARTER', 'MONTH'))`,
})
@Check({
    name: 'growth_course_item_target_count_range',
    expression: '(target_count IS NULL) OR (target_count BETWEEN 1 AND 99)',
})
export class GrowthCourseItem extends PersonalHouseholdEntity {
    // ? PROPERTIES
    /** Period key for `horizon`: `2027`, `2027-Q1`, `2027-03`, `2027-W10`, `2027-03-08`. */
    @Property({ length: 10 })
    period!: string;

    /** The goal or priority itself. */
    @Property({ length: 140 })
    name!: string;

    /**
     * Order inside the slot, from 1 (0 only mid-swap). Week / day: 1–5, unique per maker
     * and period. Year / quarter / month: ordering only, not unique, no upper limit.
     */
    @Property({ type: 'smallint' })
    position!: number;

    /** "Done when …" — meaningful for year / quarter / month. */
    @Property({ length: 280, nullable: true })
    doneWhen: string | null = null;

    /** What helped, or what held you back. */
    @Property({ length: 280, nullable: true })
    reviewNote: string | null = null;

    /** Learn skill catalog key this item grows. */
    @Property({ length: 64, nullable: true })
    skill: string | null = null;

    /** Times this item was pushed to a next period along its carry chain; 0 = fresh. */
    @Property({ type: 'smallint', default: 0 })
    carryCount = 0;

    /**
     * Month / quarter counter ("12 trainings"). Set: progress is the ticks of the
     * rhythms under this item in its period, out of this number.
     */
    @Property({ type: 'smallint', nullable: true })
    targetCount: number | null = null;

    // ? ENUMS
    /** Layer of the cascade. */
    @Enum(NativeEnum({ CourseHorizon, domain: 'growth' }))
    horizon!: CourseHorizon;

    /** Review state; DROPPED leaves the progress maths. */
    @Enum(NativeEnum({ CourseItemStatus, domain: 'growth', defaultValue: CourseItemStatus.OPEN }))
    status: CourseItemStatus = CourseItemStatus.OPEN;

    /** Personal or business; null = not set. Year / quarter / month only. */
    @Enum(NativeEnum({ CourseScope, domain: 'growth', nullable: true }))
    scope: CourseScope | null = null;

    // ? RELATIONSHIPS
    /** Item one layer up. Null = loose; deleting the parent leaves children loose. */
    @ManyToOne(() => GrowthCourseItem, { mapToPk: true, nullable: true, deleteRule: 'set null' })
    parent: string | null = null;

    /** The unfinished item this one was carried forward from. */
    @ManyToOne(() => GrowthCourseItem, { mapToPk: true, nullable: true, deleteRule: 'set null' })
    carriedFrom: string | null = null;

    /** Money goal this year / quarter item is about. Cleared if the goal goes. */
    @ManyToOne(() => Goal, { mapToPk: true, nullable: true, deleteRule: 'set null' })
    goal: string | null = null;
}
