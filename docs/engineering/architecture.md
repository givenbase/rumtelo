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
