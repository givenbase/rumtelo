import { Entity, Enum, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { LearnWatchKind, PlanKey, type SpendingStyle } from '@rumtelo/contracts';

import { CatalogEntity } from '../../../../../../../common/database/catalog.entity';
import { entityConfig } from '../../../../../../../common/database/entity-config.util';
import { Jsonb } from '../../../../../../../common/database/jsonb.util';
import { NativeEnum } from '../../../../../../../common/database/native-enum.util';
import { MerchantPreset } from '../../../../money/preset/merchant/merchant.entity';

/**
 * Watch Preset Entity
 *
 * Films, videos, series, podcasts, and courses Rumtelo points at from Growth → Learn.
 * We store who made it and where to open the pointer. We do not store the work.
 *
 * @see LearnWatchKind — film, video, series, podcast, or course
 * @see MerchantPreset — optional home (Spotify, Udemy, Netflix, …) when one merchant owns the open
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

    /** Director, host, instructor, or the person the household is pointed at. */
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
    @Property(Jsonb({ emptyArray: true }))
    spendingStyles: SpendingStyle[] = [];

    /** Where to watch the trailer, the talk, the class, or who to support. We do not host the work. */
    @Property({ length: 280 })
    url!: string;

    /** Where to stream or rent it — a JustWatch title page. Null = url is the only pointer. */
    @Property({ length: 280, nullable: true })
    watchUrl: string | null = null;

    // ? ENUMS
    /** Film, standalone video, series, podcast show, or course. */
    @Enum(NativeEnum({ LearnWatchKind, domain: 'growth' }))
    format!: LearnWatchKind;

    /** Lowest plan that should see this title. */
    @Enum(NativeEnum({ PlanKey, domain: 'backoffice' }))
    minPlan!: PlanKey;

    // ? RELATIONSHIPS
    /**
     * Where the household opens this when one merchant is the home
     * (Spotify show, Udemy class, Netflix title). Null when the pointer is multi-home
     * (JustWatch) or the maker's own page.
     */
    @ManyToOne(() => MerchantPreset, { nullable: true, deleteRule: 'set null' })
    merchant: MerchantPreset | null = null;
}
