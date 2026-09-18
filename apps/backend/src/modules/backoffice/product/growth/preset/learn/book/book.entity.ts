import { Entity, Enum, Property, Unique } from '@mikro-orm/core';
import { PlanKey, type SpendingStyle } from '@rumtelo/contracts';

import { CatalogEntity } from '../../../../../../../common/database/catalog.entity';
import { NativeEnum } from '../../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../../common/database/entity-config.util';

/**
 * Book Preset Entity
 *
 * Rumtelo-owned recommendations for Growth → Learn. We store who wrote it,
 * which habit it serves, and where to get it. We do not store the book.
 *
 * @see PlanKey — lowest tier that may see this title
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'growth',
        tableName: 'book_preset',
    })
)
@Unique({ properties: ['key'] })
export class BookPreset extends CatalogEntity {
    // ? PROPERTIES
    /** One line on the use — why this book belongs in Education, not Play. */
    @Property({ type: 'text' })
    description!: string;

    /** Author or foundation the household is pointed at. */
    @Property({ length: 120 })
    author!: string;

    /**
     * Which skill this title belongs to.
     * A key, not an enum, so leadership, communication, and marketing can grow beside money.
     */
    @Property({ length: 64, default: 'MONEY' })
    skill: string = 'MONEY';

    /**
     * Learning section key. Not an enum — Saving, Relationships, and the next
     * one are catalog keys, the same way a category key is.
     */
    @Property({ length: 64 })
    topic!: string;

    /** Open Library cover id. Null when that catalog has no image. */
    @Property({ type: 'int', nullable: true })
    coverId: number | null = null;

    /** ISBN-13 of the edition we point the store link at. Null = author link only. */
    @Property({ length: 13, nullable: true })
    isbn13: string | null = null;

    /** Empty = relevant for every spending style. Otherwise a suggestion, not a lock. */
    @Property({ type: 'json', default: [] })
    spendingStyles: SpendingStyle[] = [];

    /** Where to get the book or who to support. We do not host the work. */
    @Property({ length: 280 })
    url!: string;

    // ? ENUMS
    /** Lowest plan that should see this title. */
    @Enum(NativeEnum({ PlanKey, domain: 'backoffice' }))
    minPlan!: PlanKey;
}
