import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/core';

import { HouseholdEntity } from '../../../../../common/database/household.entity';
import { MoneyType } from '../../../../../common/database/money.type';
import { entityConfig } from '../../../../../common/database/entity-config.util';
import { Jar } from '../plan/jar/jar.entity';
import { MoneyWeekCheck } from './money-week-check.entity';

/**
 * Week Check Allocation Entity
 *
 * Where the week's surplus was redirected.
 *
 * A normalised table rather than a jsonb column on the week check: these rows are
 * queried by jar to answer "how much has this jar received from week checks", they
 * need a real foreign key to Jar so a deleted jar cannot leave orphan references,
 * and they are summed in aggregate queries where jsonb would force a scan.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'week_check_allocation' }))
@Unique({ properties: ['weekCheck', 'jar'] })
@Index({ properties: ['jar'] })
export class WeekCheckAllocation extends HouseholdEntity {
    // ? PROPERTIES
    /** Amount redirected to the jar, in minor units. */
    @Property({ type: MoneyType })
    amount!: number;

    // ? RELATIONSHIPS
    /** Owning week check (N:1, required). Deleting the check deletes its allocations. */
    @ManyToOne(() => MoneyWeekCheck, { deleteRule: 'cascade' })
    weekCheck!: MoneyWeekCheck;

    /** Receiving jar (N:1, required). Deleting the jar deletes its allocations. */
    @ManyToOne(() => Jar, { deleteRule: 'cascade' })
    jar!: Jar;
}
