# Entity File Style Guide

Authoritative conventions for MikroORM entity files under `apps/backend/src/`.

Reference implementations:

- `modules/auth/user/account/account.entity.ts`
- `modules/auth/user/account/account-settings/account-settings.entity.ts`
- `modules/auth/household/household-settings/household-settings.entity.ts`

Better Auth mirrors under `modules/auth/*/managed/` are library-owned and excluded from this check.

## File layout

```text
1. Imports        → common/database → mikro-orm → @rumtelo/contracts → local entities
2. Class JSDoc    → name, purpose, @see MikroORM link
3. Decorators     → @Entity(entityConfig(...)), @Unique, @Index
4. export class   → grouped sections (below)
```

`@Index` and `@Unique` are **class-level only** — never decorate individual fields. Prefer `@Index({ properties: ['field'] })` / `@Unique({ properties: ['field'] })` above `export class`.

`entityConfig()` must set `schema`, `domain`, and optionally `tableName`. See `common/database/entity-config.util.ts`.

Enums come from `@rumtelo/contracts` + `NativeEnum({ … })` — never `export enum` inside an entity file.

**Postgres type prefix (mandatory):** every `@Enum` uses `NativeEnum({ EnumName, domain: '…' })`.
`domain` is the product/plane of the **column** (where the row lives), not the TS file name:

| Domain | Example PG type |
|--------|-----------------|
| `money` | `money_debt_kind`, `money_cadence`, `money_spending_style`, `money_month_score_event_kind` |
| `platform` | `platform_household_kind`, `platform_currency` |
| `auth` | `auth_locale`, `auth_theme` |
| `backoffice` | `backoffice_plan_key` |
| `energy` / `growth` / `soul` | `energy_metric`, … |

`SpendingStyle` is a money-domain enum even though the column lives on `auth.account_settings` — use `domain: 'money'` → `money_spending_style`.

Shared TS enums (`Cadence` in `enums/common.ts`) still take the domain of the table that stores them (`domain: 'money'` on income/fixed-cost). Do not invent a second PG type by using another domain for the same concept.

## Inheritance (mandatory)

Every domain entity must extend one of:

| Base | Use when |
|------|----------|
| `BaseEntity` | Root — uuid `id` + timestamps. Account, join tables, catalogs whose `key` is an **enum** (`Plan`, `JarTemplate`) |
| `CatalogEntity` | **Extends** `BaseEntity` + `key`, `name`, `sortOrder`, `isActive`. Every company-authored catalog / preset / template with a free-text key (`CategoryTemplate`, `MerchantPreset`, `PlanFeature`, `WealthStage`, …). Mirrors `CatalogItemBase` in contracts |
| `HouseholdEntity` | **Extends** `BaseEntity` and adds `household` → `AuthHousehold` via `@ManyToOne({ mapToPk: true })` (money / product / household settings) |
| `WeekCheckEntity` | **Extends** `HouseholdEntity` + `week`, `completedAt`. The four portal week checks (`MoneyWeekCheck`, `GrowthWeekCheck`, `EnergyWeekCheck`, `SoulWeekCheck`) |

```text
BaseEntity ─┬─ CatalogEntity
            └─ HouseholdEntity ── WeekCheckEntity
```

**1:1 vs 1:N:** both use `HouseholdEntity`. Enforce one row per household with `@Unique({ properties: ['household'] })` (e.g. `HouseholdSettings`). Product rows (jars, goals) stay many-per-household without that unique.

`household` stays a **string** uuid in app code (`mapToPk`); MikroORM still owns the FK to `auth.household`. Do not redeclare it as a plain `@Property` or a full entity relation on subclasses.

Files: `common/database/base.entity.ts`, `catalog.entity.ts`, `household.entity.ts`, `week-check.entity.ts`.
Do **not** redeclare `id`, `createdAt`, `updatedAt`, `household`, or the `CatalogEntity` / `WeekCheckEntity` columns on subclasses. `@Unique` on `key` (or `['household', 'week']`) stays on the concrete class.

Not the same as `AuthHousehold` (Better Auth organization plugin table) — that mirror does **not** extend `BaseEntity`.

## Section order (mandatory)

Inside every entity class, fields are grouped in this order:

| Order | Marker | Contents |
|------:|--------|----------|
| 1 | `// ? PROPERTIES` | All `@Property` scalar / JSON fields |
| 2 | `// ? UI METADATA` | Optional display flags (`color`, `icon`, `sortOrder`, `isFeatured`) |
| 3 | `// ? ENUMS` | All `@Enum` fields — omit section when none |
| 4 | `// ? RELATIONSHIPS` | `@ManyToOne`, `@OneToMany`, `@ManyToMany`, `@OneToOne` |
| 5 | `// ? VIRTUAL PROPERTIES (GETTERS)` | Rare — getters only, always last |

