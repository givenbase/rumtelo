import { Entity, Enum, Property, Unique } from '@mikro-orm/decorators/legacy';
import { MerchantSuggestionStatus } from '@rumtelo/contracts';

import { BaseEntity } from '../../../../../../common/database/base.entity';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';

/**
 * Merchant Suggestion Entity
 *
 * Aggregated household nominations of a Party for the Rumtelo merchant catalog.
 * One row per normalized name; `householdCount` rises as more households vote.
 * Staff accept → create `MerchantPreset` and set `acceptedMerchantKey`.
 *
 * @see PartySuggestion — which household parties voted for this suggestion
 * @see MerchantPreset
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'money',
        tableName: 'merchant_suggestion',
    })
)
@Unique({ properties: ['normalizedName'] })
export class MerchantSuggestion extends BaseEntity {
    // ? PROPERTIES
    /** Display name from the first voter (editorial can edit later). */
    @Property({ length: 160 })
    name!: string;

    /** Case-folded, collapsed name — uniqueness key for aggregation. */
    @Property({ length: 160 })
    normalizedName!: string;

    /** Distinct households that suggested this name. */
    @Property({ type: 'int', default: 0 })
    householdCount = 0;

    /**
     * MerchantPreset.key when accepted. Null while OPEN / REJECTED.
     * Natural key string (not FK) so accept can stage before the preset exists.
     */
    @Property({ length: 64, nullable: true })
    acceptedMerchantKey: string | null = null;

    /** Favicon hostname from the party when known. */
    @Property({ length: 120, nullable: true })
    logoDomain: string | null = null;

    /** Website from the party when known. */
    @Property({ length: 240, nullable: true })
    website: string | null = null;

    // ? ENUMS
    @Enum(
        NativeEnum({
            MerchantSuggestionStatus,
            domain: 'money',
            defaultValue: MerchantSuggestionStatus.OPEN,
        })
    )
    status: MerchantSuggestionStatus = MerchantSuggestionStatus.OPEN;
}
