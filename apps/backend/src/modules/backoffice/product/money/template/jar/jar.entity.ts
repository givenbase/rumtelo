import { Entity, Enum, Property, Unique } from '@mikro-orm/core';
import { JarKey, type JarCapabilities, type JarGuide } from '@rumtelo/contracts';

import { BaseEntity } from '../../../../../../common/database/base.entity';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';

/**
 * Jar Template Entity
 *
 * Rumtelo-owned catalog for the six jars (name, subtitle, icon, default %, capabilities).
 * We write these rows; households only copy them into money.jar on onboard.
 *
 * Stays on BaseEntity (not CatalogEntity) because its key is the `JarKey` enum.
 *
 * @see money.jar — household-owned instances
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({
        schema: 'backoffice',
        domain: 'reference',
        group: 'money',
        tableName: 'jar_template',
    })
)
@Unique({ properties: ['key'] })
export class JarTemplate extends BaseEntity {
    // ? PROPERTIES
    /** Display name shown at onboard (household may rename their copy later). */
    @Property({ length: 80 })
    name!: string;

    /** One-line purpose shown under the name. */
    @Property({ length: 160, nullable: true })
    subtitle: string | null = null;

    /** Emoji / short icon token. */
    @Property({ length: 8, nullable: true })
    icon: string | null = null;

    /** Default share of net income (0–100). All active templates should sum to 100. */
    @Property({ type: 'decimal', precision: 5, scale: 2 })
    percentage!: string;

    /** Display / seed order within the catalog. */
    @Property({ default: 0 })
    sortOrder = 0;

    /** Coach helper copy — what belongs in this jar. */
    @Property({ type: 'json', nullable: true })
    guide: JarGuide | null = null;

    /**
     * What jars of this key may do (spend / save / invest / safe-to-spend).
     * Mirror of contracts JAR_CAPABILITIES[key]; copied onto household jars.
     */
    @Property({ type: 'json' })
    capabilities!: JarCapabilities;

    /** Soft-disable without deleting historical household jars that used this key. */
    @Property({ default: true })
    isActive = true;

    // ? ENUMS
    /** Stable key — copied onto household jars; never renamed in place. */
    @Enum(NativeEnum({ JarKey, domain: 'money' }))
    key!: JarKey;
}
