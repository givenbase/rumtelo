---
paths:
  - "packages/contracts/**"
  - "apps/backend/src/**/*.controller.ts"
  - "apps/backend/src/**/*.service.ts"
---

# oRPC leaf checklist (contracts first)

Normative: `packages/contracts/README.md`. Step-by-step: `.cursor/skills/orpc-aggregate/SKILL.md` (contracts → entity → service → controller → client). A leaf is not done until every box is true.

## Contracts (`packages/contracts/src/<plane>/.../<leaf>/`)

Planes mirror the backend: `public/product/{money,growth,energy,soul}`, `public/platform`, `backoffice`, `common`.

- [ ] Leaf folder: `<leaf>.schema.ts`, `<leaf>.types.ts`, `<leaf>.contract.ts` (only if it has procedures), `index.ts`; optional `<leaf>.util.ts`
- [ ] `*.schema.ts`: Zod + `export type X = z.infer<typeof X>` for **every** public const in the same file; no oRPC, helpers or TS enums
- [ ] `*.types.ts`: re-exports / derived aliases only — no Zod roots
- [ ] `*.contract.ts`: `oc` procedures with CRUD banners (Create → Read → Update → Delete); imports Zod, never defines it
- [ ] File header JSDoc on schema and contract; JSDoc on each procedure and non-obvious field
- [ ] Enums only in the plane's `enums.ts` (ALL_CAPS values); no UI slug maps
- [ ] Composed into the domain router (`money/router.ts`, `platform.router.ts`, …) and re-exported from the domain/root barrels; never `export *` both schema and types when names collide (TS2308)
- [ ] No hand-written interface duplicating a Zod shape; no flat `schemas/foo.ts`
- [ ] Imports inside a leaf are relative; new consumers prefer subpaths (`@rumtelo/contracts/money`, `/growth`, `/platform`, `/backoffice`, `/common`, `/react`)
- [ ] `pnpm --filter @rumtelo/contracts check-types` passes; `build` re-attaches `"use client"` via `scripts/add-use-client.mjs`

## Nest (`apps/backend/src/modules/.../<leaf>/`)

- [ ] `@Implement(contract.x.y)` + `implement(contract.x.y).handler(...)`; `@ControllerSwagger(...)`; routes come from the contract
- [ ] Controller and service JSDoc; same CRUD banners and order as the contract
- [ ] Explicit mapping to contract types — no `as` casts; wire Zod never lives under backend `dto/`
- [ ] DTO types derived from the contract (string-enum members are nominal and won't satisfy literal unions)
- [ ] Entities import **enums only** from `@rumtelo/contracts`
- [ ] Household scope, role and capability enforced server-side (see `backend.md`)
- [ ] Feature `README.md` lists the public `contract.*` paths when the module has one

## Client

- [ ] Consume the typed client / `apiQuery`; no parallel hand-written types in the app
