import { Entity, OneToOne, Property } from '@mikro-orm/core';

import { BaseEntity } from '../../../../../../common/database/base.entity';
import { entityConfig } from '../../../../../../common/database/entity-config.util';

import { MerchantPreset } from './merchant.entity';

/**
 * Merchant Matching Entity
 *
 * 1:1 feed/inbox needles for a merchant preset — matchValue, aliases, MCC, priority.
 *
 * @see MerchantPreset
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'money',
        tableName: 'merchant_matching',
    })
)
export class MerchantMatching extends BaseEntity {
    // ? PROPERTIES
    /** Primary CONTAINS needle for counterparty / description matching. */
    @Property({ length: 120 })
    matchValue!: string;

    /** Optional ISO 18245 merchant category code (4 digits), e.g. "5411" groceries. */
    @Property({ length: 4, nullable: true })
    mcc: string | null = null;

    /** Tie-breaker for feed matching and list sort (higher wins). */
    @Property({ default: 0 })
    matchPriority = 0;

    /**
     * Extra bank-feed needles (Revolut / SEPA / card descriptors).
     * Matched case-insensitively alongside matchValue.
     */
    @Property({ type: 'json', default: [] })
    aliases: string[] = [];

    /** Aggregator merchant ids when Open Banking is wired. */
    @Property({ type: 'json' })
    providerIds: Record<string, string> = {};

    // ? RELATIONSHIPS
    /** Owning merchant preset (1:1). Cascades when the preset is deleted. */
    @OneToOne(() => MerchantPreset, { owner: true, deleteRule: 'cascade', unique: true })
    preset!: MerchantPreset;
}
