import { Entity, Enum, Property, Unique } from '@mikro-orm/core';
import { Cadence, IncomeKind } from '@rumtelo/contracts';

import { CatalogEntity } from '../../../../../../common/database/catalog.entity';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';

/**
 * Income Source Preset Entity
 *
 * Suggestion catalog for "New income" — many English names share a coarse
 * IncomeKind (the system type / picker group). No jar; income is household-level.
 *
 * @see money.income_source — household-owned instances
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'money',
        tableName: 'income_source_preset',
    })
)
@Unique({ properties: ['key'] })
export class IncomeSourcePreset extends CatalogEntity {
    // ? PROPERTIES
    /** Optional emoji for the income create picker. */
    @Property({ length: 8, nullable: true })
    icon: string | null = null;

    // ? ENUMS
    /** Maps onto money.income_source.kind; also used to group the picker. */
    @Enum(NativeEnum({ IncomeKind, domain: 'money' }))
    kind!: IncomeKind;

    /** Cadence pre-filled when creating the household income source. */
    @Enum(NativeEnum({ Cadence, domain: 'money', defaultValue: Cadence.MONTHLY }))
    cadence: Cadence = Cadence.MONTHLY;
}
