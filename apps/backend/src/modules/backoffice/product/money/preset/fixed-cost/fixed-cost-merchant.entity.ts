import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/core';

import { BaseEntity } from '../../../../../../common/database/base.entity';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { MerchantPreset } from '../merchant/merchant.entity';
import { FixedCostPreset } from './fixed-cost.entity';

/**
 * Fixed Cost Preset Merchant Entity
 *
 * Ordered link between a fixed-cost preset and the merchants offered as
 * "Paid to" chips. Modelled as an entity (not a bare N:M) because the link
 * carries data: chip order.
 *
 * @see FixedCostPreset.merchantLinks
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'money',
        tableName: 'fixed_cost_preset_merchant',
    })
)
@Unique({ properties: ['preset', 'merchant'] })
@Index({ properties: ['merchant'] })
export class FixedCostPresetMerchant extends BaseEntity {
    // ? PROPERTIES
    /** Chip order within the preset. */
    @Property({ default: 0 })
    sortOrder = 0;

    // ? RELATIONSHIPS
    /** Owning preset (N:1). Deleting the preset deletes its links. */
    @ManyToOne(() => FixedCostPreset, { deleteRule: 'cascade' })
    preset!: FixedCostPreset;

    /** Suggested merchant (N:1). Deleting the merchant deletes its links. */
    @ManyToOne(() => MerchantPreset, { deleteRule: 'cascade' })
    merchant!: MerchantPreset;
}
