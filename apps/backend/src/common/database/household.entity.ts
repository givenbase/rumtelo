import { Index, ManyToOne } from '@mikro-orm/decorators/legacy';

import { AuthHousehold } from '../../modules/auth/household/managed/household/auth-household.entity';

import { BaseEntity } from './base.entity';

/**
 * BaseEntity + household isolation — not a second root.
 *
 * ```
 * BaseEntity            id (uuid), createdAt, updatedAt
 *   └─ HouseholdEntity    + household → AuthHousehold (mapToPk string)
 *         ├─ HouseholdSettings   (1:1 — UNIQUE household)
 *         └─ Jar, Goal, Debt, …  (1:N)
 * ```
 *
 * Do **not** confuse with `AuthHousehold` (Better Auth organization plugin table).
 * That is the household **identity** row. This class is for **application data**
 * that belongs to a household.
 *
 * `household` stays a **string** uuid in app code (`mapToPk`) while MikroORM
 * still knows the FK to `auth.household`.
 *
 * @see common/household — interceptor + HouseholdScopedRepository
 */
@Index({ properties: ['household'] })
export abstract class HouseholdEntity extends BaseEntity {
    /**
     * FK to Better Auth `auth.household.id` (uuid).
     * Mapped as the PK scalar (`mapToPk: true`) so callers get a plain `string`.
     * API/ALS/params still use the name `householdId`; map at the boundary
     * (`householdId: row.household`).
     */
    @ManyToOne(() => AuthHousehold, {
        mapToPk: true,
        fieldName: 'household_id',
        deleteRule: 'cascade',
    })
    household!: string;
}
