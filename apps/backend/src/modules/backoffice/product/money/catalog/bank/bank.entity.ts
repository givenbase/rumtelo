import { Collection, Entity, ManyToMany, Property, Unique } from '@mikro-orm/core';

import { CatalogEntity } from '../../../../../../common/database/catalog.entity';
import { entityConfig } from '../../../../../../common/database/entity-config.util';

/**
 * Bank catalog — company pick-list of institutions (logo, countries, IBAN code).
 * Household accounts always link via FK (`ON DELETE RESTRICT`). Prefer soft-disable
 * (`isActive`) over hard delete.
 *
 * Card issuers (ICS, Amex) may list retail `partnerBanks` they co-brand with —
 * e.g. ICS ↔ ING / ABN — so the UI can hint where the card debt is typically paid.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'money',
        tableName: 'bank',
    })
)
@Unique({ properties: ['key'] })
export class Bank extends CatalogEntity {
    // ? PROPERTIES
    @Property({ type: 'text', nullable: true })
    description: string | null = null;

    /** ISO-2 markets this institution serves, e.g. ['NL'] or ['NL','DE']. */
    @Property({ type: 'json' })
    countries!: string[];

    /** NL IBAN positions 5–8 when applicable (INGB, ABNA). */
    @Property({ length: 4, nullable: true })
    ibanBankCode: string | null = null;

    /** Favicon hostname — client builds logo URL. */
    @Property({ length: 120, nullable: true })
    logoDomain: string | null = null;

    @Property({ length: 240, nullable: true })
    website: string | null = null;

    // ? RELATIONSHIPS
    /**
     * Retail banks this issuer co-brands with / that typically settle the card.
     * Empty for plain retail banks. ICS → ING, ABN, SNS, …
     */
    @ManyToMany(() => Bank, undefined, {
        owner: true,
        pivotTable: 'reference_money_bank_partner',
    })
    partnerBanks = new Collection<Bank>(this);
}
