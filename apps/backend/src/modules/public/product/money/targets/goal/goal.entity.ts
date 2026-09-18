import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/core';
import { GivingCause, GoalKind, GoalStatus } from '@rumtelo/contracts';

import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { MoneyType } from '../../../../../../common/database/money.type';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { Jar } from '../../plan/jar/jar.entity';

/**
 * Goal Entity
 *
 * SAVE (jar savings), EARN (monthly net), or GIVE (yearly pledge).
 * Goals hold decisions: focus / rank first, then claim.
 *
 * @see GoalPreset — backoffice starting points
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'goal' }))
@Index({ properties: ['jar'] })
export class Goal extends HouseholdEntity {
    // ? PROPERTIES
    /** Household-facing label ("Emergency fund"). */
    @Property({ length: 120 })
    name!: string;

    /** The household's own reason — shown on the goal card. */
    @Property({ type: 'text', nullable: true })
    why: string | null = null;

    /** Emoji / short icon token. */
    @Property({ length: 8, nullable: true })
    icon: string | null = null;

    /** Target amount in minor units (SAVE: total; EARN: monthly net; GIVE: yearly pledge). */
    @Property({ type: MoneyType })
    target!: number;

    /** Progress so far in minor units. */
    @Property({ type: MoneyType, default: 0 })
    saved = 0;

    /** Planned contribution per month in minor units. */
    @Property({ type: MoneyType, default: 0 })
    monthlyContribution = 0;

    /**
     * SAVE: priority within the same jar — lower = higher focus (#1 first).
     * EARN / GIVE stay 0.
     */
    @Property({ type: 'int', default: 0 })
    sortOrder = 0;

    /**
     * GIVE: `GivingOrganisation.key` when a named organisation was picked.
     * Snapshot, not an FK — household rows never depend on mutable catalog rows.
     * Null = open / free-text.
     */
    @Property({ length: 64, nullable: true })
    givingOrganisationKey: string | null = null;

    /** GIVE: date the pledge was honoured. */
    @Property({ type: 'date', nullable: true })
    fulfilledOn: string | null = null;

    /** Date the household wants to reach `target`. */
    @Property({ type: 'date', nullable: true })
    targetOn: string | null = null;

    // ? ENUMS
    /** SAVE / EARN / GIVE — decides which fields are meaningful. */
    @Enum(NativeEnum({ GoalKind, domain: 'money', defaultValue: GoalKind.SAVE }))
    kind: GoalKind = GoalKind.SAVE;

    /** Active / reached / archived. */
    @Enum(NativeEnum({ GoalStatus, domain: 'money', defaultValue: GoalStatus.ACTIVE }))
    status: GoalStatus = GoalStatus.ACTIVE;

    /** GIVE: cause this pledge is reserved for; null = open. */
    @Enum(NativeEnum({ GivingCause, domain: 'money', nullable: true }))
    cause: GivingCause | null = null;

    // ? RELATIONSHIPS
    /** SAVE: jar the savings live in. Cleared if the jar goes. */
    @ManyToOne(() => Jar, { nullable: true, deleteRule: 'set null' })
    jar: Jar | null = null;
}
