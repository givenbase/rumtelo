# Backend (`apps/backend`) — agent guide

Guide for any AI agent working here (Claude Code loads it through `CLAUDE.md` in this folder). It links to the real docs instead of copying them. Human docs: [`README.md`](/apps/backend/README.md).

## 1. What this app is and who uses it

The NestJS API behind the application (:3000) and the website (:3001). It owns better-auth sessions and 2FA, households (better-auth `organization` = household), plan capabilities (Basic / Plus / Max, Practice), row-level household isolation and every business rule for Money, Growth, Energy, Soul and the Coach. Households, their members and practices reach their data only through this API.

## 2. Stack and how to run/check it

NestJS 11 + Fastify, **ESM**, oRPC implementing Zod contracts from `@rumtelo/contracts`, MikroORM 7 (`^7.2`) + PostgreSQL, better-auth, Vitest. Runs with `tsx`. Port **3002**.

**No local database or Docker.** Postgres and the apps run on Railway: `dev` → staging, `main` → production. Pushing migrations to `dev` runs [`db-migrate.yml`](/.github/workflows/db-migrate.yml) (`db:push` + `auth:migrate`) then API smoke. Claude commits; Given pushes.

| Task | Command |
|------|---------|
| Unit tests (Vitest) | `pnpm --filter @rumtelo/backend test` |
| Type check | `pnpm --filter @rumtelo/backend check-types` (all: `pnpm check-types`) |
| Entity style + better-auth migration ownership | `pnpm --filter @rumtelo/backend lint:entities` |
| Lint + format + entities + types (fixes) | `pnpm lint` · read-only: `pnpm lint:check` |
| Contracts types / build | `pnpm --filter @rumtelo/contracts check-types` · `build` |
| Build | `pnpm build:backend` |
| Entity inventory doc | `pnpm --filter @rumtelo/backend docs:entities` |
| Dev server (needs a reachable DB) | `pnpm dev:back` |
| API smoke against a URL | `BACKEND_URL=https://… pnpm api:smoke` |

Migrations are hand-written (see `db-schema-change`). Never run `db:*:stag`, `db:*:prod`, `db:fresh`, `db:drop`, `db:reset`, `schema:*`, `stripe:*`, `sync:github-secrets*` or `env:use*` without Given's explicit permission in this session.

## 3. Map

- `src/modules/` — plane → product → aggregate ([`README`](/apps/backend/src/modules/README.md)): `auth/` (schema `auth`), `public/platform/` + `public/product/{money,growth,energy,soul}` (schema `public`), `backoffice/` (schema `backoffice`).
- `src/common/household/` — `HouseholdScopeInterceptor`, `HouseholdScopedRepository`, `PersonalScopedRepository`, membership, visibility.
- `src/common/database/` — `HouseholdEntity`, `PersonalHouseholdEntity`, `NativeEnum`, entity config; `src/common/capability/` — plan gates.
- `src/common/utils/money.util.ts` — splits with remainder to the largest share.
- `src/banking/` — bank port, null adapter by default ([`banking.md`](/docs/engineering/banking.md)).
- `src/database/migrations/` (+ `.snapshot-railway.json`) and `src/database/seeders/` (catalogs, demo personas).
- `scripts/` — db, lint, docs, stripe.
- Docs: [`docs/ENTITY_STYLE.md`](/apps/backend/docs/ENTITY_STYLE.md), [`docs/ENTITY_INVENTORY.md`](/apps/backend/docs/ENTITY_INVENTORY.md), [`architecture.md`](/docs/engineering/architecture.md), [`household-taxonomy.md`](/docs/engineering/household-taxonomy.md), [`traps.md`](/docs/engineering/traps.md), [`packages/contracts/README.md`](/packages/contracts/README.md).

## 4. Rules that apply here

Always on: [`workflow.md`](/.claude/rules/workflow.md), [`rumtelo-context.md`](/.claude/rules/rumtelo-context.md), [`team-workflow.md`](/.claude/rules/team-workflow.md). Path rules: [`backend.md`](/.claude/rules/backend.md), [`orpc-leaf.md`](/.claude/rules/orpc-leaf.md), [`database.md`](/.claude/rules/database.md). Also [`.cursor/rules/backend-module-shape.mdc`](/.cursor/rules/backend-module-shape.mdc).

- **Contracts first:** wire Zod lives in `@rumtelo/contracts`; controllers are `@Implement` only — no `dto/` folders.
- **CRUD order** Create → Read → Update → Delete in contracts, services and controllers.
- **Household scope:** household rows only via `HouseholdScopedRepository`; never trust a household id from input.
- **Money:** integer minor units; no float or decimal-string arithmetic.
- **Never query another aggregate's tables** — import its service.
- **Four places or none:** module, contract, route, table.
- `persist().flush()`, not `*AndFlush`; no single-letter locals (oxlint `id-length`).

## 5. Recommended agents for this app

The main session orchestrates and is the only one that commits.

| Kind of work | Agents (in order) | Skill |
| --- | --- | --- |
| New procedure, aggregate or endpoint | `product-manager` → `nestjs-backend-engineer` + `postgres-database-architect` → `qa-test-engineer` → `security-reviewer` | `backend-feature` |
| Entity, column, enum, index, rename | `postgres-database-architect` → `security-reviewer` | `db-schema-change` |
| Auth, membership, practice, plan gates, money rules | `nestjs-backend-engineer` → `security-reviewer` (always) → `qa-test-engineer` | `backend-feature` |
| Bug, 500, wrong total | `nestjs-backend-engineer` → `qa-test-engineer` | `fix-bug` |
| Slow procedure, N+1, missing index | `performance-engineer` → `postgres-database-architect` | `db-schema-change` |
| Tests | `qa-test-engineer` | `write-tests` |
| API error messages / email copy | `i18n-translation-specialist` → `brand-copywriter` | `add-translations` |
| Module READMEs, docs | `docs-release-engineer` | `write-docs` |

## 6. Definition of done

```bash
pnpm --filter @rumtelo/contracts check-types
pnpm --filter @rumtelo/backend lint:entities
pnpm --filter @rumtelo/backend test
pnpm check-types
pnpm lint
```

Plus: a spec per business rule with a cross-household sad path, migrations hand-written with snapshot updated and reported **unverified on staging**, QA and security sign-off.

## 7. Known gotchas

- `@orpc/*` is ESM-only; contracts ship dual CJS+ESM and need `dist/` (`db:push` / `db:seed` build contracts first).
- `AsyncLocalStorage` in a guard loses the store — scoping is an interceptor.
- `pnpm db:gen` diffs against the snapshot and proposes drop + create for renames; hand-write renames ([`Migration20261020114239`](/apps/backend/src/database/migrations/Migration20261020114239.ts)).
- better-auth columns belong to `auth:migrate`; `check-ba-migration-ownership` fails Mikro migrations that touch them.
- Deployed backends run `NODE_ENV=production` (staging too), which defers Energy + Soul (`common/config/launch-products.util.ts`).
- Staging DB URLs for CI must be the public Railway TCP URL, never `*.railway.internal`.
- String-enum members are nominal; derive types from the contract.