**Industry standard:** scalars and enums before associations. Relationships are navigation concerns and belong last.

Junction / pivot entities contain only `// ? RELATIONSHIPS` when they have no scalar fields.

## Field naming by kind (mandatory)

Names should make the **shape** obvious without reading the decorator or the column type.

| Kind | Pattern | Examples | Avoid |
|------|---------|----------|-------|
| **Boolean** | `is*` / `has*` / `can*` (affirmative) | `isActive`, `isSpendable`, `hasMfa` | `active`, `disabled`, `isNotActive` |
| **Enum** | noun for kind/status (never a yes/no) | `kind`, `status`, `payoffStrategy` | booleans pretending to be enums |
| **Instant** | `*At` → `timestamptz` | `createdAt`, `closedAt`, `publishedAt` | `closed`, `timestamp`, `closedDate` for an instant |
| **Calendar date** | `*On` → Postgres `date` | `startedOn`, `endsOn`, `publishedOn` | `*At` for date-only; `*Day` for a full date |
| **Day ordinal** | `*Day` → `int` / `smallint` (1–31 or weekday 1–7) | `dueDay`, `expectedDay`, `periodStartDay`, `weekCheckReminderDay` | `dueDate` / `expectedDate` when the value is **not** a full date |
| **FK / id** | `*Id` for plain scalar FKs; relation noun for `@ManyToOne`/`@OneToOne` (`mapToPk`) | `jarId` (plain scalar); `household`, `account` (mapToPk relations) | bare `householdId`/`accountId` on entity fields — use `household`/`account` and map at API boundary |
| **Money / count** | plain noun; column type `MoneyType` (bigint eurocents → `number`) | `amount`, `balance`, `target`, `priceMonthly` | `amountCents`, `type: 'bigint'` (hydrates as `BigInt`), `decimal` for money |
| **Ratio** | plain noun; `decimal` string | `percentage`, `interestRate` | storing percentages as money |
| **Display text** | `name` (short) / `description` (one paragraph) | `name`, `description` | `label`, `title`, `summary`, `groupLabel` — pick `name` / `description` and stay consistent |
| **Catalog default** | plain noun on the catalog row — the catalog *is* the default | `cadence`, `percentage`, `dueDay`, `amount` | `defaultCadence`, `suggestedDueDay`, `defaultPercentage` — the prefix only says "this is a preset", which the class name already does |
| **JSON array** | plural noun | `aliases`, `unlocks`, `causes`, `spendingStyles` | `aliasList`, `unlockJson`, `for*` / `*Keys` when it should be a relation |
| **JSON object** | bag noun (`metadata`, `settings`, `guide`, `tour`, `*Snapshot`) | `metadata`, `guide`, `checkoutSnapshot` | vague `data`, `info`, `json`; storage suffixes (`guidePayload`, `tourSnapshot` for a live object) |
| **Nested settings bag** | noun of the sub-area (parent name gives context) | `HouseholdSettings.money`, `.weekCheck`, `.features` | `moneySettings`, `weekCheckSettings` inside `HouseholdSettings` (stutter) |
| **M2M / collection** | plural **relation** (table), not a json id list | `audiences`, `markets`, `postures`, `merchantLinks` | `audienceKeys: string[]` stored as jsonb and filtered in JS |
| **1:1 / N:1** | singular relation | `account`, `user`, `jar`, `categoryTemplate` | `categoryTemplateKey` string column pointing at a row in the same schema |

### Temporal — do not confuse Day / On / At / Date

This is the #1 naming footgun in money apps:

| Name | Stores | Type | Example meaning |
|------|--------|------|-----------------|
| `dueDay` | **Day of month** | `int` 1–28/31 | “Rent is due on the **25th** every month” |
| `expectedDay` | **Day of month** | `int` | “Salary lands on the **1st**” |
| `weekCheckReminderDay` | **Weekday** | `int` 1–7 | “Week check on **Sunday**” |
| `startedOn` / `endsOn` | **Calendar date** | `date` | “Contract ends on **2026-12-31**” |
| `closedAt` | **Instant** | `timestamptz` | “Month score closed at **14:03:22Z**” |

**Do not** rename `dueDay` → `dueDate` or `expectedDay` → `expectedDate`. Those values are not dates; they are ordinals that repeat every period. Calling them `*Date` lies about the type and breaks sorting/validation assumptions.

