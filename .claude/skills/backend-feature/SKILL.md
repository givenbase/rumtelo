---
name: backend-feature
description: Add or change a Rumtelo API aggregate contracts-first - Zod schema + oRPC procedures in @rumtelo/contracts, MikroORM entity + hand-written migration, household-scoped Nest service/controller/module, then the typed client in the app. Use when adding an endpoint, procedure, resource or aggregate (money, growth, energy, soul, platform, backoffice).
argument-hint: "[feature / aggregate description]"
---

# Backend feature (contract → entity → service → controller → client)

Feature: $ARGUMENTS

Rules `.claude/rules/backend.md`, `orpc-leaf.md` and `database.md` apply. Pick a recent, complete sibling aggregate in the same plane and mirror it (money: `apps/backend/src/modules/public/product/money/` — `rule`, `jar`, `goal`; growth: `growth/course/`).

**Agents:** `product-manager` (scope, acceptance) → `nestjs-backend-engineer` (contract + service + controller) with `postgres-database-architect` (entity + migration) → `nextjs-frontend-engineer` (client, if UI ships) → `qa-test-engineer` → `security-reviewer` (always for money, membership, household scope).

## Read first

- [`packages/contracts/README.md`](/packages/contracts/README.md)
- [`apps/backend/src/modules/README.md`](/apps/backend/src/modules/README.md) — planes, who owns the row, CRUD shape
- [`.cursor/rules/backend-module-shape.mdc`](/.cursor/rules/backend-module-shape.mdc)
- [`apps/backend/docs/ENTITY_STYLE.md`](/apps/backend/docs/ENTITY_STYLE.md) and [`apps/backend/README.md`](/apps/backend/README.md) (naming, `persist().flush()`, enums)
- [`docs/engineering/architecture.md`](/docs/engineering/architecture.md) — one hierarchy, four layers

## 1. Locate

- Plane: household/user writes → `public/product/*` or `public/platform/*`; Rumtelo writes → `backoffice/*`; better-auth writes → `auth/*/managed/` (never ours).
- **Four places or none:** module, contract (`contract.<product>.<aggregate>`), route, table must line up.
- Child of an existing aggregate? Nest it in the parent folder; never query another aggregate's tables — import its service.

## 2. Contract leaf (`packages/contracts/src/<plane>/.../<aggregate>/`)

- `<aggregate>.schema.ts` — Zod + `export type X = z.infer<typeof X>` in the same file.
- `<aggregate>.contract.ts` — `oc` procedures with section banners **Create → Read → Update → Delete** (never `list` before `create`; create-like ops such as `onboard`, `invite`, `importCsv` go in Create).
- `index.ts` barrel; compose into the domain router and the root `contract`.
- Enums once in `packages/contracts/src/enums/` (ALL_CAPS); `z.enum(...)`, not `z.nativeEnum`.
- Money fields are integer minor units (`z.number().int()`), never floats or decimal strings.

## 3. Entity + migration (only if storage changes)

Follow the `db-schema-change` skill. Household rows extend `HouseholdEntity` and are read/written only through `HouseholdScopedRepository`; per-member personal rows use `PersonalHouseholdEntity` + `PersonalScopedRepository`.

## 4. Service

- Same CRUD banner order as the contract; JSDoc on class and public methods.
- Existence/permission checks before writes; capabilities via `CAPABILITIES.*` (`packages/contracts/src/backoffice/plan/capabilities.ts`) where the area is gated.
- Explicit field-by-field mapping to the contract output type; no raw entities on the wire, no `as` casts.
- Money splits through `common/utils/money.util.ts` (remainder to the largest share).
- `await this.em.persist(entity).flush()` — never `*AndFlush`.

## 5. Controller + module

- Transport only: `@Implement(contract.…)` handlers, same method order, no money `if`s.
- Register entity/service/controller like neighbours; export what other modules need; add to the parent module.

## 6. Client (when UI ships in the same change)

- `api` (`apps/application/app/_lib/api.ts`) and `apiQuery` (`app/_lib/api-hooks.ts`); no hand-written wire interfaces.
- New UI copy goes through `add-translations`.

## Checklist

- [ ] Schema + inferred types in the same `*.schema.ts`
- [ ] Procedures in CRUD order with banners; domain router + root `contract` composed
- [ ] Service and controller follow the same order; controller is `@Implement` only
- [ ] Household scope for every household row (no `em.find` on `HouseholdEntity`)
- [ ] Explicit mapping matches the contract output
- [ ] Money in integer minor units
- [ ] Module registered like neighbours
- [ ] No Express, no `dto/` folder, no schema-per-tenant leftovers
- [ ] Frontend uses the typed client
- [ ] Module README updated if the public surface changed (`write-docs`)

## Definition of done

```bash
pnpm --filter @rumtelo/contracts check-types
pnpm --filter @rumtelo/backend lint:entities
pnpm --filter @rumtelo/backend test          # vitest
pnpm check-types
pnpm lint
```

Plus a Vitest spec for the business rule and one sad path (cross-household access refused), migrations hand-written and flagged **unverified on staging**, QA and security sign-off. Claude commits; Given pushes (`dev` → staging runs `db-migrate.yml`).
