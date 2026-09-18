---
name: orpc-aggregate
description: >-
  Add or change a Rumtelo oRPC aggregate contracts-first (Zod + procedures),
  then Nest service/controller. Use when adding API endpoints, money/product
  procedures, or wiring a new aggregate under Nest + Fastify + oRPC.
disable-model-invocation: false
---

# Contracts-first oRPC aggregate

## When

New or changed API surface for Rumtelo (Nest + Fastify + oRPC).

## Steps

1. **Contract leaf** under `packages/contracts` (same ownership plane as backend modules):
   - `{aggregate}.schema.ts` — Zod + `export type X = z.infer<typeof X>` in the same file
   - `{aggregate}.contract.ts` — `oc` procedures, CRUD banners Create → Read → Update → Delete
   - `index.ts` barrel; compose into domain router → root `contract`
2. **Entity** (if new storage) — match neighbor aggregates; household money → `HouseholdEntity` + scoped repo
3. **Service** — business rules; same CRUD order; explicit `toDto` / object map to contract types
4. **Controller** — thin `@Implement(contract…)` only; no money `if`s
5. **Module + index** — register like neighbors; export what others need
6. **Client** — consume typed client; no parallel hand-written interfaces

## Hard rules

- Wire Zod lives in `@rumtelo/contracts` — not under `apps/backend/**/dto/`
- Controllers are transport-only
- Row-level `household_id` — never schema-per-tenant
- Money = integer minor units

## Read before editing (canonical)

- [packages/contracts/README.md](../../../packages/contracts/README.md)
- [apps/backend/src/modules/README.md](../../../apps/backend/src/modules/README.md)
- [.cursor/rules/backend-module-shape.mdc](../../rules/backend-module-shape.mdc)
- Neighbor: `apps/backend/src/modules/public/product/money/` (e.g. rule, jar, goal)

## Checklist

See [references/checklist.md](references/checklist.md).