Rumtelo calendar-date suffix is **`*On`** (Rails-style). Prefer `startedOn` / `endsOn` over `startDate` / `endDate` so `*Day` and `*Date` never collide in reviews. Use `*At` only for true instants.

### JSON — when and how to name it

1. **Prefer a normalised child table** when you filter, join, sum, or cascade on elements (see `week-check-allocation` — allocations are rows, not jsonb on the week-check).
2. **Use jsonb** for opaque bags, small string lists, or snapshots that are always read/written as a whole.
3. **Name the bag by contents**, not by storage:
   - Arrays → plural (`aliases`, `unlocks`)
   - Objects → `metadata` / `settings` / `*Snapshot` / `*Payload` / `*Json` when the noun alone is ambiguous
4. Never store a relation as `uuid[]` / id-list jsonb if you will query membership — that is an M2M table.

### References — FK or key snapshot?

| From → to | Store | Why |
|-----------|-------|-----|
| **backoffice → backoffice** (preset → template, lever → posture, plan → capability) | real `@ManyToOne` / `@ManyToMany` / pivot entity on `id` | same owner, same lifecycle; the DB enforces integrity and services filter in SQL |
| **household → backoffice** (`Jar.templateKey`, `Goal.givingOrganisationKey`, `Transaction.inflowKey`) | **key snapshot** string | catalogs are mutable and can be retired; household history must never break or cascade |
| **household → household** (`Transaction.jar`, `WeekCheckAllocation.weekCheck`) | real relation with `deleteRule` | same tenant, cascade / restrict is a product decision to state explicitly |

Pivot entities with their own data (`FixedCostPresetMerchant.sortOrder`) are explicit classes extending `BaseEntity`; plain M2M without payload uses `@ManyToMany({ pivotTable })`. Inverse-side collections use `import type` + the string entity name (`@OneToMany('PlanFeature', 'product')`) so entity files never import each other in a cycle.

### Booleans & enums

Booleans are yes/no questions. Prefer `isActive` over `active`. Prefer positive forms — negate in code (`!isActive`), do not store `isInactive`.

When a “flag” needs more than two values later, use an **enum** (`status`) instead of stacking booleans.

## Normalization notes (keep the model clear)

| Situation | Prefer |
|-----------|--------|
| Household-owned money rows | `HouseholdEntity` + `household` relation (`mapToPk` string — row-level isolation) |
| Person attribution on household rows | `account` relation (`@ManyToOne` + `mapToPk`) → `auth.account` — **not** Better Auth `userId`; DTO maps as `accountId: row.account` |
| Catalog we publish | `backoffice.*` extends `CatalogEntity` — households **copy**, do not FK live money to mutable catalog rows except stable template keys |
| Money columns | `@Property({ type: MoneyType })` — integer eurocents, hydrated as `number`; never `Number(row.amount)` in services |
| Repeating child lines you query | Child entity + FK (`WeekCheckAllocation`) |
| Opaque config / match needles | jsonb with a clear plural / bag name |
| Soft delete / disable | `isActive` / `isArchived` — do not invent parallel “status enums” for on/off |

## Property order within `// ? PROPERTIES`

`id`, `createdAt`, and `updatedAt` live on `BaseEntity` — do not redefine them. `household` lives on `HouseholdEntity`.

Order domain fields as follows:

| Priority | Field types | Examples |
|---------:|-------------|----------|
| 0 | Primary key (when declared on entity) | `id` (`@PrimaryKey`) |
| 1 | **Identifier cluster** | `key`, `household`, `account`, `code` |
| 2 | Names & titles | `name`, `title` |
| 3 | URL slugs / dates | `slug`, `date` |
| 4 | Descriptions | `description`, `why`, `notes` |
| 5 | Rich content | `body`, `content` |
| 6 | Classification & contact | `role`, `type`, `email`, `iban` |
| 7 | Numeric / monetary values | `amount`, `balance`, `percentage`, `rate` |
| 8 | Config JSON | `metadata`, `aliases`, `unlocks`, `audienceTags` |
| 9 | Link / media URLs | `url`, `imageUrl` |
| 10 | Boolean flags | `isActive`, `isArchived`, `isCoachEnabled` |
| 11 | Day ordinals | `dueDay`, `expectedDay`, `periodStartDay` |
| 12 | Domain dates & instants | `startedOn`, `endsOn`, `expiresAt`, `closedAt` |

**Identifier cluster rule:** IDs belong together immediately after the primary key — never separated by descriptive fields.

Within `// ? UI METADATA`, order: `color` / `accentColor` / `softColor` → `icon` / `badgeLabel` → `logoDomain` → `website` → `highlight` → `isFeatured` → `sortOrder`. Only those names are allowed there (`UI_METADATA_PRIORITY`); `isActive` is a lifecycle flag and belongs in PROPERTIES.

