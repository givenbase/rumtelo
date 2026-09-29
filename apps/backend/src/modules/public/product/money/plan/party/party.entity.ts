import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { CatalogKey } from '../../../../../../common/database/catalog-key.util';
import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { Jsonb } from '../../../../../../common/database/jsonb.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { MerchantPreset } from '../../../../../backoffice/product/money/preset/merchant/merchant.entity';

/**
 * Party Entity
 *
 * The household's own saved "other side" of a money row — employer, landlord,
 * client, lender, corner shop — for names that are not in the Rumtelo merchant
 * catalog. One party is shared by income sources, fixed costs, transactions and
 * debts, so a name typed once autocompletes everywhere.
 *
 * Household-owned counterpart of `MerchantPreset`: same UI metadata, but the
 * household edits it. Rows link by uuid (`IncomeSource.party`); the row's
 * `counterparty` text stays a snapshot so deleting a party never blanks history.
 *
 * @see MerchantPreset — the Rumtelo-owned catalog this can be matched to
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'party' }))
// Exact-name uniqueness in the DB; the service also rejects case-insensitive duplicates.
@Unique({ properties: ['household', 'name'] })
@Index({ properties: ['household', 'merchantKey'] })
export class Party extends HouseholdEntity {
    // ? PROPERTIES
    /** Display name ("ACME BV", "Mrs. Jansen"). Unique per household. */
    @Property({ length: 160 })
    name!: string;

    /** Household note ("landlord since 2021", "invoice on the 25th"). */
    @Property({ length: 280, nullable: true })
    note: string | null = null;

    /** Other spellings seen on statements; autocomplete + bank matching. */
    @Property(Jsonb({ emptyArray: true }))
    aliases: string[] = [];

    // ? UI METADATA
    /** CSS color token for chips / avatars. */
    @Property({ length: 64, nullable: true })
    color: string | null = null;

    /** Emoji for the chip. */
    @Property({ length: 8, nullable: true })
    icon: string | null = null;

    /** Favicon hostname — client builds logo URL. */
    @Property({ length: 120, nullable: true })
    logoDomain: string | null = null;

    /** Website when known. */
    @Property({ length: 240, nullable: true })
    website: string | null = null;

    // ? RELATIONSHIPS
    /**
     * Catalog merchant this party was matched to — natural-key FK on
     * `MerchantPreset.key`, set when Rumtelo accepts a suggestion. Rows keep
     * pointing at the party; branding falls back to the merchant.
     */
    @ManyToOne(() => MerchantPreset, CatalogKey('merchant_key'))
    merchantKey: string | null = null;
}
