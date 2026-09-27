import { Entity, Property, Unique } from '@mikro-orm/core';

import { BaseEntity } from '../../../../../common/database/base.entity';
import { entityConfig } from '../../../../../common/database/entity-config.util';

/**
 * Practice Entity
 *
 * B2B company / coach org control plane — not a household, not better-auth org.
 * Street addresses live on {@link Address} via {@link PracticeAddress}.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'platform', tableName: 'practice' }))
@Unique({ properties: ['slug'] })
export class Practice extends BaseEntity {
    // ? PROPERTIES
    /** Legal / contract name for invoices. */
    @Property({ type: 'varchar', length: 160 })
    legalName!: string;

    /** UI label (defaults to legal name at create). */
    @Property({ type: 'varchar', length: 120 })
    displayName!: string;

    /** URL-safe unique slug. */
    @Property({ type: 'varchar', length: 80 })
    slug!: string;

    /** Invoices + Stripe customer email. */
    @Property({ type: 'varchar', length: 255 })
    billingEmail!: string;

    /** Optional ops phone. */
    @Property({ type: 'varchar', length: 40, nullable: true })
    phone: string | null = null;

    /** Chamber / company registration number (e.g. KvK). */
    @Property({ type: 'varchar', length: 64, nullable: true })
    registrationNumber: string | null = null;

    /** VAT / BTW number. */
    @Property({ type: 'varchar', length: 64, nullable: true })
    vatNumber: string | null = null;

    /** Optional website URL. */
    @Property({ type: 'varchar', length: 240, nullable: true })
    website: string | null = null;

    /** When terms + privacy + processor notice were accepted. */
    @Property({ type: 'timestamptz' })
    acceptedTermsAt!: Date;
}
