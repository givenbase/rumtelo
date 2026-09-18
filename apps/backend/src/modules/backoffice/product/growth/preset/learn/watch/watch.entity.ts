import { Entity, Enum, Property, Unique } from '@mikro-orm/core';
import { LearnWatchKind, PlanKey, type SpendingStyle } from '@rumtelo/contracts';

import { CatalogEntity } from '../../../../../../../common/database/catalog.entity';
import { entityConfig } from '../../../../../../../common/database/entity-config.util';
import { NativeEnum } from '../../../../../../../common/database/native-enum.util';

/**
 * Watch Preset Entity
 *
 * Films, YouTube videos, and series Rumtelo points at from Growth → Learn.
 * We store who made it and where to watch the pointer. We do not store the work.
 *
 * @see LearnWatchKind — film, video, or series
 * @see PlanKey — lowest tier that may see this title
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'growth',
        tableName: 'watch_preset',
    })
)
@Unique({ properties: ['key'] })
export class WatchPreset extends CatalogEntity {
    // ? PROPERTIES
    /** One line on the use — why this belongs in Education, not Play. */
    @Property({ type: 'text' })
    description!: string;

    /** Director, host, or the person the household is pointed at. */
    @Property({ length: 120 })
    creator!: string;

    /**
     * Which skill this title belongs to.
     * A key, not an enum, so leadership can grow beside communication and marketing.
     */
    @Property({ length: 64, default: 'MONEY' })
    skill: string = 'MONEY';

    /** Learning section key. Not an enum. */
    @Property({ length: 64 })
    topic!: string;

    /** YouTube id for the poster. Null when the pointer is a page, not a video. */
    @Property({ length: 16, nullable: true })
    youtubeId: string | null = null;

    /** Empty = relevant for every spending style. Otherwise a suggestion, not a lock. */
    @Property({ type: 'json', default: [] })
    spendingStyles: SpendingStyle[] = [];

    /** Where to watch the trailer, the talk, or who to support. We do not host the work. */
    @Property({ length: 280 })
    url!: string;

    /** Where to stream or rent it — a JustWatch title page. Null = url is the only pointer. */
    @Property({ length: 280, nullable: true })
    watchUrl: string | null = null;

    // ? ENUMS
    /** Film, standalone video, or series. */
    @Enum(NativeEnum({ LearnWatchKind, domain: 'growth' }))
    format!: LearnWatchKind;

    /** Lowest plan that should see this title. */
    @Enum(NativeEnum({ PlanKey, domain: 'backoffice' }))
    minPlan!: PlanKey;
}
