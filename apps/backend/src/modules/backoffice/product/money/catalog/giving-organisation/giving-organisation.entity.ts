import { Entity, Property, Unique } from '@mikro-orm/core';
import type { GivingCause, GivingSignal } from '@rumtelo/contracts';

import { BaseEntity } from '../../../../../../common/database/base.entity';
import { entityConfig } from '../../../../../../common/database/entity-config.util';

/**
 * Giving Organisation catalog — vetted places the Give jar can flow to.
 *
 * Editorial, company-authored list. Every row cites at least one independent
 * evaluator or register (GiveWell, CBF, ANBI, …) in `signals`; Rumtelo never
 * claims its own vetting. Households copy the name into fixed_cost.counterparty
 * or transaction.counterparty — nothing here is household data.
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
export class GivingOrganisation extends BaseEntity {
    // ? PROPERTIES
    /** Stable catalog key (e.g. GIVEDIRECTLY) — never rename in place. */
    @Property({ length: 64 })
    key!: string;

    /** Official short name as donors know it. */
    @Property({ length: 120 })
    name!: string;

    /** One neutral sentence on what they do. */
    @Property({ type: 'text' })
    summary!: string;

    /** ISO 3166-1 alpha-2 of the HQ; null when genuinely distributed. */
    @Property({ length: 2, nullable: true })
    country: string | null = null;

    /** GivingCause keys this organisation serves. */
    @Property({ type: 'json', default: [] })
    causes: GivingCause[] = [];

    /** Where the work lands (e.g. "Sub-Saharan Africa", "Netherlands"). */
    @Property({ length: 64, nullable: true })
    scope: string | null = null;

    @Property({ type: 'text' })
    website!: string;

    /** Independent signals: evaluator, claim, source URL, year confirmed. */
    @Property({ type: 'json', default: [] })
    signals: GivingSignal[] = [];

    /** How donors hear back — annual report, live feed, per-programme updates. */
    @Property({ type: 'text', nullable: true })
    reporting: string | null = null;

    /** Display / seed order within the catalog. */
    @Property({ default: 0 })
    sortOrder = 0;

    /** Soft-disable without deleting historical seed identity. */
    @Property({ default: true })
    isActive = true;
}
