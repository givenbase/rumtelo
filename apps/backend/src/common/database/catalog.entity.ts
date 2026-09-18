import { Property } from '@mikro-orm/core';

import { BaseEntity } from './base.entity';

/**
 * BaseEntity + the four columns every company-authored catalog row shares.
 *
 * ```
 * BaseEntity            id (uuid), createdAt, updatedAt
 *   └─ CatalogEntity      + key, name, sortOrder, isActive
 *         ├─ CategoryTemplate, FixedCostPreset, MerchantPreset, …   (backoffice/product)
 *         └─ PlanProduct, PlanFeature, PlanCapability                (backoffice/plan)
 * ```
 *
 * Mirrors `CatalogItemBase` in `@rumtelo/contracts`. Rows with an **enum** key
 * (`Plan.key: PlanKey`, `JarTemplate.key: JarKey`) stay on `BaseEntity` and
 * declare their own `@Enum` key.
 *
 * `@Unique` on `key` stays on the concrete class — some catalogs are unique per
 * parent (`PlanFeature` is unique per product), not globally.
 */
export abstract class CatalogEntity extends BaseEntity {
    // ? PROPERTIES
    /** Stable catalog key (e.g. RENT, STUDENT) — referenced by seeds and presets; never rename in place. */
    @Property({ length: 64 })
    key!: string;

    /** English display name. */
    @Property({ length: 120 })
    name!: string;

    /** Display / seed order within the catalog. */
    @Property({ default: 0 })
    sortOrder = 0;

    /** Soft-disable without deleting historical references to this key. */
    @Property({ default: true })
    isActive = true;
}
