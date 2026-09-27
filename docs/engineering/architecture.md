# Architecture

Snapshot of how the system is built. For status, next steps, and full narrative, see root [`HANDOFF.md`](../../HANDOFF.md).

---

## Stack (and why)

| Layer | Choice | Reason |
|---|---|---|
| Monorepo | Turborepo + **pnpm** | one workspace, shared packages |
| Frontend | Next.js 16, React 19, **Tailwind v4 only** | one styling system |
| API | NestJS 11 + **Fastify** + **oRPC** | contracts-first, end-to-end types |
| Contracts | `@rumtelo/contracts` (Zod + procedures) | wire source of truth |
| ORM | **MikroORM 6** + PostgreSQL | unit-of-work for money rows |
| Isolation | Row-level `household_id` | never schema-per-tenant |
| Auth | better-auth (`organization` + `twoFactor`) | Household *is* the org plugin |
| Lint | **oxlint + oxfmt** | `pnpm lint` |
| Hosting | Railway (EU, Amsterdam) | one region, one bill, EU-resident data |

Pinned: **node >=22 / pnpm 10.x / TypeScript 5.9.x**. Do not bump casually.

---

## Layout

```
apps/
  backend/       NestJS + Fastify + oRPC + MikroORM   :3002
  application/   the authenticated product   :3000
  website/       marketing site              :3001
packages/
  contracts/     oRPC + Zod + typed client (dual CJS+ESM)
  ui/            shared React primitives
  config/        Tailwind tokens (single source of truth)
docs/            product, brand, research, engineering direction
design/          design exports — see docs/design/
devops/          docker-compose, Railway notes
```

---

## One hierarchy, four layers

The same product tree governs modules, API, routes, and database.

| Product | Backend | Contract | Route | DB schema |
|---|---|---|---|---|
| — | `modules/auth/household` | `contract.household` | `/settings` | `auth` + `public` |
| — | `modules/public/platform/coach` | `contract.coach` | — | `public` |
| — | `modules/public/platform/practice` | `contract.practice` | `/practice/*` | `public` (+ `auth.account_address`) |
| **Money** | `modules/public/product/money/*` | `contract.money.*` | `/money/*` | `public` |
| **Growth** | `modules/public/product/growth/*` | `contract.growth.*` | `/growth/*` | `public` |
| **Energy** | `modules/public/product/energy/*` | `contract.energy.*` | `/energy/*` | `public` |
| **Soul** | `modules/public/product/soul/*` | `contract.soul.*` | `/soul/*` | `public` |

**Add anything in all four places or not at all.**

Money children (same list everywhere): `jar` `income` `fixed-cost` `account` `transaction` `rule` `goal` `debt` `month-score` `week-check` `dashboard`.

---

## Decisions worth understanding

1. **Backend is ESM** — `@orpc/*` is ESM-only; `packages/contracts` is dual CJS+ESM. Do not reintroduce an internal HTTP hop.
2. **Household isolation is row-level** (`household_id` via `AsyncLocalStorage`) — not schema-per-tenant.
3. **Postgres schemas group by ownership** (`auth`, `public`, `backoffice`) — products are folders under `modules/public/`, not DB schemas.
4. **Money is integer minor units** — never floats; split remainder via `money.util.ts`.
5. **Styling is Tailwind only** — tokens in `packages/config/tailwind/theme.css`.
6. **Code English, copy English first** — identifiers English; user-facing text English first, Dutch second (via i18n).
7. **Practice (B2B) is a separate control plane** — see below. Never fold it into better-auth `organization` / household.

---

## Practice vs Household (B2B control plane)

| | **Household** | **Practice** |
|---|---|---|
| Who | Family / partners / solo money board | Coach / social-work company |
| Login UI | `HouseholdShell` (Money / Growth / Energy / Soul) | `PracticeShell` (clients, staff, billing) |
| Tenancy | better-auth org (`auth.household`) | Own rows under `public.platform_practice*` |
| Data | All portal rows carry `household_id` | Staff + links only — no duplicate money board |
| Join | Membership / invite (roles OWNER / ADMIN / MEMBER / VIEWER — 1:1 with better-auth) | **`PracticeClientLink`** hinge (status + access VIEW\|MANAGE + controlFlags) |
| Billing | Basic / Plus / Max + optional seat add-ons (€2.50) | **€49 base** + **€2.50 / staff** + **€14 / MANAGE client** (VIEW = invite / household-added only; free) |
| Settings | `/settings/*` — account + household product prefs | `/practice/settings` — org profile only (not shared) |
| Authz later | Household membership **or** active Practice link | Practice role + link access |

**Extensibility rules**

- Do not rename Household to “tenant.” Eng docs may say tenancy; product nouns stay Household + Practice.
- Do not put Practice under `auth/` or reuse BA organization for companies.
- Grow capabilities on the **link** (flags, access levels), not by inventing a second household type.
- **Dual consent** — Practice invite (VIEW or MANAGE) always starts **INVITED** (`createdAt` = practice offer). Household OWNER/ADMIN accept sets `householdAcceptedAt` → **ACTIVE**. Data share only then.
- **MANAGE ⇒ Practice sponsors ⇒ Plus** (`SPONSOR_PLAN` + household ≥ Plus; Max kept) **and** meters the €14 client seat — applied **on household accept**, not on invite.
- **VIEW** = free Basic look-along after accept (no client seat).
- App routes (URLs unchanged): `(app)/(household)/*` vs `(app)/practice/*`; `AppBootGate` picks `HouseholdShell` or `PracticeShell`; avatar menu switches when the user has a practice.

**Household role ACL** (`packages/contracts/.../household/role-permissions.ts`):

| Role | Settings | Members / invite | Billing | Money / Growth / Energy / Soul / Home / Coach |
|------|----------|------------------|---------|-----------------------------------------------|
| OWNER | CRUD | CRUD | CRUD | CRUD |
| ADMIN | CRU (no delete household) | CRUD | CRU (no cancel-destroy) | CRUD |
| MEMBER | Read | Read | — | Day-to-day CRUD |
| VIEWER | Read (open board) | — | — | Read only |

Plan capabilities still gate *which features exist* on Basic/Plus/Max. Role matrix gates *what this member may do*. Backend: `RolePermissionInterceptor`.

**Shipped:** contracts + Nest (`platform/address`, `practice/*`, `auth/.../account-address`) + `/practice/*` UI.

```
apps/backend/src/modules/
  public/platform/address/
  public/platform/practice/
    practice/
    practice-address/
    practice-member/
    practice-client-link/
    practice-client-link-flag/
    practice-billing/
  auth/user/account/account-address/
```

Tables: `public.platform_address`, `public.platform_practice*`, `auth.account_address` — practice rows extend `BaseEntity` (not `HouseholdEntity`).

---

## Conventions (short)

- One folder per aggregate: entity, service, controller, module (flat — no `entities/` subfolder).
- Controllers are transport only — no money `if`s in controllers.
- Never query another aggregate’s tables — import its service.
- Migrations only against databases that hold money.
- Prefer normalised tables over `jsonb` when FKs/aggregates matter.

Full list: [`HANDOFF.md`](../../HANDOFF.md) §6.

---

## Related

- [Traps](./traps.md)
- [Design rebuild](../design/README.md)
- [Product overview](../product/overview.md)
