# Rumtelo — direction & handoff

_Last verified: 2026-11-15 against `28506136`._

**Stop wondering where it went.** **Rumtelo — grip on life.**

> Rijkdom is geen getal. Het is grip op je leven.

See where your money, life, energy and time went — then get grip again. Clear tools,
a tip from The Coach, you choose. Not a budget app.

**Organized docs (product, brand, research, engineering):** [`docs/`](./docs/README.md)

---

## 1. Read this first

This document carries the **direction**, the **decisions and why**, and the
**traps already hit**, so nobody re-derives them. Product, audience, brand, and
research briefs live under [`docs/`](./docs/README.md); this file remains the
living engineering handoff.

**State in one line:** Money is the deepest product (jars → inbox → week check →
month close, CSV + optional Enable Banking sync); Growth has Course (Koers), goals,
income, net worth and learn; Energy and Soul are thinner. Billing (Stripe), i18n
(EN/NL/ES/FR) and Practice (B2B) are live code. Screens are a *partial* port of the
design — see §8. Status detail: §7; priorities: §9.

---

## 2. The product

Income arrives and splits into six jars the same second. Fixed costs draw from
those jars, so you see them coming. Transactions land in an **Inbox** and get
sorted, by rule or by hand. Once a week a **ten-minute week check** redirects the
surplus and sets an intention. Once a month the **month score** closes with a
score and a log — the Monopoly framing.

Four products, which are also the navigation:

| Product | What it answers |
|---|---|
| **Money** (Geld) | Where does this month go? |
| **Growth** (Groei) | How do I grow from here? |
| **Energy** (Energie) | What am I running on? Sleep, training, food, rest — the floor under financial decisions, not lifestyle extras. |
| **Soul** (Ziel) | Why am I doing this? |

Canonical portal table: [`docs/product/overview.md`](./docs/product/overview.md).

**Audience:** successful people, people who want change, and people who want to
be successful but don’t yet know the exact next move — see
[`docs/product/audience.md`](./docs/product/audience.md). Start with the owner
and friends; a subscription product if it works.
**Language:** English first, Dutch second; Spanish and French are generated (§7).

### Principles the product must not violate

1. **Eerst verdelen, dan uitgeven.** Money gets a job before it gets spent.
2. **Tien minuten per week.** The weekly week check beats daily worry.
3. **Energie draagt geld.** A tired head spends; a rested head steers.
4. **Informatie, nooit schaamte.** An over-the-line jar is a signal, not a
   verdict. Every warning carries the one move that fixes it.

Principle 4 has teeth. It is why the Coach always ships a CTA, why overspending
renders as information rather than alarm, and why `spendCorrelation` stays `null`
until there is enough data — a correlation from six points is noise dressed as
insight.

---

## 3. Stack, and why

| Layer | Choice | Reason |
|---|---|---|
| Monorepo | Turborepo + **pnpm** | one workspace, shared packages |
| Frontend | Next.js 16, React 19, **Tailwind v4 only** | see §6 |
| API | NestJS 11 + **Fastify** + **oRPC** | contracts-first, end-to-end types |
| Contracts | `@rumtelo/contracts` (Zod + procedures) | wire source of truth |
| ORM | **MikroORM 6** + PostgreSQL | unit-of-work for money rows |
| Isolation | Row-level `household_id` | never schema-per-tenant |
| Auth | better-auth (`organization` + `twoFactor`) | Household *is* the org plugin |
| Lint | **oxlint + oxfmt** | `pnpm lint` |
| Hosting | Railway (EU, Amsterdam) | one region, one bill, EU-resident data |

Pinned to **node >=22 / pnpm 10.33.0 / TypeScript 5.9.3**. `create-turbo` ships
node >=24, pnpm 11 and TypeScript 7 — none of which run on this machine, and TS 7
is the Go rewrite, risky under NestJS `emitDecoratorMetadata`. Do not bump these
casually.

### Three decisions worth understanding

