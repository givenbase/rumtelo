import { Entity, Enum, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';
import { CourseRitual } from '@rumtelo/contracts';

import { entityConfig } from '../../../../../common/database/entity-config.util';
import { HouseholdEntity } from '../../../../../common/database/household.entity';
import { NativeEnum } from '../../../../../common/database/native-enum.util';
import { Account } from '../../../../auth/user/account/account.entity';

/**
 * Growth Course Ritual Snooze Entity
 *
 * "Not now" on a ritual reminder, for one period and one person. A snoozed month
 * close moves its reminder to the last day itself; after that it stays open until
 * the month is closed. Snoozing never hides the ritual.
 *
 * @see monthCloseStage in @rumtelo/contracts
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'growth', tableName: 'course_ritual_snooze' }))
@Unique({ properties: ['household', 'account', 'ritual', 'period'] })
export class GrowthCourseRitualSnooze extends HouseholdEntity {
    // ? PROPERTIES
    /** Month (`YYYY-MM`) whose reminder was snoozed. */
    @Property({ length: 10 })
    period!: string;

    // ? ENUMS
    @Enum(NativeEnum({ CourseRitual, domain: 'growth' }))
    ritual!: CourseRitual;

    // ? RELATIONSHIPS
    /** Person who snoozed (`auth.account`). */
    @ManyToOne(() => Account, { mapToPk: true, deleteRule: 'cascade' })
    account!: string;
}
