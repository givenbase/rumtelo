import { Entity, Property, Unique } from '@mikro-orm/core';
import type { GivingCause, GivingSignal } from '@rumtelo/contracts';

import { CatalogEntity } from '../../../../../../common/database/catalog.entity';
import { entityConfig } from '../../../../../../common/database/entity-config.util';

/**
 * Giving Organisation Entity
 *
 * Vetted places the Give jar can flow to. Editorial, company-authored list.
 * Every row cites at least one independent evaluator or register (GiveWell, CBF,
 * ANBI, …) in `signals`; Rumtelo never claims its own vetting. Households copy
 * the name into fixed_cost.counterparty or transaction.counterparty — nothing
 * here is household data.
 *
 * @see GivingCause — cause filter chips in the Coach helper
 * @see GivingEvaluator — glossary the app renders for each signal
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'money',
        tableName: 'giving_organisation',
    })
)
@Unique({ properties: ['key'] })
export class GivingOrganisation extends CatalogEntity {
    // ? PROPERTIES
    /** One neutral sentence on what they do. */
    @Property({ type: 'text' })
    description!: string;

    /** ISO 3166-1 alpha-2 of the HQ; null when genuinely distributed. */
    @Property({ length: 2, nullable: true })
    country: string | null = null;

    /** Where the work lands (e.g. "Sub-Saharan Africa", "Netherlands"). */
    @Property({ length: 64, nullable: true })
    scope: string | null = null;

    /** How donors hear back — annual report, live feed, per-programme updates. */
    @Property({ type: 'text', nullable: true })
    reporting: string | null = null;

    /** GivingCause keys this organisation serves (TS enum — no catalog table). */
    @Property({ type: 'json', default: [] })
    causes: GivingCause[] = [];

    /** Independent signals: evaluator, claim, source URL, year confirmed. */
    @Property({ type: 'json', default: [] })
    signals: GivingSignal[] = [];

    /** Official website. */
    @Property({ type: 'text' })
    website!: string;
}
