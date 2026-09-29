import { Entity, Property } from '@mikro-orm/decorators/legacy';

import { BaseEntity } from '../../../../common/database/base.entity';
import { entityConfig } from '../../../../common/database/entity-config.util';

/**
 * Address Entity
 *
 * Canonical street-address values shared by practices and accounts.
 * Parties attach via typed link tables (`platform_practice_address`,
 * `auth.account_address`) — never via polymorphic owner_type.
 * Each party owns its own address row instances (not shared across parties).
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'platform', tableName: 'address' }))
export class Address extends BaseEntity {
    // ? PROPERTIES
    /** Primary street line. */
    @Property({ type: 'varchar', length: 200 })
    line1!: string;

    /** Suite / unit / secondary line. */
    @Property({ type: 'varchar', length: 200, nullable: true })
    line2: string | null = null;

    /** Postal / ZIP code. */
    @Property({ type: 'varchar', length: 32 })
    postalCode!: string;

    /** City / locality. */
    @Property({ type: 'varchar', length: 120 })
    city!: string;

    /** ISO 3166-1 alpha-2 country code. */
    @Property({ type: 'varchar', length: 2 })
    country!: string;
}