**The backend is ESM.** Every `@orpc/*` package ships ESM only — `"type":
"module"`, `.mjs`, no CommonJS build — so a CJS NestJS app physically cannot
`require()` them. `packages/contracts` is therefore built **dual CJS+ESM** by
tsup, and both the ESM backend and the Next apps consume one contract definition.
Do not reintroduce an internal HTTP hop between Nest and oRPC — contracts
are dual CJS+ESM and consumed directly.

**Household isolation is row-level, not schema-per-tenant.** Rumtelo's "tenant"
is a *household*. Schema-per-household would mean tens of thousands of schemas,
O(households) migrations and catalog bloat. Every financial row carries
`household_id`, and the filter is injected in exactly one place —
`common/household/household-scoped.repository.ts` — from `AsyncLocalStorage`, so
a service cannot pass the wrong id or forget one.

**Postgres schemas group by ownership plane, not by product.** `auth` (identity),
`public` (platform + product / household data), `backoffice` (catalogs we publish).
Product areas (money/growth/…) are folders under `modules/public/`, not separate
DB schemas. better-auth keeps its tables in `auth` via its pool's `search_path`.

---

## 4. Layout

```
apps/
  backend/       NestJS + Fastify + oRPC + MikroORM   :3002
  application/   the authenticated product   :3000
  website/       marketing site              :3001
  e2e/           Playwright specs (smoke, plan gating, practice invite)
packages/
  contracts/     oRPC contracts + Zod schemas + typed client (dual CJS/ESM)
  i18n/          next-intl catalogs, DeepL generation + cache (EN/NL/ES/FR)
  ui/            shared React primitives + product widgets
  config/        Tailwind theme (`tailwind/theme.css`) + shared config
  hooks/ utils/ brand/ typescript-config/
docs/            product, brand, research, engineering direction
devops/          docker-compose (local), Railway notes
design/          the Claude Design export — see §8
```

---

## 5. One hierarchy, four layers

The same product tree governs modules, API, routes and database. Learn it once.

| Product | Backend module | Contract | Route | DB schema |
|---|---|---|---|---|
| — | `modules/auth/household` | `contract.household` | `/settings/*` | `auth` + `public` |
| — | `modules/public/platform/coach` | `contract.coach` | `/product/coach` | `public` |
| — | `modules/public/platform/practice` | `contract.practice` | `/practice/*` | `public` (+ `auth.account_address`) |
| — | `modules/public/platform/billing` | `contract.billing` | `/settings` (plan), `/practice/billing` | `public` |
| **Money** | `modules/public/product/money/*` | `contract.money.*` | `/product/money/*` | `public` |
| **Growth** | `modules/public/product/growth/*` | `contract.growth.*` | `/product/growth/*` | `public` |
| **Energy** | `modules/public/product/energy/*` | `contract.energy.*` | `/product/energy/*` | `public` |
| **Soul** | `modules/public/product/soul/*` | `contract.soul.*` | `/product/soul/*` | `public` |

App routes live in `apps/application/app/(routes)/[locale]/(app)/(household)/product/…`;
next-intl runs with `localePrefix: 'never'`, so URLs carry no locale segment.

Backend folders group children by role, so names are not 1:1 everywhere. Money:
`plan/{jar,income,fixed-cost,party}`, `ledger/{transaction,bank-account,bank-sync,sort-rule}`,
`targets/{goal,debt}`, `month-score`, `week-check`, `dashboard`, `archive`. Income and
goals are served by `contract.money.*` but their screens live under `/product/growth/…`.
Growth **Course (Koers)**: `modules/public/product/growth/course/`, `contract.growth.course.*`
(items, `rhythm`, `schedule`, `feed`), routes `/product/growth/course/[[...period]]` and
`/product/growth/course/week-check`, tables `public.growth_course_*`. Use `course`,
never `plan`, for its keys.

Example: `contract.money.jars.list` → `modules/public/product/money/plan/jar/jar.controller.ts`
→ `public.money_jar` (`entityConfig` prefixes the domain) → `/product/money/jars`.
**Keep the product tree aligned across module, contract, route and table.**

---

## 6. Conventions — non-negotiable

