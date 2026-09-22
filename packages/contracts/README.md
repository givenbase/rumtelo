# @rumtelo/contracts

Shared oRPC contract, Zod schemas, and TypeScript enums for app + backend.

This README is **normative**: follow it in every new or
moved leaf. Reviews must reject violations.

---

## Where does it belong?

Ask first. Place files under the same ownership plane as `apps/backend/src/modules/`.

```
Who writes the rows?
├─ Household / user  →  public/
│   ├─ Shared app runtime (household, coach, account prefs)  →  public/platform/
│   └─ A product line (Geld / Groei / Energie / Ziel)      →  public/product/{money|growth|energy|soul}/
└─ We (staff / system catalogs)  →  backoffice/
    ├─ Commercial tiers (Basic/Plus/Max)  →  backoffice/plan/
    └─ Product catalogs live next to the public product that exposes them
       (e.g. money/catalog/) — backend entities stay under backoffice/product/…

Cross-cutting primitives (Id, Money, Locale, CatalogItemBase)  →  common/
```

Wire paths stay short for nav parity (`contract.money.jars.list` → `/money/jars/list`).
Folder depth is for **ownership**, not URL length.

---

## Package layout

```
src/
  common/                     → @rumtelo/contracts/common
    common.schema.ts
    common.types.ts
    common.enums.ts
    index.ts

  public/
    platform/                 → @rumtelo/contracts/platform
      enums.ts
      account/ · auth/ · household/ · billing/ · coach/
      platform.router.ts      # composes leaf contracts
      index.ts

    product/
      money/                  → @rumtelo/contracts/money
      growth/                 → @rumtelo/contracts/growth
      energy/                 → @rumtelo/contracts/energy
      soul/                   → @rumtelo/contracts/soul

  backoffice/
    plan/                     → @rumtelo/contracts/backoffice

  client/                     HTTP + React helpers
  routers/index.ts            composes domain routers → `contract`
  schemas/index.ts            thin cross-domain re-exports (compat)
  enums/index.ts              thin cross-domain re-exports (compat)
  index.ts                    full package root
```

---

## Leaf layout (mandatory)

Every aggregate is a **folder**. Flat `schemas/foo.ts` files are forbidden for new work.

### Leaf with oRPC procedures

```
{aggregate}/
  {aggregate}.schema.ts     # Zod + same-module `export type X = z.infer<typeof X>`
  {aggregate}.types.ts      # re-exports / derived aliases
  {aggregate}.contract.ts   # oRPC oc procedures
  {aggregate}.util.ts       # optional — pure helpers
  index.ts                  # barrel: schema + contract (+ util); not types.ts
```

### Leaf without oRPC (forms / helpers only)

```
{aggregate}/
  {aggregate}.schema.ts
  {aggregate}.types.ts
  {aggregate}.util.ts       # optional
  index.ts                  # schema + util
```

**Must not** add an empty `{aggregate}.contract.ts`.

### Domain enums

```
{domain}/enums.ts           # TS string enums for that domain only
```

---

## What goes where (strict)

| File | May contain | Must not contain |
|------|-------------|------------------|
| `*.schema.ts` | Zod schemas, `export type X = z.infer<typeof X>` for each public const, schema-adjacent constants (`DEFAULT_*` only if tiny), short JSDoc | oRPC, business helpers, new TS enums |
| `*.types.ts` | Re-exports of inferred types from schema; rare derived aliases (`PlanLimitKey`) | Zod objects, runtime values, oRPC |
| `*.contract.ts` | `oc` procedures, CRUD section banners, nested `*Contract` object | Zod definitions (import them) |
| `*.util.ts` | Pure helpers / constants | Zod root schemas that belong in schema.ts |
| `enums.ts` | `export enum` (+ small const maps like `CADENCE_TO_MONTHLY`) | Zod schemas |
| `index.ts` | `export *` from schema / contract / util (not duplicate type barrels) | New definitions |

**Why types live in `*.schema.ts`:** TypeScript merges value + type namespaces only in the
**same module**. Cross-file `export *` of the same name is TS2308. So each public Zod
const must be paired with `export type X = z.infer<typeof X>` in `*.schema.ts`. Keep
`*.types.ts` as the leaf’s type surface (re-exports / derived aliases) for direct imports.

**Schema is the source of truth.** Never invent a parallel hand-written interface that
duplicates a Zod shape.

Keep existing public Zod names (`AccountProfile`, `SignUpForm`, …). Do not rename
wholesale to a foreign `createXSchema` / `responseXSchema` convention unless a
dedicated rename PR says so.

---

## Comments (required)

### File header

Every `*.schema.ts`, `*.types.ts`, `*.contract.ts`, and `*.util.ts` **must** start with:

```ts
/**
 * Account Schemas
 * Application person profile on auth.account (+ settings).
 */
```

### Contract sections

oRPC contracts **must** use CRUD banners (same as backend services):

