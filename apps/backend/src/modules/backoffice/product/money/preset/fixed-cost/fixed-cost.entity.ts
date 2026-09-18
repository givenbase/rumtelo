import {
    Collection,
    Entity,
    Enum,
    Index,
    ManyToMany,
    ManyToOne,
    OneToMany,
    Property,
    Unique,
} from '@mikro-orm/core';
import { Cadence, FlowDirection } from '@rumtelo/contracts';

import { CatalogEntity } from '../../../../../../common/database/catalog.entity';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { Audience } from '../../catalog/audience/audience.entity';
import { CategoryTemplate } from '../../template/category/category.entity';
import { JarTemplate } from '../../template/jar/jar.entity';
import type { FixedCostPresetMerchant } from './fixed-cost-merchant.entity';

/**
 * Fixed Cost Preset Entity
 *
 * Suggestion catalog for "New fixed cost" — real-world bill names with jar +
 * category defaults and audience tags. Households copy into money.fixed_cost.
 *
 * @see JarTemplate / CategoryTemplate — default placement for this bill
 * @see Audience — picker filter chips (N:M)
 * @see FixedCostPresetMerchant — ordered "Paid to" chips
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
@Index({ properties: ['jarTemplate'] })
@Index({ properties: ['categoryTemplate'] })
export class FixedCostPreset extends CatalogEntity {
    // ? PROPERTIES
    /** Day-of-month hint (1–31) pre-filled in the due-day field; null = none. */
    @Property({ type: 'smallint', nullable: true })
    dueDay: number | null = null;

    // ? ENUMS
    /** Recurrence pre-filled when creating the household fixed cost. */
    @Enum(NativeEnum({ Cadence, domain: 'money', defaultValue: Cadence.MONTHLY }))
    cadence: Cadence = Cadence.MONTHLY;

    /** OUT = expense bill; IN = rare fixed inflow. */
    @Enum(NativeEnum({ FlowDirection, domain: 'money', defaultValue: FlowDirection.OUT }))
    direction: FlowDirection = FlowDirection.OUT;

    // ? RELATIONSHIPS
    /** Default jar template; app resolves household jar by jarTemplate.key. */
    @ManyToOne(() => JarTemplate, { deleteRule: 'restrict' })
    jarTemplate!: JarTemplate;

    /** Category to resolve / create under that jar on pick. */
    @ManyToOne(() => CategoryTemplate, { deleteRule: 'restrict' })
    categoryTemplate!: CategoryTemplate;

    /** Audience filters for the bill picker (N:M, owner side). Empty = every audience. */
    @ManyToMany(() => Audience, undefined, {
        pivotTable: 'reference_money_fixed_cost_preset_audience',
    })
    audiences = new Collection<Audience>(this);

    /** Ordered "Paid to" merchant chips (1:N to the pivot; empty = free text only). */
    @OneToMany<FixedCostPresetMerchant, FixedCostPreset>({
        entity: 'FixedCostPresetMerchant',
        mappedBy: 'preset',
        orderBy: { sortOrder: 'ASC' },
        orphanRemoval: true,
    })
    merchantLinks = new Collection<FixedCostPresetMerchant>(this);
}
