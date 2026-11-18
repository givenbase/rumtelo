---
paths:
  - "apps/backend/src/**/*.entity.ts"
  - "apps/backend/src/database/**"
  - "apps/backend/src/common/database/**"
  - "apps/backend/mikro-orm.config.ts"
  - "apps/backend/scripts/lint/**"
---

# MikroORM entities & migrations

Full guide + linter: `apps/backend/docs/ENTITY_STYLE.md` (`pnpm --filter @rumtelo/backend lint:entities`). Inventory: `apps/backend/docs/ENTITY_INVENTORY.md`. Ownership and BA mirrors: `docs/engineering/household-taxonomy.md`. MikroORM is **7** (decorators from `@mikro-orm/decorators/legacy`).

## Entities

- File layout: imports → class JSDoc (what it is, who writes, schema) → `@Entity(entityConfig({ schema, domain, ... }))`, `@Unique`, `@Index` → class.
- Base class by row kind (from `common/database/`): `BaseEntity` (account, pivots, enum-keyed catalogs) · `CatalogEntity` (`key/name/sortOrder/isActive` catalogs) · `HouseholdEntity` (household rows, `household` as `mapToPk` string) · `WeekCheckEntity` (portal week checks) · `PersonalHouseholdEntity` (maker + visibility; add `@Check(personalRowCheck('<table>'))`). Never redeclare inherited fields.
- Sections in this order only: `// ? PROPERTIES` → `// ? UI METADATA` → `// ? ENUMS` → `// ? RELATIONSHIPS` (→ rare getters). Short JSDoc on every property and relation.
- Explicit `type` / `Enum` / relation options — never a bare `@Property()` on a `string | null` union.
- `@Index` / `@Unique` are **class-level only**.
- Enums from `@rumtelo/contracts` only: `@Enum(NativeEnum({ DebtKind, domain: 'money', ... }))` — `domain` is where the column lives (PG type `money_debt_kind`). Never a local `export enum`.
- Money: `@Property({ type: MoneyType })` (bigint eurocents → `number`); ratios `decimal` strings; JSON via `Jsonb()` (never `type: 'json'`).
- Names: `is*/has*/can*` booleans · `*At` instant · `*On` date · `*Day` ordinal · `name`/`description` for text (no `label`/`summary`) · no `default*`/`suggested*` on catalog rows · relations are nouns (`household`, `account`, `jar`), never `*Id`.
- References: backoffice → backoffice = real relations; household → backoffice catalog = natural-key FK `@ManyToOne(() => Catalog, CatalogKey('x_key'))` (target needs `@Unique({ properties: ['key'] })`); household → household = relation on `id` with an explicit `deleteRule`. Inverse collections use lazy class refs `() => Entity` (no string names).
- 1:1 household rows: `@Unique({ properties: ['household'] })` + add the class to `HOUSEHOLD_ONE_TO_ONE_ENTITIES` in `scripts/lint/check-entity-style.ts`.
- Prefer a normalised table over `jsonb` when FKs or aggregates matter (`week_check_allocation`).
- Postgres schemas group by ownership: `auth`, `public`, `backoffice`; product areas are folders, not schemas. Never `@TenantEntity` or `em.fork({ schema })`.

## Migrations (no local database)

`pnpm db:gen` needs a database, and agents have none. So:

1. Change the entity and pass `lint:entities` + `check-types`.
2. Hand-write `apps/backend/src/database/migrations/Migration<yyyyMMddHHmmss>[_Name].ts`, modelled on the latest file there: `import { Migration } from '@mikro-orm/migrations'`, class JSDoc explaining *why* (especially hand edits), `override name`, `up()` and `down()` with `this.addSql(...)`. Quote identifiers; name constraints/indexes the way MikroORM does (`<table>_<cols>_index`, `_foreign`, `_unique`, `_pkey`).
3. Rename in place (`alter table … rename`, `alter type … rename`) instead of drop + create so rows survive. Plan a backfill before adding NOT NULL columns.
4. Update `apps/backend/src/database/migrations/.snapshot-railway.json` so it matches the entities — otherwise the next real `db:gen` re-emits the change.
5. Never alter better-auth tables (`auth.user`, `session`, `provider`, `verification`, `two_factor`, `household`, `member`, `invitation`) in a Mikro migration — `check-ba-migration-ownership.ts` fails lint. BA columns come from `auth.config.ts` `additionalFields` + `auth:migrate`.
6. Mark the migration **unverified** in the report. It runs on staging when Given pushes `dev` (`db-migrate.yml` → `db:push` + `auth:migrate` + API smoke); Given checks the result.

Never run `db:*`, `schema:*`, `auth:migrate` or seeders yourself. `schema:update` never runs against a database holding money.
