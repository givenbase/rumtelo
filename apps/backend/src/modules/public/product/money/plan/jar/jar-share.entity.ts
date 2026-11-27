import { Check, Entity, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { Jar } from './jar.entity';

import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { entityConfig } from '../../../../../../common/database/entity-config.util';

/**
 * Period key that sorts before every real budget month (`YYYY-MM`).
 *
 * A share row with this period means "this share since the pot existed": the migration that
 * created `money_jar_share` wrote one per existing pot with its percentage at that moment, so
 * the past keeps the split it showed before share history existed. Same year
 * `parsePeriodKey` falls back to, and it passes the table's format check.
 */
export const JAR_SHARE_BASELINE_PERIOD = '1970-01';

/**
 * Jar Share Entity
 *
 * The share of net income a pot takes, from a budget month onwards. Written by the jar service
 * whenever a split is saved or a pot is turned on; `Jar.percentage` stays the cached current
 * value. The share of a pot in month M is the row with the greatest `period` ≤ M; no such row
 * means the pot did not exist yet in M (share 0). Running balances read this history so a new
 * split never rewrites earlier months.
 *
 * @see Jar.percentage — cached current share
 * @see JAR_SHARE_BASELINE_PERIOD — period of the rows written for pots that predate this table
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'jar_share' }))
// One share per pot per month; a second change in the same month overwrites that month's row.
// Its leading `jar_id` also indexes the FK for the cascade from money_jar.
@Unique({ properties: ['jar', 'period'] })
@Check({
    name: 'money_jar_share_period_format',
    expression: "(period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')",
})
@Check({
    name: 'money_jar_share_percentage_range',
    expression: '(percentage BETWEEN 0 AND 100)',
})
export class JarShare extends HouseholdEntity {
    // ? PROPERTIES
    /** Budget month `YYYY-MM` this share applies from (see {@link JAR_SHARE_BASELINE_PERIOD}). */
    @Property({ length: 7 })
    period!: string;

    /** Share of net income routed to the pot from `period` on — same scale as `Jar.percentage`. */
    @Property({ type: 'decimal', precision: 5, scale: 2 })
    percentage!: string;

    // ? RELATIONSHIPS
    /** Pot this share belongs to (N:1, required). Turning a pot off deletes its history. */
    @ManyToOne(() => Jar, { deleteRule: 'cascade' })
    jar!: Jar;
}