## Enum order within `// ? ENUMS`

1. Primary type / category enum  
2. Status / lifecycle enum  
3. Secondary classification enums  

All `@Enum` decorators must be in this section — never mixed into `PROPERTIES`.

## Relationship order within `// ? RELATIONSHIPS`

1. Required owner-side `@ManyToOne` / `@OneToOne` (parent / aggregate root)  
2. Optional `@ManyToOne` / `@OneToOne`  
3. Inverse `@OneToMany` / `@ManyToMany` collections  

Document each relationship with JSDoc covering: role, cardinality, owner side, ORM cascade, database `deleteRule`.

## JSDoc

- **Class:** 2–4 sentences + `@see https://mikro-orm.io/docs/defining-entities`
- **Every field:** short description; add cascade/delete notes on relationships

## Excluded files

Abstract bases are not domain entities:

- `common/database/base.entity.ts`
- `common/database/catalog.entity.ts`
- `common/database/household.entity.ts`
- `common/database/week-check.entity.ts`

## Automated check

Run before commit (also runs as part of `pnpm --filter @rumtelo/backend lint`):

```bash
pnpm --filter @rumtelo/backend lint:entities
```

The script `scripts/lint/check-entity-style.ts` enforces:

- `extends BaseEntity` / `CatalogEntity` / `HouseholdEntity` / `WeekCheckEntity` (+ import from `common/database/*`)
- no redeclared inherited fields (`id` / `createdAt` / `updatedAt` / `household` / `key` / `name` / `sortOrder` / `isActive` / `week` / `completedAt`)
- **1:1 household rows** listed in `HOUSEHOLD_ONE_TO_ONE_ENTITIES` must have `@Unique({ properties: ['household'] })`
- `@ManyToOne` / `@OneToOne` fields are relation nouns — never `*Id` (API DTOs still map `householdId: row.household`)
- boolean `@Property` names use `is*` / `has*` / `can*` (e.g. `isActive`, not `active`)
- temporal suffix matches column kind (`*Day` = int ordinal, `*On` = date, `*At` = timestamptz)
- jsonb `@Property` names are plural arrays or clear bag nouns (`metadata`, `*Json`, `*Payload`, …)
- section markers, section order, field order (via `scripts/lint/entity-field-priority.ts`)
- `@Enum` / relationship decorators in the correct sections

Domain-specific field sequences are declared in `SAME_PRIORITY_ORDER` inside `scripts/lint/entity-field-priority.ts`.

When adding a new **1:1** household-owned entity, add its class name to `HOUSEHOLD_ONE_TO_ONE_ENTITIES` in `check-entity-style.ts` and put `@Unique({ properties: ['household'] })` on the class.

## Checklist for new / updated entities

- [ ] `extends BaseEntity` / `CatalogEntity` / `HouseholdEntity` / `WeekCheckEntity` (imported from `common/database`)
- [ ] Money columns use `MoneyType`; ratios stay `decimal`
- [ ] Catalog defaults have no `default*` / `suggested*` prefix; text is `name` / `description`
- [ ] backoffice → backoffice references are relations (id FKs / pivots), household → backoffice stays a `*Key` snapshot
- [ ] If 1:1 household-owned: `@Unique({ properties: ['household'] })` + listed in `HOUSEHOLD_ONE_TO_ONE_ENTITIES`
- [ ] Relation fields are nouns (`household`, `account`, `jar`) — never `householdId` / `accountId` on `@ManyToOne` / `@OneToOne`
- [ ] Booleans named `is*` / `has*` / `can*` (affirmative)
- [ ] Temporal suffixes match types (`*Day` int, `*On` date, `*At` timestamptz) — never `dueDate` for day-of-month
- [ ] jsonb fields are plural arrays or clear bags (`metadata` / `*Json` / `*Payload`)
- [ ] Class JSDoc with `@see` link
- [ ] `entityConfig({ schema, domain, tableName })` correct
- [ ] Sections in order: PROPERTIES → [UI METADATA] → ENUMS → RELATIONSHIPS
- [ ] Properties ordered: key → name/title → slug → content → flags → dates
- [ ] Every `@Property` and relationship has JSDoc
- [ ] No `@Enum` outside `// ? ENUMS`
- [ ] No relationships outside `// ? RELATIONSHIPS`
- [ ] Enums imported from `@rumtelo/contracts` + `NativeEnum({ EnumName, domain: '…' })` (explicit domain → PG prefix)
- [ ] No redeclared `id` / `createdAt` / `updatedAt` / `household`
