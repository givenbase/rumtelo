import { Entity, Enum, Index, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { EnergyMetric } from '@rumtelo/contracts';

import { HouseholdEntity } from '../../../../../common/database/household.entity';
import { NativeEnum } from '../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../common/database/entity-config.util';
import { Account } from '../../../../auth/user/account/account.entity';

/**
 * Energy Log Entity
 *
 * "Energie draagt geld." Tracked because the product claims these are the floor
 * under financial decisions. Correlation with spending is surfaced; causation is
 * never asserted.
 *
 * Person-attributed household row — who logged it is {@link Account}, not Better Auth `user`.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'energy', tableName: 'log' }))
@Index({ properties: ['household', 'loggedOn'] })
// One reading per metric per account per day; a second entry is a correction, not a new row.
@Unique({ properties: ['account', 'loggedOn', 'metric'] })
export class EnergyLog extends HouseholdEntity {
    // ? PROPERTIES
    /** Optional context for the reading. */
    @Property({ length: 280, nullable: true })
    note: string | null = null;

    /** Normalised 0..100 so metrics share one axis. Decimal string — not money. */
    @Property({ type: 'decimal', precision: 5, scale: 2 })
    value!: string;

    /** Calendar day the reading is for. */
    @Property({ type: 'date' })
    loggedOn!: string;

    // ? ENUMS
    /** Which reading (sleep, mood, …). */
    @Enum(NativeEnum({ EnergyMetric, domain: 'energy' }))
    metric!: EnergyMetric;

    // ? RELATIONSHIPS
    /**
     * Logging person (`auth.account`). mapToPk keeps `account: string` in app code.
     * Cascades when the account is deleted.
     */
    @ManyToOne(() => Account, { mapToPk: true, deleteRule: 'cascade' })
    account!: string;
}