```ts
// ====================================================================
// ? CREATE Operations
// ====================================================================

// ====================================================================
// ? READ Operations
// ====================================================================

// ====================================================================
// ? UPDATE Operations
// ====================================================================

// ====================================================================
// ? DELETE Operations
// ====================================================================
```

Omit empty sections. Never reorder C→R→U→D.

### Schema sections

Use banners when a schema file has clear groups (e.g. profile vs settings):

```ts
// ====================================================================
// ? PROFILE
// ====================================================================
```

### Public exports

Short JSDoc on every exported schema / procedure that is not obvious from the name.

---

## Enums

```ts
import { DebtKind } from '@rumtelo/contracts/money';
import { z } from 'zod';

z.enum(DebtKind); // ✅ Zod 4 — not z.nativeEnum
```

- Domain TS enums live in that domain’s `enums.ts` only.
- Closed string sets that are **not** shared with MikroORM may stay as `z.enum(['a','b'])`
  inside `*.schema.ts` (e.g. tour status, billing interval).
- Backend: `NativeEnum({ DebtKind, domain: 'money' })` → Postgres `money_debt_kind`
  (see `apps/backend/docs/ENTITY_STYLE.md`).

---

## Imports

**Prefer domain subpaths for new code:**

```ts
import { DebtKind, JarKey } from '@rumtelo/contracts/money';
import { HouseholdKind } from '@rumtelo/contracts/platform';
import { PlanKey } from '@rumtelo/contracts/backoffice';
import { Locale, Money } from '@rumtelo/contracts/common';
```

| Subpath | Folder |
|---------|--------|
| `/money` | `public/product/money` |
| `/growth` | `public/product/growth` |
| `/energy` | `public/product/energy` |
| `/soul` | `public/product/soul` |
| `/platform` | `public/platform` |
| `/backoffice` | `backoffice` |
| `/common` | `common` |
| `/` | full barrel |
| `/react` | TanStack Query helpers |

Root `@rumtelo/contracts` remains supported for existing call sites; migrate when you touch a file.

**Inside a leaf:** relative imports only (`./account.schema`, `../enums`, `../../../common/...`).

**Domain router** (`platform.router.ts`, `money/router.ts`, …) composes leaf `*.contract.ts`
exports into the nested `contract` object. Do not redefine Zod there.

---

## Must / must not

### Must

- Put every new aggregate in a leaf folder with the required files
- Pair every public Zod const with `export type X = z.infer<typeof X>` in `*.schema.ts`
- Keep a `*.types.ts` that re-exports those types (and any derived aliases)
- Put oRPC procedures in `*.contract.ts` with CRUD banners
- Re-export the leaf from the domain `index.ts` / schemas barrel so root imports keep working
- Mirror backend ownership planes

### Must not

- Add flat `schemas/foo.ts` next to leaf folders
- Put helpers (`composeDisplayName`, …) inside `*.schema.ts` — use `*.util.ts`
- Invent hand-written DTOs that duplicate Zod
- Add empty `*.contract.ts` for form-only leaves
- Define domain TS enums inside schema files
- Skip the file header comment
- `export *` both `*.schema.ts` and `*.types.ts` when they share names (TS2308)
---

## Example leaf — `account/`

```
public/platform/account/
  account.schema.ts
  account.types.ts
  account.contract.ts
  index.ts
```

```ts
// account.schema.ts
/**
 * Account Schemas
 * Application person profile on auth.account (+ settings / tour).
 */
import { z } from 'zod';
export const AccountProfile = z.object({ /* … */ });
export type AccountProfile = z.infer<typeof AccountProfile>;

export const AccountProfilePatch = z.object({ /* … */ });
export type AccountProfilePatch = z.infer<typeof AccountProfilePatch>;

// account.types.ts — leaf type surface (re-exports + rare derived aliases)
export type { AccountProfile, AccountProfilePatch } from './account.schema';

// account.contract.ts
/**
 * Account Contracts
 * oRPC procedures for profile + settings.
 */
import { oc } from '@orpc/contract';
import { AccountProfile, AccountProfilePatch, AccountSettings } from './account.schema';

// ====================================================================
// ? READ Operations
// ====================================================================
export const accountProfile = oc.output(AccountProfile);
// …
```

```ts
// index.ts
export * from './account.schema';
export * from './account.contract';
```

**Name collision note:** Zod const and inferred type **must** share a module so TypeScript
merges value + type namespaces. Do not also `export *` from `*.types.ts` in the leaf
barrel when names overlap (TS2308).

---

## Checklist before merging a contracts PR

- [ ] Leaf folder exists with the correct files
- [ ] Every public Zod const has `export type X = z.infer<typeof X>` in `*.schema.ts`
- [ ] No Zod roots in `*.types.ts` (re-exports / derived only)
- [ ] Contract has CRUD banners (if present)
- [ ] File headers present
- [ ] Domain enums only in `enums.ts`
- [ ] Domain / root barrels still re-export the leaf
- [ ] `pnpm --filter @rumtelo/contracts check-types` passes
