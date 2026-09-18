import { Collection, Entity, Enum, OneToMany, Property, Unique } from '@mikro-orm/core';
import { DebtKind } from '@rumtelo/contracts';

import { CatalogEntity } from '../../../../../../common/database/catalog.entity';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import type { DebtPresetMerchant } from './debt-merchant.entity';

/**
 * Debt Preset Entity
 *
 * Suggestion catalog for "New debt" — name + DebtKind defaults.
 * Households copy into money.debt; no jar (debts are household-level).
 *
 * @see DebtPresetMerchant — ordered "Who do you owe?" chips
 * @see money.debt — household-owned instances
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'money',
        tableName: 'debt_preset',
    })
)
@Unique({ properties: ['key'] })
export class DebtPreset extends CatalogEntity {
    // ? PROPERTIES
    /** Optional emoji for the debt create picker. */
    @Property({ length: 8, nullable: true })
    icon: string | null = null;

    // ? ENUMS
    /** Maps onto money.debt.kind when the preset is selected. */
    @Enum(NativeEnum({ DebtKind, domain: 'money' }))
    kind!: DebtKind;

    // ? RELATIONSHIPS
    /** Ordered "Who do you owe?" merchant chips (1:N to the pivot; empty = free text only). */
    @OneToMany<DebtPresetMerchant, DebtPreset>({
        entity: 'DebtPresetMerchant',
        mappedBy: 'preset',
        orderBy: { sortOrder: 'ASC' },
        orphanRemoval: true,
    })
    merchantLinks = new Collection<DebtPresetMerchant>(this);
}
