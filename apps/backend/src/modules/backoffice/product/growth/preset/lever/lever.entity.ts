import {
    Collection,
    Entity,
    Index,
    ManyToMany,
    ManyToOne,
    Property,
    Unique,
} from '@mikro-orm/core';
import type { SpendingStyle } from '@rumtelo/contracts';

import { CatalogEntity } from '../../../../../../common/database/catalog.entity';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { IncomePosture } from '../../catalog/income-posture/income-posture.entity';
import { WealthStage } from '../../catalog/wealth-stage/wealth-stage.entity';

/**
 * Lever Preset Entity
 *
 * Rumtelo-owned catalog of earning methods / levers shown on Growth → Income.
 * Audience targeting uses catalog relations (posture / wealth stage) so the
 * taxonomies scale without enums; spending style is a contracts enum.
 *
 * @see IncomePosture — N:M audience filter
 * @see WealthStage — minimum stage that sees this lever
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'growth',
        tableName: 'lever_preset',
    })
)
@Unique({ properties: ['key'] })
@Index({ properties: ['minWealthStage'] })
export class LeverPreset extends CatalogEntity {
    // ? PROPERTIES
    /** One-paragraph pitch shown on the lever card. */
    @Property({ type: 'text' })
    description!: string;

    /** Empty = relevant for every spending style (contracts enum values). */
    @Property({ type: 'json', default: [] })
    spendingStyles: SpendingStyle[] = [];

    // ? UI METADATA
    /** CSS color token for the card accent (e.g. var(--color-accent)). */
    @Property({ length: 64 })
    accentColor!: string;

    // ? RELATIONSHIPS
    /** Lowest wealth stage that should see this lever (compared by stage.sortOrder). */
    @ManyToOne(() => WealthStage, { deleteRule: 'restrict' })
    minWealthStage!: WealthStage;

    /** Postures this lever targets (N:M, owner side). Empty = every posture. */
    @ManyToMany(() => IncomePosture, undefined, {
        pivotTable: 'reference_growth_lever_preset_income_posture',
    })
    postures = new Collection<IncomePosture>(this);
}
