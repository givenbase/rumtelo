import { Check, Entity, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { entityConfig } from '../../../../../common/database/entity-config.util';
import { HouseholdEntity } from '../../../../../common/database/household.entity';
import { Account } from '../../../../auth/user/account/account.entity';

/**
 * Growth Course Feed Entity (calendar mirror)
 *
 * One person's secret ICS address for Google, Apple or Outlook. The address token
 * is derived from the row id, `version` and the server secret, so the table only
 * holds its SHA-256 (`tokenHash`): a database copy alone cannot open a feed.
 * Rotating bumps `version`; the old address stops working at once.
 *
 * @see CourseFeedService
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'growth', tableName: 'course_feed' }))
@Unique({ properties: ['household', 'account'] })
@Unique({ properties: ['tokenHash'] })
@Check({
    name: 'growth_course_feed_lead_days',
    expression: '(month_close_lead_days IN (0, 3, 7))',
})
export class GrowthCourseFeed extends HouseholdEntity {
    // ? PROPERTIES
    /** Bumped on rotate; part of the token derivation. */
    @Property({ type: 'smallint', default: 1 })
    version = 1;

    /** SHA-256 (hex) of the current address token. */
    @Property({ length: 64 })
    tokenHash!: string;

    /** "Plan your month close" this many days before the last day (0 · 3 · 7). */
    @Property({ type: 'smallint', default: 3 })
    monthCloseLeadDays = 3;

    /** Feed switched on; off = the address answers 404. */
    @Property({ default: true })
    isEnabled = true;

    @Property({ default: true })
    isFocusWeekShown = true;

    @Property({ default: true })
    isFocusDayShown = true;

    @Property({ default: false })
    isRhythmShown = false;

    @Property({ default: true })
    isRitualsShown = true;

    @Property({ default: false })
    isSleepShown = false;

    @Property({ default: false })
    isPartnerShown = false;

    /** Last time a calendar fetched the address. */
    @Property({ type: 'timestamptz', nullable: true })
    lastFetchedAt: Date | null = null;

    // ? RELATIONSHIPS
    /** Whose feed (`auth.account`). */
    @ManyToOne(() => Account, { mapToPk: true, deleteRule: 'cascade' })
    account!: string;
}
