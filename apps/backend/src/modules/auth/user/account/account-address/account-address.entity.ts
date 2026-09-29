import { Entity, Enum, ManyToOne, Unique } from '@mikro-orm/decorators/legacy';
import { AccountAddressKind } from '@rumtelo/contracts';

import { BaseEntity } from '../../../../../common/database/base.entity';
import { entityConfig } from '../../../../../common/database/entity-config.util';
import { NativeEnum } from '../../../../../common/database/native-enum.util';
import { Address } from '../../../../public/platform/address/address.entity';
import { Account } from '../account.entity';

/**
 * Account Address Entity
 *
 * Links an {@link Account} to a {@link Address} by purpose kind.
 * UNIQUE(account, kind) — at most one billing / home / mailing address.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'auth', domain: 'account', tableName: 'address' }))
@Unique({ properties: ['account', 'kind'] })
export class AccountAddress extends BaseEntity {
    // ? ENUMS
    /** Purpose of this address for the account. */
    @Enum(
        NativeEnum({ AccountAddressKind, domain: 'auth', defaultValue: AccountAddressKind.BILLING })
    )
    kind: AccountAddressKind = AccountAddressKind.BILLING;

    // ? RELATIONSHIPS
    /** Owning account (`auth.account`). */
    @ManyToOne(() => Account, { mapToPk: true, deleteRule: 'cascade' })
    account!: string;

    /** Street values (`public.platform_address`). */
    @ManyToOne(() => Address, { mapToPk: true, deleteRule: 'restrict' })
    address!: string;
}
