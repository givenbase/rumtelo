import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/core';

import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { Account } from '../../../../../auth/user/account/account.entity';

/**
 * Learn Book Entity
 *
 * A book this household added from the public catalog. We store the pointer
 * (who wrote it, which edition, where the cover lives). We do not store the book.
 *
 * @see LearnProgress — the person's mark uses `pieceKey` = this id
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'growth', tableName: 'learn_book' }))
@Unique({ properties: ['household', 'sourceKey'] })
export class LearnBook extends HouseholdEntity {
    // ? PROPERTIES
    /** Display name of the work. Not the whole row. */
    @Property({ length: 160 })
    name!: string;

    /** One line so the card matches a recommended book. We do not copy the blurb. */
    @Property({ type: 'text' })
    description!: string;

    /** Who wrote it. */
    @Property({ length: 120 })
    author!: string;

    /** Same key as a recommended book. Not an enum, so the skill list can grow. */
    @Property({ length: 64 })
    skill!: string;

    /** Learning section key. Not an enum. */
    @Property({ length: 64 })
    topic!: string;

    /** Open Library cover id. Null when that catalog has no image. */
    @Property({ type: 'int', nullable: true })
    coverId: number | null = null;

    /** ISBN-13 of the edition the store link buys. Null = catalog page only. */
    @Property({ length: 13, nullable: true })
    isbn13: string | null = null;

    /** ISBN-13, or the catalog key, so the same book is not added twice. */
    @Property({ length: 64 })
    sourceKey!: string;

    /** The public catalog page. We do not host the work. */
    @Property({ length: 280 })
    url!: string;

    // ? RELATIONSHIPS
    /** Who added it. mapToPk keeps `account: string` in app code. */
    @ManyToOne(() => Account, { mapToPk: true, deleteRule: 'cascade' })
    account!: string;
}
