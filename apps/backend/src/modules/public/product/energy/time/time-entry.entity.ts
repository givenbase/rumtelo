import { Entity, Enum, Index, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { TimeCategory } from '@rumtelo/contracts';

import { HouseholdEntity } from '../../../../../common/database/household.entity';
import { NativeEnum } from '../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../common/database/entity-config.util';
import { Account } from '../../../../auth/user/account/account.entity';

/**
 * Time Entry Entity
 *
 * "Every hour gets a job too." Minutes one person spent on one activity category
 * on one day — the diary row behind the weekly 168-hour view. Categories follow the
 * Eurostat HETUS coding list so household data can sit next to national benchmarks.
 * Compared against cited evidence bands; never scored.
 *
 * Person-attributed household row — whose day it is {@link Account}, not Better Auth `user`.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'energy', tableName: 'time_entry' }))
@Index({ properties: ['household', 'loggedOn'] })
// One row per category per person per day; logging again is a correction, not a new row.
@Unique({ properties: ['account', 'loggedOn', 'category'] })
export class TimeEntry extends HouseholdEntity {
    // ? PROPERTIES
    /** Optional context for the day ("night shift", "sick"). */
    @Property({ length: 280, nullable: true })
    note: string | null = null;

    /** Whole minutes spent that day (0–1440). */
    @Property({ type: 'smallint' })
    minutes!: number;

    /** Calendar day the minutes belong to. */
    @Property({ type: 'date' })
    loggedOn!: string;

    // ? ENUMS
    /** HETUS-derived activity bucket. */
    @Enum(NativeEnum({ TimeCategory, domain: 'energy' }))
    category!: TimeCategory;

    // ? RELATIONSHIPS
    /**
     * Person whose day this is (`auth.account`). mapToPk keeps `account: string` in app code.
     * Cascades when the account is deleted.
     */
    @ManyToOne(() => Account, { mapToPk: true, deleteRule: 'cascade' })
    account!: string;
}
