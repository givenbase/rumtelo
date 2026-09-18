import { PrimaryKey, Property } from '@mikro-orm/core';
import { v7 as uuidv7 } from 'uuid';

/**
 * Root for every Rumtelo-owned MikroORM row.
 *
 * Use this directly for rows that are **not** scoped to a household
 * (account profile, backoffice catalogs, templates).
 *
 * Household-scoped product rows extend {@link HouseholdEntity} instead —
 * that class adds `household` → AuthHousehold (`mapToPk` string uuid) on top of this base
 * (no duplicated fields). 1:1 settings also use {@link HouseholdEntity} with
 * UNIQUE(`household`).
 *
 * Better Auth tables (`AuthUser`, `AuthHousehold`, …) do **not** extend this —
 * BA mints the same uuidv7 via `advanced.database.generateId` in auth.config.
 */
export abstract class BaseEntity {
    /** uuid v7 — time-ordered keys keep btree inserts local. */
    @PrimaryKey({ type: 'uuid' })
    id: string = uuidv7();

    /** Row insert time (UTC). */
    @Property({ type: 'timestamptz', defaultRaw: 'now()' })
    createdAt: Date = new Date();

    /** Last flush that changed this row (UTC) — set by the ORM, never by hand. */
    @Property({ type: 'timestamptz', defaultRaw: 'now()', onUpdate: () => new Date() })
    updatedAt: Date = new Date();
}
