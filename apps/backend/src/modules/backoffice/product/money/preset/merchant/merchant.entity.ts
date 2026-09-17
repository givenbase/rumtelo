import type { MerchantHighlight } from '@rumtelo/contracts';
import { Entity, ManyToOne, OneToOne, Property, Unique } from '@mikro-orm/core';

import { BaseEntity } from '../../../../../../common/database/base.entity';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
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
 * @see JarTemplate — default jar for sorted spend
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
export class MerchantPreset extends BaseEntity {
    // ? PROPERTIES
    /** Stable catalog key (e.g. SPOTIFY) — never rename in place. */
    @Property({ length: 64 })
    key!: string;

    /** Human label in admin / future picker UIs. */
    @Property({ length: 120 })
    name!: string;

    /** CategoryTemplate.key for the household category under that jar. */
    @Property({ length: 64 })
    categoryTemplateKey!: string;

    /** ISO 3166-1 alpha-2 markets where this merchant is listed. */
    @Property({ type: 'json', default: ['NL'] })
    markets: string[] = ['NL'];

    // ? UI METADATA
    /** Editorial pin: FEATURED | NEW | POPULAR; null = normal. */
    @Property({ length: 16, nullable: true })
    highlight: MerchantHighlight | null = null;

    /** Display / seed order within the catalog. */
    @Property({ default: 0 })
    sortOrder = 0;

    /** Soft-disable without deleting historical seed identity. */
    @Property({ default: true })
    isActive = true;

    // ? RELATIONSHIPS
    /** Default jar template when this merchant is auto-sorted. */
    @ManyToOne(() => JarTemplate, { deleteRule: 'restrict' })
    jarTemplate!: JarTemplate;

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
