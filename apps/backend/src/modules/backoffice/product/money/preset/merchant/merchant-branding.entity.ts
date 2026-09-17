import { Entity, OneToOne, Property } from '@mikro-orm/core';

import { BaseEntity } from '../../../../../../common/database/base.entity';
import { entityConfig } from '../../../../../../common/database/entity-config.util';

import { MerchantPreset } from './merchant.entity';

/**
 * Merchant Branding Entity
 *
 * 1:1 presentation fields for a merchant preset — logo hostname and website.
 *
 * @see MerchantPreset
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'money',
        tableName: 'merchant_branding',
    })
)
export class MerchantBranding extends BaseEntity {
    // ? PROPERTIES
    /** Favicon hostname — client builds logo URL; no client brand mirror. */
    @Property({ length: 120, nullable: true })
    logoDomain: string | null = null;

    /** Official site when known (optional). */
    @Property({ length: 240, nullable: true })
    website: string | null = null;

    // ? RELATIONSHIPS
    /** Owning merchant preset (1:1). Cascades when the preset is deleted. */
    @OneToOne(() => MerchantPreset, { owner: true, deleteRule: 'cascade', unique: true })
    preset!: MerchantPreset;
}
