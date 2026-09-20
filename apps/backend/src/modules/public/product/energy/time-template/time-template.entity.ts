import { Entity, Enum, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { TimeDayKind } from '@rumtelo/contracts';
import type { TimeCategory } from '@rumtelo/contracts';

import { HouseholdEntity } from '../../../../../common/database/household.entity';
import { NativeEnum } from '../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../common/database/entity-config.util';
import { Account } from '../../../../auth/user/account/account.entity';

/**
 * Time Template Entity
 *
 * "How does your week mostly look?" A person's stylised workday or day off —
 * the device time-use surveys reach for when a full diary is too much to ask.
 * Two rows per person (one per {@link TimeDayKind}); every weekday belongs to one.
 * Logging a day then becomes "was today typical?" and copies these minutes.
 *
 * Person-attributed household row — whose shape it is {@link Account}, not Better Auth `user`.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'energy', tableName: 'time_template' }))
@Unique({ properties: ['account', 'kind'] })
export class TimeTemplate extends HouseholdEntity {
    // ? PROPERTIES
    /** ISO weekdays (1 = Monday … 7 = Sunday) this shape applies to. */
    @Property({ type: 'jsonb' })
    weekdays: number[] = [];

    /** Minutes per {@link TimeCategory} for one such day. Missing keys mean 0. */
    @Property({ type: 'jsonb' })
    minutes: Partial<Record<TimeCategory, number>> = {};

    // ? ENUMS
    /** Which of the two shapes this is. */
    @Enum(NativeEnum({ TimeDayKind, domain: 'energy' }))
    kind!: TimeDayKind;

    // ? RELATIONSHIPS
    /**
     * Person whose shape this is (`auth.account`). mapToPk keeps `account: string` in app code.
     * Cascades when the account is deleted.
     */
    @ManyToOne(() => Account, { mapToPk: true, deleteRule: 'cascade' })
    account!: string;
}
