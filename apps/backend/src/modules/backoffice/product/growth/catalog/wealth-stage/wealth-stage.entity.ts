import { Entity, Property, Unique } from '@mikro-orm/core';

import { CatalogEntity } from '../../../../../../common/database/catalog.entity';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { MoneyType } from '../../../../../../common/database/money.type';

/**
 * Wealth Stage Entity
 *
 * Independence band from net worth / progress. Scalable rows (not a Postgres
 * enum); `sortOrder` is the progression ladder (0 = Building …).
 *
 * @see LeverPreset.minWealthStage — lowest stage that sees a lever
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'growth',
        tableName: 'wealth_stage',
    })
)
@Unique({ properties: ['key'] })
export class WealthStage extends CatalogEntity {
    // ? PROPERTIES
    /** One line under the name in progress / coach copy. */
    @Property({ type: 'text', nullable: true })
    description: string | null = null;

    /** Net worth floor in eurocents for later auto-detect; null = manual / unset. */
    @Property({ type: MoneyType, nullable: true })
    minNetWorth: number | null = null;

    // ? UI METADATA
    /** Optional UI badge — marketing copy, not a legal claim. */
    @Property({ length: 64, nullable: true })
    badgeLabel: string | null = null;
}
