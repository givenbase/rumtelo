import { Entity, OneToOne, Property } from '@mikro-orm/core';

import { BaseEntity } from '../../../../../../common/database/base.entity';
import { entityConfig } from '../../../../../../common/database/entity-config.util';

import { MerchantPreset } from './merchant.entity';

/**
 * Merchant Banking Entity
 *
 * Optional 1:1 banking extras for a merchant preset (NL IBAN bank code).
 * Present only when the merchant is a real bank with a domestic code.
 *
 * @see MerchantPreset
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'money',
        tableName: 'merchant_banking',
    })
)
export class MerchantBanking extends BaseEntity {
    // ? PROPERTIES
    /**
     * Dutch IBAN bank identifier (positions 5–8), e.g. INGB for ING.
     */
    @Property({ length: 4 })
    ibanBankCode!: string;

    // ? RELATIONSHIPS
    /** Owning merchant preset (1:1). Cascades when the preset is deleted. */
    @OneToOne(() => MerchantPreset, { owner: true, deleteRule: 'cascade', unique: true })
    preset!: MerchantPreset;
}
