import { Collection, Entity, Enum, OneToMany, Property, Unique } from '@mikro-orm/core';
import { JarKey, type JarCapabilities } from '@rumtelo/contracts';

import type { Category } from './category.entity';

import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';

/**
 * Jar Entity
 *
 * Household-owned jar instance — one of the six jars every household gets at
 * onboarding. Display defaults + capabilities are copied from the backoffice
 * `JarTemplate`; the household may rename / re-split afterwards.
 *
 * @see JarTemplate
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'jar' }))
@Unique({ properties: ['household', 'key'] })
export class Jar extends HouseholdEntity {
    // ? PROPERTIES
    /** Household-facing name (defaults to the template name). */
    @Property({ length: 80 })
    name!: string;

    /** One-line purpose shown under the name. */
    @Property({ length: 160, nullable: true })
    subtitle: string | null = null;

    /** Emoji / short icon token. */
    @Property({ length: 8, nullable: true })
    icon: string | null = null;

    /** Share of net income routed here on arrival. Jars must sum to 100 per household. */
    @Property({ type: 'decimal', precision: 5, scale: 2 })
    percentage!: string;

    /** Display order on the board. */
    @Property({ default: 0 })
    sortOrder = 0;

    /**
     * Behaviour flags (spend / save / invest / safe-to-spend).
     * Copied from the template at onboard — do not infer from key in services.
     */
    @Property({ type: 'json' })
    capabilities!: JarCapabilities;

    // ? ENUMS
    /** Which of the six jars this is; unique per household. */
    @Enum(NativeEnum({ JarKey, domain: 'money' }))
    key!: JarKey;

    // ? RELATIONSHIPS
    /** Spending lines inside this jar (1:N, inverse side). */
    @OneToMany('Category', 'jar')
    categories = new Collection<Category>(this);
}