**Who owns the row.** Household/user writes → `public/product/*`, `public/platform/*`,
`auth/account`. Rumtelo writes → `backoffice/*` (`product/{money|growth}/…` with kinds
`template` | `preset` | `catalog`, plus root `plan/` for Basic/Plus/Max tiers and
`communication/`; reserved `reference/` for cross-product lookups later).
better-auth library writes → `auth/*/managed/`. `public/` is the app/household
plane (Postgres `public`); not company CMS.

**Structure.** One folder per domain aggregate with flat siblings:
`*.entity.ts`, service, controller, module, `index.ts` barrel — **no**
`entities/` subfolder. A product is a parent module importing its children.
Cross-cutting code in `common/`. Audience grouping under `modules/`
(`auth`, `public`, `backoffice`). Full shape + CRUD rules:
`apps/backend/src/modules/README.md` and `.cursor/rules/backend-module-shape.mdc`.

**CRUD order is Create → Read → Update → Delete.** Every service and
controller uses those section banners in that order only. Never `list`
before `create`. Never put create-like ops (`onboard`, `invite`, `importCsv`,
`createCategory`) after updates or deletes.

**Styling is Tailwind. Always.** No CSS files, no SCSS, no CSS modules, no inline
`style` attributes. When porting the design, **transform** its inline styles into
Tailwind utilities — do not copy them across. Design tokens live in
`packages/config/tailwind/theme.css` (`@theme`) — the **single source of truth**
for all hex/rgb values. Apps import only `@rumtelo/config/tailwind/globals.css`
in `app/globals.css` (no duplicate palette). shadcn semantic aliases
(`--color-background`, `--color-primary`, …) are `var()` references in the same
`@theme` block. Primitives come from `@rumtelo/ui` (shadcn CLI + Radix); Rumtelo
product widgets from `@rumtelo/ui` widget barrel; domain composition in
`app/_components/{layout,features}/` and route `./_components/`.

**Code English, copy English first.** Every folder, route, identifier, table and column is
English. User-facing text is English first, Dutch second. Dates and currency go through `Intl`
with a locale — never hardcoded month tables, because the product ships EN *and*
NL.

**Money is integer minor units.** Never a float. Never arithmetic on a decimal
string. Splitting goes through `common/utils/money.util.ts`, which gives the
rounding remainder to the largest share so no cent is invented or lost.

**Controllers are transport only.** A controller containing an `if` about money is
in the wrong place.

**Never query another aggregate's tables.** Import its service. See
`money/dashboard`, which composes five services rather than joining their tables.

**Migrations only.** `schema:update` never runs against a database holding money.

**Normalise.** Prefer a table over a `jsonb` column. `week_check_allocation` exists
for exactly this reason: it needs a real FK to `Jar` and gets summed in
aggregates.

**Frontend state.** Submits → `useForm`; shared remote data → Provider + TanStack
`apiQuery`; UI flags → `useState`. Full table + PR gates:
`docs/engineering/pr-gates.md` and `.cursor/rules/react-next-patterns.mdc`.

---

## 7. What is real and what is not

**Backed by the database and working:**

- **Money:** jar balances (one grouped query, not N+1); transactions and inbox;
  CSV import with SHA-256 dedupe; Dutch decimal parsing (`EUR 1.234,56`); rule
  replay (`ledger/sort-rule/sort-rule.service.ts` `replay()`); week check with
  stages (`week-check.service.ts` `advance()`); month-score close
  (`month-score.service.ts` `close()`); debt avalanche/snowball; goal projections;
  JSON archive restore.
- **Growth:** Course (Koers) items, rhythms, schedule, ICS calendar feed
  (`course-feed.controller.ts`); goals/income screens; net worth (assets); learn
  (books, focus, progress); levers and milestones as list/CRUD.
- **Energy:** logs, time + time templates, dashboard rolling averages.
- **Soul:** gratitude and dashboard.
- **Platform:** onboarding create-household (`auth/household/household.service.ts`
  `onboard()`); household settings with **Basic / Plus / Max** (`plan_key`);
  personal rows with visibility (`common/database/personal.entity.ts`,
  `PersonalScopedRepository`; used by Course items and rhythms so far); Practice
  (B2B) clients/staff/invites/billing.
