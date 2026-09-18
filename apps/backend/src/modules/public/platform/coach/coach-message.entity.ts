import { Entity, Enum, Index, Property } from '@mikro-orm/core';
import { CoachKind } from '@rumtelo/contracts';

import { HouseholdEntity } from '../../../../common/database/household.entity';
import { NativeEnum } from '../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../common/database/entity-config.util';

/**
 * Coach Message Entity
 *
 * The Coach never scolds — "informatie, nooit schaamte". Every message carries
 * exactly one concrete next move, which is why the CTA travels with it.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'platform', tableName: 'coach_message' }))
@Index({ properties: ['household', 'period'] })
export class CoachMessage extends HouseholdEntity {
    // ? PROPERTIES
    /** Budget period `YYYY-MM` the message belongs to. */
    @Property({ length: 7 })
    period!: string;

    /** The message body. */
    @Property({ type: 'text' })
    text!: string;

    /** Button label for the one next move. */
    @Property({ length: 60, nullable: true })
    ctaLabel: string | null = null;

    /** In-app path the button navigates to. */
    @Property({ length: 200, nullable: true })
    ctaHref: string | null = null;

    /** When the household dismissed it; null = still shown. */
    @Property({ type: 'timestamptz', nullable: true })
    dismissedAt: Date | null = null;

    // ? ENUMS
    /** Nudge / celebration / warning — tone, never blame. */
    @Enum(NativeEnum({ CoachKind, domain: 'platform', defaultValue: CoachKind.NUDGE }))
    kind: CoachKind = CoachKind.NUDGE;
}
