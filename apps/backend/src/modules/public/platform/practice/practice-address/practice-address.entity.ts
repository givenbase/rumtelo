import { Entity, Enum, ManyToOne, Unique } from '@mikro-orm/core';
import { PracticeAddressKind } from '@rumtelo/contracts';

import { BaseEntity } from '../../../../../common/database/base.entity';
import { entityConfig } from '../../../../../common/database/entity-config.util';
import { NativeEnum } from '../../../../../common/database/native-enum.util';
import { Address } from '../../address/address.entity';
import { Practice } from '../practice/practice.entity';

/**
 * Practice Address Entity
 *
 * Links a {@link Practice} to a {@link Address} by purpose kind.
 * UNIQUE(practice, kind) — at most one billing / registered address.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'platform', tableName: 'practice_address' }))
@Unique({ properties: ['practice', 'kind'] })
export class PracticeAddress extends BaseEntity {
    // ? ENUMS
    /** Purpose of this address for the practice. */
    @Enum(
        NativeEnum({
            PracticeAddressKind,
            domain: 'platform',
            defaultValue: PracticeAddressKind.BILLING,
        })
    )
    kind: PracticeAddressKind = PracticeAddressKind.BILLING;

    // ? RELATIONSHIPS
    /** Owning practice. */
    @ManyToOne(() => Practice, { mapToPk: true, deleteRule: 'cascade' })
    practice!: string;

    /** Street values (`public.platform_address`). */
    @ManyToOne(() => Address, { mapToPk: true, deleteRule: 'restrict' })
    address!: string;
}
