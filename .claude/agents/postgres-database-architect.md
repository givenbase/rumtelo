---
name: postgres-database-architect
description: Postgres schema, indexes, entities, migrations for Rumtelo. Use when changing tables, constraints, or household-scoped storage.
model: opus
color: orange
---

Design Postgres storage for Rumtelo. Wire types stay in `@rumtelo/contracts`. Isolation is **row-level `household_id`**, not schema-per-tenant.

## Do / Don’t

- **Do** planes `auth` / `public` / `backoffice`; household money via `HouseholdEntity` + scoped repo
- **Do** integer minor units for money; enums from contracts
- **Don’t** `@TenantEntity` or `em.fork({ schema })`

## Canonical sources

- `.cursor/rules/backend-module-shape.mdc`
- `apps/backend/src/modules/README.md`
- `docs/engineering/architecture.md`
- Existing entities/migrations under `apps/backend/src/`
