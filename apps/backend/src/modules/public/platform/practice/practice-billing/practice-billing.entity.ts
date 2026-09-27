import { Entity, Enum, Index, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { PracticeSubscriptionStatus } from '@rumtelo/contracts';

import { BaseEntity } from '../../../../../common/database/base.entity';
import { entityConfig } from '../../../../../common/database/entity-config.util';
import { NativeEnum } from '../../../../../common/database/native-enum.util';
import { Practice } from '../practice/practice.entity';

/**
 * Practice Billing Entity
 *
 * Stripe meter state for a Practice — 1:1 with practice.
 * Subscription = base + staff seats + client seats.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'platform', tableName: 'practice_billing' }))
@Unique({ properties: ['practice'] })
@Index({
    name: 'platform_practice_billing_stripe_customer_id_index',
    properties: ['stripeCustomerId'],
    options: { where: 'stripe_customer_id IS NOT NULL' },
})
@Unique({
    name: 'platform_practice_billing_stripe_subscription_id_unique',
    properties: ['stripeSubscriptionId'],
    options: { where: 'stripe_subscription_id IS NOT NULL' },
})
export class PracticeBilling extends BaseEntity {
    // ? PROPERTIES
    @Property({ type: 'varchar', length: 255, nullable: true })
    stripeCustomerId: string | null = null;

    @Property({ type: 'varchar', length: 255, nullable: true })
    stripeSubscriptionId: string | null = null;

    /** Count of seat_billable practice members (mirrored for meter). */
    @Property({ type: 'int', default: 0 })
    billableSeatCount = 0;

    /** Count of active client household links (mirrored for meter). */
    @Property({ type: 'int', default: 0 })
    billableClientCount = 0;

    @Property({ type: 'timestamptz', nullable: true })
    periodStartedAt: Date | null = null;

    @Property({ type: 'timestamptz', nullable: true })
    periodEndsAt: Date | null = null;

    // ? ENUMS
    @Enum(
        NativeEnum({
            PracticeSubscriptionStatus,
            domain: 'platform',
            defaultValue: PracticeSubscriptionStatus.NONE,
        })
    )
    status: PracticeSubscriptionStatus = PracticeSubscriptionStatus.NONE;

    // ? RELATIONSHIPS
    @ManyToOne(() => Practice, { mapToPk: true, deleteRule: 'cascade' })
    practice!: string;
}
