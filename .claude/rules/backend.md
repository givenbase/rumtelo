---
paths:
  - "apps/backend/**"
---

# Backend (NestJS + Fastify + oRPC + MikroORM)

Sources of truth: `apps/backend/src/modules/README.md` (keep in sync with this file), `apps/backend/README.md` (isolation model), `apps/backend/docs/ENTITY_STYLE.md`. Entities and migrations: `.claude/rules/database.md`. Contract leaves: `.claude/rules/orpc-leaf.md`. Match existing modules — don't invent one-off skinny files or reorder CRUD.

## Folder layout

One aggregate per folder, flat siblings (no `entities/` subfolder):

```
modules/<audience>/<domain>/<aggregate>/
  <aggregate>.entity.ts
  <aggregate>.service.ts
  <aggregate>.controller.ts
  <aggregate>.module.ts
  index.ts            # re-exports module, service, entity, controller
```

Audiences: `auth/` (identity), `public/` (platform + product → Postgres `public`), `backoffice/` (Rumtelo-authored catalogs). A product is a parent module importing its children; Nest discovers entities from `mikro-orm.config.ts` (no registry).

## Who owns the row

| Control | Module |
| --- | --- |
| Household / user writes | `public/product/*`, `public/platform/*`, `auth/user/account`, `auth/household/household-settings` |
| Rumtelo writes | `backoffice/product/{money\|growth}/…` (kinds `template` \| `preset` \| `catalog`), `backoffice/plan` (Basic/Plus/Max), `communication/`; reserved `reference/` |
| better-auth writes | `auth/*/managed/` (read-only mirrors, entity file only) |

## Auth split

- `modules/auth/engine/` — better-auth config only (`auth.config.ts`, `access-control.config.ts`, `auth.migrate.ts`); changes here trigger `db-migrate.yml`.
- `auth/user/managed/`, `auth/household/managed/` — library tables as read-only mirrors.
- `auth/user/account/` — Rumtelo person data (`account`, `account-settings`: theme, locale). better-auth's credential store is `provider`, never `account`.
- `auth/household/` — onboard / invite / members over better-auth's organization API; `household-settings/` holds board prefs.
- Keep id spaces distinct: better-auth `UserId`/`HouseholdId` vs Rumtelo `accountId` vs product row `Id`. No JWT/Passport stacks.

## Household scoping (non-negotiable)

- `HouseholdScopeInterceptor` (`common/household`) resolves the session, picks the household (`x-household-id` → oRPC body → `activeOrganizationId`), verifies membership and stores `{ userId, householdId, role }` in AsyncLocalStorage. It is an **interceptor**, not a guard or middleware (the ALS store is gone before handlers otherwise).
- Household rows: `HouseholdEntity` + `HouseholdScopedRepository` — the single choke point; never `em.find` on them directly. Person-attributed rows: `PersonalHouseholdEntity` + `PersonalScopedRepository` with their `VisibilityArea`; never hand-roll `account = me` filters.
- Roles: `RolePermissionInterceptor` + the contracts role matrix. Plan gates: `common/capability` (`RequireCapability`, `plan-access.service.ts`) with `CAPABILITIES.*`. Launch deferral: `common/config/launch-products.util.ts`.
- Practice access goes through an `ACTIVE` `PracticeClientLink` only.

## CRUD order — always Create → Read → Update → Delete

Apply in contract, service and controller with these banners (only sections that have methods, never out of order):

```ts
// ====================================================================
// ? CREATE Operations
// ====================================================================
```

| Letter | Examples |
| --- | --- |
| C | `create`, `add`, `onboard`, `invite`, `importCsv`, `createCategory`, `upsert*` |
| R | `list`, `get`, `findOne`, `settings`, `current`, `summary`, `balances`, `inbox`, `history`, `feed`, `forWeek`, `byJar` |
| U | `update`, `updateSplit`, `sort`, `dismiss`, `close`, `applySplit`, `replay`, `advance` |
| D | `delete`, `remove` |

Never `list` before `create`; never create-like ops after update/delete. Private helpers after all public sections.

## Controllers (transport only)

```ts
/** Transport only. Handler order is always CRUD. */
@ControllerSwagger('money/week-check', 'public')
export class WeekCheckController {
    constructor(@Inject(WeekCheckService) private readonly weekChecks: WeekCheckService) {}

    /** Return (or lazily create) the week check for a given week. */
    @Implement(contract.money.weekCheck.current)
    current() {
        return implement(contract.money.weekCheck.current).handler(({ input }) =>
            this.weekChecks.current(input.week ?? currentWeek())
        );
    }
}
```

Class JSDoc + one JSDoc per handler; no business `if`s (a money `if` in a controller is in the wrong place).

## Services

- All rules live here; constructor injection with `@Inject(...)`.
- Map entities to contract types explicitly (`toDto` / object literal) — never return raw entities, no `as` casts to contract types.
- Never query another aggregate's tables — import its service (`money/dashboard` composes services).
- Persist with `await em.persist(entity).flush()` / `await em.remove(entity).flush()` — never `persistAndFlush`.
- User-facing errors: `apiBadRequest(key)` etc. from `common/errors/api-user-error.ts`; the key is an i18n `common.message.error.api` leaf.
- Money: integer minor units; splits via `common/utils/money.util.ts`.

## Helpers

- One helper, one owner → `<name>.util.ts` beside its user. Two or more in a module → `<module>/utils/` + `index.ts`. Shared → `common/utils/`; never import another module's `utils/`.
- Suffix `.util.ts` (singular), `.constants.ts` for constants; `utils/` holds pure functions only.

## Imports & tests

- Extensionless relative imports (`moduleResolution: Bundler`). Backend is ESM (`@orpc/*` is ESM-only).
- Vitest `*.spec.ts` next to the code: `pnpm --filter @rumtelo/backend test -- <file>`.