- **Stripe billing** (`modules/public/platform/billing/billing.service.ts`):
  checkout, customer portal, plan change and scheduled downgrade, webhooks,
  practice seat sync, household seat add-ons.
- **i18n:** `packages/i18n` + next-intl; EN source in `translations/`, NL/ES/FR
  generated via DeepL with a cache and `translations/overrides.ts`
  (`pnpm i18n:generate`).
- **Bank sync:** Enable Banking adapter fully implemented behind
  `FEATURE_BANK_SYNC` (default `false`; null adapter otherwise), 6-hourly pull
  (`bank-sync.constants.ts` `BANK_SYNC_CRON`). See `docs/engineering/banking.md`.
- Three demo personas seeded for live login and Playwright (`apps/e2e`).

**Screens** use live oRPC queries (`useLiveQuery` / `useQuery`); no mock fixtures.

**Shells / incomplete:**

- Energy, Growth and Soul week checks are `current()` + `complete()` only — no
  stages (compare Money's `advance()`).
- **Practice MANAGE writes are not built:** VIEW and MANAGE both map to a
  read-only VIEWER role (`common/household/membership.service.ts` ~L48), yet
  MANAGE already sponsors Plus and bills a client seat.
- Energy food / sleep / training pages render empty states; no dedicated APIs.
- Soul centers / intent / stillness have no own aggregate (stillness writes an
  `energy.logs` entry).

**Known issue — launch gating on staging:** `packages/contracts/src/backoffice/plan/launch-products.ts`
defers Energy and Soul when `NODE_ENV === 'production'`. Staging's backend also
runs `NODE_ENV=production` (`.github/workflows/README.md`), so Energy and Soul are
very likely hidden on staging too, despite the file's comment saying otherwise.

**Tests and CI:** three Playwright specs (smoke login, plan gating, practice
client invite); ~27 Vitest unit files (`*.spec.ts` / `*.test.ts`). GitHub workflows are
`db-migrate`, `api-smoke`, `e2e-smoke` only — no lint, typecheck, unit test or
build gate in CI (Husky runs `pnpm lint` locally).

---

## 8. The design

`design/` holds the Claude Design export (`Kluis Finance App.dc.html`,
`Kluis Landing.dc.html`, `_ds/`). It is readable now.

**Honest state:** the screens are a **partial port**, not a full rebuild. Some
components cite `.dc.html` line ranges in their doc comments (jars, net worth,
nav, portal hub/widget); most others were built from the domain without an
artboard. The app has also outgrown the design: Kluis is money-only, while the
app now has Growth (Course, learn, net worth), Energy, Soul, Practice, billing
and i18n with no artboard at all.

**Rules when porting or extending:**

1. Screenshot the artboard and build against what is on screen, not tag names.
2. Transform inline styles into Tailwind (4px scale, `rounded-*`, `ease-*` /
   `duration-*`, `@theme` tokens). Never copy inline styles.
3. Tokens live only in `packages/config/tailwind/theme.css`; apps import
   `@rumtelo/config/tailwind/globals.css`. No second palette.
4. Cite the source range (`Kluis Finance App.dc.html:<from>-<to>`) in the
   component doc comment when a screen follows an artboard.
5. Surfaces without an artboard follow existing ported screens and `@rumtelo/ui`.

Everything outside the screens — monorepo, contracts, backend hierarchy,
household scoping, DB schema, build pipeline — is design-independent.

---

## 9. Next steps, in priority order

1. **Practice MANAGE writes** — MANAGE bills a seat but grants read-only access
   (`common/household/membership.service.ts`). Build writes or stop billing it.
2. **CI gates** — add lint, typecheck, unit tests and build to GitHub Actions.
3. **Launch gating on staging** — decide whether staging should show Energy/Soul
   and fix the `NODE_ENV`-only check (§7 known issue).
4. **Energy food / training / sleep** — real APIs behind the empty-state pages.
5. **Soul centers / intent / stillness** — own aggregate instead of energy logs.
6. **Non-money week checks** — stages for Growth (see
   `docs/engineering/growth-week-check-plan.md`), Energy and Soul.
7. **Growth levers and milestones** beyond list/CRUD.
8. **Expand E2E** beyond the three specs (`apps/e2e`).
9. **Design** — finish porting Money screens against artboards; design the
   surfaces Kluis never covered (§8).

---

## 10. Getting started

```bash
cp .env.example .env          # BETTER_AUTH_SECRET: openssl rand -base64 32
# optional: apps/application/.env.example → .env.local (NEXT_PUBLIC_*)
pnpm install
pnpm infra:up                 # Postgres + Redis in Docker
pnpm db:migrate
pnpm auth:migrate             # better-auth tables (before seed users)
pnpm db:seed                  # catalogs + Basic/Plus/Max demo accounts
pnpm dev
```

Demo sign-in (`telo{Persona}1!`):

| Plan key | Email | Password |
|----------|-------|----------|
| BASIC | basic@rumtelo.com | teloBasic1! |
| PLUS | plus@rumtelo.com | teloPlus1! |
| MAX | max@rumtelo.com | teloMax1! |

```bash
pnpm test:e2e:smoke
pnpm test:e2e:plan
pnpm test:e2e:practice
```

Env files use sectioned templates (root + `apps/*/`.env.example`).

| App | Port |
|---|---|
| application | 3000 |
| website | 3001 |
| backend | 3002 |

Renaming is one command — the name was hard-won and should not be a one-way door:

```bash
node scripts/rename-project.mjs <new-name>
```

---

## 11. Traps already hit — do not re-learn these

- **`@orpc/*` is ESM-only.** A CommonJS backend cannot use it. §3.
- **Bundlers strip `"use client"`.** `packages/contracts` re-attaches it in
  `scripts/add-use-client.mjs`; tsup's `banner` option did not work on this build
  path. Without it, Next treats the hooks as server code and the build fails.
- **Duplicate `fastify` versions** break `@fastify/*` plugin typings. Pinned via a
  pnpm override to the version `@nestjs/platform-fastify` depends on.
- **`AsyncLocalStorage.run()` in a Nest guard does not work** — the store is gone
  before handlers execute. And Fastify/Nest middleware runs before route
  resolution (`req.url` is `/`). Household scoping is therefore an
  **interceptor** (`HouseholdScopeInterceptor`) that wraps `next.handle()`
  inside `householdStorage.run()`.
- **Next.js apps are `"type": "module"`,** so `next.config.js` needs
  `export default`, not `module.exports`.
- **String-enum members are nominal in TypeScript.** They do not satisfy the
  contract's literal unions; DTOs are derived from the contract instead.
- **An overspent jar must render a full red meter, not an empty one.** Empty reads
  as "no data", the opposite of what it means.
- **Free open banking is gone.** GoCardless Bank Account Data (ex-Nordigen) closed
  to new signups. **Enable Banking** has a free *restricted production* tier
  limited to accounts you link yourself, which fits the owner-plus-friends phase
  exactly. **Full production** (any customer connects a bank) is sales-quote only —
  no public price list. Bank sync sits behind a port with a **null adapter** by
  default; the null adapter throws rather than returning `[]`, because a
  banking adapter that silently returns nothing looks like "your bank has no
  transactions". The Enable Banking adapter is built and binds only when
  `FEATURE_BANK_SYNC` + credentials are set. CSV import is the always-on path. Canonical write-up:
  [`docs/engineering/banking.md`](docs/engineering/banking.md).
- **`Downloads` is TCC-protected on macOS** and the `com.apple.macl` attribute
  follows a copy (historical: `design/` once returned `EPERM` everywhere). Fix
  with `xattr -cr design` or re-copy with `ditto --norsrc --noextattr --noacl`.

---

## 12. Naming

`Rumtelo` — Spanish *rumbo*, "course / heading" (distinctive *t*). Chosen because it is the one
candidate that means **direction**, which is what the product does. `.com` and
`.nl` claimed at rename time.

Verify with **whois**, never DNS alone: a registered-but-unconfigured domain has
no NS records and reads as available. SIDN (`.nl`) rate-limits aggressively and
returns an error that looks like "taken" — pace queries and retry.

Before committing further, run a **BOIP** (Benelux) and **EUIPO** trademark
search, classes 36 and 42.
