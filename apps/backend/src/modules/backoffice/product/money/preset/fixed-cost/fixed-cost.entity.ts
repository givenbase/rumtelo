import { Entity, Enum, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { Cadence, FlowDirection } from '@rumtelo/contracts';

import { BaseEntity } from '../../../../../../common/database/base.entity';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { JarTemplate } from '../../template/jar/jar.entity';

/**
 * Fixed Cost Preset Entity
 *
 * Suggestion catalog for "New fixed cost" — real-world bill names with jar +
 * category defaults and audience tags. Households copy into money.fixed_cost.
 *
 * @see JarTemplate — default jar for this bill
 * @see CategoryTemplate.key — via categoryTemplateKey
 * @see money.fixed_cost — household-owned instances
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'money',
        tableName: 'fixed_cost_preset',
    })
)
@Unique({ properties: ['key'] })
export class FixedCostPreset extends BaseEntity {
    // ? PROPERTIES
    /** Stable catalog key (e.g. RENT) — never rename in place. */
    @Property({ length: 64 })
    key!: string;

    /** English name filled into the create form when picked. */
    @Property({ length: 120 })
    name!: string;

    /** CategoryTemplate.key to resolve/create under that jar on pick. */
    @Property({ length: 64 })
    categoryTemplateKey!: string;

    /** Optional day-of-month hint (1–31) for the due-day field. */
    @Property({ type: 'smallint', nullable: true })
    suggestedDueDay: number | null = null;

    /**
     * Life-stage / lifestyle filters for the picker
     * (STUDENT, FAMILY, ELDERLY, CAR_OWNER, COMMON, …).
     */
    @Property({ type: 'json', default: [] })
    audienceTags: string[] = [];

    /**
     * MerchantPreset.key chips for “Paid to” after this bill type is picked.
     * Empty = free text only (no category dump). Order = chip order.
     */
    @Property({ type: 'json', default: [] })
    suggestedMerchantKeys: string[] = [];

    /** Display / seed order within the catalog. */
    @Property({ default: 0 })
    sortOrder = 0;

    /** Soft-disable without deleting historical seed identity. */
    @Property({ default: true })
    isActive = true;

    // ? ENUMS
    /** Suggested recurrence when creating the household fixed cost. */
    @Enum(NativeEnum({ Cadence, domain: 'money', defaultValue: Cadence.MONTHLY }))
    defaultCadence: Cadence = Cadence.MONTHLY;

    /** OUT = expense bill; IN = rare fixed inflow. */
    @Enum(NativeEnum({ FlowDirection, domain: 'money', defaultValue: FlowDirection.OUT }))
    direction: FlowDirection = FlowDirection.OUT;

    // ? RELATIONSHIPS
    /** Default jar template; app resolves household jar by jarTemplate.key. */
    @ManyToOne(() => JarTemplate, { deleteRule: 'restrict' })
    jarTemplate!: JarTemplate;
}
