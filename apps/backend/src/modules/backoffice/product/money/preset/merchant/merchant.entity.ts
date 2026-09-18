import {
    Collection,
    Entity,
    Enum,
    Index,
    ManyToMany,
    ManyToOne,
    OneToOne,
    Unique,
} from '@mikro-orm/core';
import { MerchantHighlight } from '@rumtelo/contracts';

import { CatalogEntity } from '../../../../../../common/database/catalog.entity';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { GivingOrganisation } from '../../catalog/giving-organisation/giving-organisation.entity';
import { Market } from '../../catalog/market/market.entity';
import { CategoryTemplate } from '../../template/category/category.entity';
import { JarTemplate } from '../../template/jar/jar.entity';

import type { MerchantBanking } from './merchant-banking.entity';
import type { MerchantBranding } from './merchant-branding.entity';
import type { MerchantMatching } from './merchant-matching.entity';

/**
 * Merchant Preset Entity
 *
 * Catalog identity + placement for expense / bank pickers.
 * Matching, branding, and optional banking live on 1:1 children.
 *
 * @see MerchantMatching — feed needles
 * @see MerchantBranding — logo / website
 * @see MerchantBanking — NL IBAN bank code (optional)
 * @see JarTemplate / CategoryTemplate — default placement for sorted spend
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'money',
        tableName: 'merchant_preset',
    })
)
@Unique({ properties: ['key'] })
@Index({ properties: ['jarTemplate'] })
@Index({ properties: ['categoryTemplate'] })
@Index({ properties: ['givingOrganisation'] })
export class MerchantPreset extends CatalogEntity {
    // ? ENUMS
    /** Editorial pin: FEATURED | NEW | POPULAR; null = normal. */
    @Enum(NativeEnum({ MerchantHighlight, domain: 'money', nullable: true }))
    highlight: MerchantHighlight | null = null;

    // ? RELATIONSHIPS
    /** Default jar template when this merchant is auto-sorted. */
    @ManyToOne(() => JarTemplate, { deleteRule: 'restrict' })
    jarTemplate!: JarTemplate;

    /** Default category under that jar. */
    @ManyToOne(() => CategoryTemplate, { deleteRule: 'restrict' })
    categoryTemplate!: CategoryTemplate;

    /**
     * When set, this merchant mirrors a GivingOrganisation. The org catalog owns
     * editorial identity; the merchant row stays for bank matching.
     */
    @ManyToOne(() => GivingOrganisation, { nullable: true, deleteRule: 'set null' })
    givingOrganisation: GivingOrganisation | null = null;

    /** Markets where this merchant is listed (N:M, owner side). */
    @ManyToMany(() => Market, undefined, {
        pivotTable: 'reference_money_merchant_preset_market',
    })
    markets = new Collection<Market>(this);

    /** Feed matching needles (always present). */
    @OneToOne('MerchantMatching', { mappedBy: 'preset' })
    matching?: MerchantMatching;

    /** Logo / website (always present). */
    @OneToOne('MerchantBranding', { mappedBy: 'preset' })
    branding?: MerchantBranding;

    /** NL IBAN bank code — only for banks that have one. */
    @OneToOne('MerchantBanking', { mappedBy: 'preset' })
    banking?: MerchantBanking | null;
}
