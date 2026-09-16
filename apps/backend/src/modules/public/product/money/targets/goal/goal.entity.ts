import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import { type GivingCause, GoalKind, GoalStatus } from '@rumtelo/contracts';

import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { Jar } from '../../plan/jar/jar.entity';

/**
 * Goal Entity — SAVE (jar savings), EARN (monthly net), or GIVE (yearly pledge).
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'goal' }))
export class Goal extends HouseholdEntity {
    // ? PROPERTIES
    @Property({ length: 120 })
    name!: string;

    @Property({ type: 'text', nullable: true })
    why: string | null = null;

    @Property({ length: 8, nullable: true })
    icon: string | null = null;

    @Property({ type: 'bigint' })
    target!: number;

    @Property({ type: 'bigint', default: 0 })
    saved = 0;

    @Property({ type: 'bigint', default: 0 })
    monthlyContribution = 0;

    /** GIVE: GivingCause key this pledge is reserved for; null = open. */
    @Property({ length: 32, nullable: true })
    cause: GivingCause | null = null;

    /** GIVE: GivingOrganisation catalog key when named; null = open / free-text. */
    @Property({ length: 64, nullable: true })
    orgKey: string | null = null;

    @Property({ type: 'date', nullable: true })
    fulfilledOn: string | null = null;

    @Property({ type: 'date', nullable: true })
    targetOn: string | null = null;

    // ? ENUMS
    @Enum(NativeEnum({ GoalKind, domain: 'money', defaultValue: GoalKind.SAVE }))
    kind: GoalKind = GoalKind.SAVE;

    @Enum(NativeEnum({ GoalStatus, domain: 'money', defaultValue: GoalStatus.ACTIVE }))
    status: GoalStatus = GoalStatus.ACTIVE;

    // ? RELATIONSHIPS
    @ManyToOne(() => Jar, { nullable: true })
    jar: Jar | null = null;
}
