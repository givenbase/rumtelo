import type { MerchantHighlight } from '@rumtelo/contracts';
import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/core';

import { BaseEntity } from '../../../../../../common/database/base.entity';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { JarTemplate } from '../../template/jar/jar.entity';

/**
 * Merchant Preset Entity
 *
 * Matchbook for inbox rules and future Open Banking (Revolut, etc.).
 * `matchValue` + `aliases` cover noisy bank descriptors; `mcc` is optional ISO 18245.
 * Catalog SSOT also owns logoDomain / highlight / markets for the expense picker.
 *
 * @see JarTemplate — default jar for sorted spend
 * @see CategoryTemplate.key — via categoryTemplateKey
 * @see money.rule / money.transaction — household consumers
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

    /** Primary CONTAINS needle for counterparty / description matching. */
    @Property({ length: 120 })
    matchValue!: string;

    /**
     * Extra bank-feed needles (Revolut / SEPA / card descriptors).
     * Matched case-insensitively alongside matchValue.
     */
    @Property({ type: 'json', default: [] })
    aliases: string[] = [];

    /** Optional ISO 18245 merchant category code (4 digits), e.g. "5411" groceries. */
    @Property({ length: 4, nullable: true })
    mcc: string | null = null;

    /** CategoryTemplate.key for the household category under that jar. */
    @Property({ length: 64 })
    categoryTemplateKey!: string;

    /** Favicon hostname — client builds logo URL; no client brand mirror. */
    @Property({ length: 120, nullable: true })
    logoDomain: string | null = null;

    /** Official site when known (optional). */
    @Property({ length: 240, nullable: true })
    website: string | null = null;

    /** Editorial pin: FEATURED | NEW | POPULAR; null = normal. */
    @Property({ length: 16, nullable: true })
    highlight: MerchantHighlight | null = null;

    /** ISO 3166-1 alpha-2 markets where this merchant is listed. */
    @Property({ type: 'json', default: ['NL'] })
    markets: string[] = ['NL'];

    /** Tie-breaker for feed matching and list sort (higher wins). */
    @Property({ default: 0 })
    matchPriority = 0;

    /** Aggregator merchant ids when Open Banking is wired. */
    @Property({ type: 'json' })
    providerIds: Record<string, string> = {};

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
}
