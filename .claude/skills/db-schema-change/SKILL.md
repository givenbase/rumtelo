---
name: db-schema-change
description: Design and hand-write a Rumtelo Postgres/MikroORM schema change - entity, constraints, FK delete rules, index plan from real queries, reversible migration plus .snapshot-railway.json update, flagged unverified until it runs on Railway staging. Use for new tables, columns, enums, relations, renames, indexes or slow queries.
argument-hint: "[schema change or query problem]"
---

# Database schema change

Change: $ARGUMENTS

Rule `.claude/rules/database.md` applies. **There is no local database or Docker.** The DB runs on Railway: `dev` → staging, `main` → production. Pushing migrations to `dev` runs [`db-migrate.yml`](/.github/workflows/db-migrate.yml) (`pnpm db:push` + `pnpm auth:migrate`) against staging. Claude commits; Given pushes.

**Agents:** `postgres-database-architect` (design + migration) → `nestjs-backend-engineer` (service wiring) → `security-reviewer` (household scope, money columns) → `performance-engineer` for index or query work.

## Read first

- [`apps/backend/docs/ENTITY_STYLE.md`](/apps/backend/docs/ENTITY_STYLE.md) — field naming (`is*`, `*Day`, `*On`, `*At`, relation nouns)
- [`apps/backend/README.md`](/apps/backend/README.md) — enums (`NativeEnum`), households, isolation
- [`docs/engineering/household-taxonomy.md`](/docs/engineering/household-taxonomy.md) — better-auth columns are owned by `auth:migrate`, never by Mikro migrations
- The **latest** migration in `apps/backend/src/database/migrations/` — copy its style

## 1. Model

- List the facts and access patterns (which service queries, filters, sorts).
- Schema by plane: `auth` (identity), `public` (household/product), `backoffice` (our catalogs).
- Household rows: extend `HouseholdEntity` (`household_id`), reached only via `HouseholdScopedRepository`. Per-member personal rows: `PersonalHouseholdEntity` (`common/database/personal.entity.ts`) + `PersonalScopedRepository` + visibility (`docs/engineering/household-visibility-plan.md`).
- Normalize: prefer a table with a real FK over `jsonb` (see `week_check_allocation`).
- Money columns: integer minor units (`int`/`bigint`), never `numeric` floats.

## 2. Constraints

- Explicit delete rule per FK (ownership → cascade, reference → set null / restrict).
- UNIQUE / CHECK for business rules, not only app-side validation.
- Enums defined once in `packages/contracts/src/enums/`; Postgres type `public.{domain}_{snake}`.

## 3. Index plan

| table | index | query it serves | why |
|-------|-------|-----------------|-----|

Index `household_id` (+ the leading filter) and FK columns used in joins; nothing speculative.

## 4. Migration (hand-written)

- New file `Migration<yyyymmddhhmmss>_<Name>.ts`, class name = `name` = file name, same shape as the latest one.
- Header JSDoc: what changes, why hand-written, and anything `down` refuses to do.
- Renames stay renames (MikroORM proposes drop + create, which loses rows) — rename types, tables, constraints and indexes in place.
- New NOT NULL on populated tables: add nullable → backfill → set NOT NULL.
- `down` reverses `up` and never silently deletes household rows.
- Update `apps/backend/src/database/migrations/.snapshot-railway.json` to match the entities (it is the diff base for the next `db:gen`).
- Never add/drop better-auth columns here (`pnpm --filter @rumtelo/backend lint:entities` runs `check-ba-migration-ownership`).
- Never run `db:*:stag`, `db:*:prod`, `db:fresh`, `db:drop`, `db:reset` or `schema:*` without Given's explicit permission in this session.

## Checklist

- [ ] Entity follows ENTITY_STYLE; `lint:entities` clean
- [ ] Migration mirrors the latest one; `up` and `down` both written
- [ ] Snapshot updated
- [ ] Backfill plan for populated tables
- [ ] Index plan table filled
- [ ] Report marks the migration **unverified — check on staging after Given pushes `dev`**

## Definition of done

```bash
pnpm --filter @rumtelo/backend lint:entities
pnpm --filter @rumtelo/backend check-types
pnpm --filter @rumtelo/backend test
```

Report: entity diff, migration (forward + rollback), snapshot diff summary, index plan, backfill steps, and "unverified on staging".
