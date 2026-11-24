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

**State in one line:** Money is the deepest product (pots → inbox → week check →
month close, CSV + optional Enable Banking sync); Growth has Course (Koers), goals,
income, net worth and learn; Energy and Soul are thinner. Billing (Stripe), i18n
(EN/NL/ES/FR) and Practice (B2B) are live code. Screens are a *partial* port of the
design — see §8. Status detail: §7; priorities: §9.

---

## 2. The product

Income arrives and splits into **pots** the same second: three to start —
Basics 55 %, Future 20 %, Free 25 % (**Rumtelo Pots**, NL *Rumtelo-potjes*) — and a
household can refine a pot by turning on optional ones (§7). Fixed costs draw from
those pots, so you see them coming. Transactions land in an **Inbox** and get
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
| ORM | **MikroORM 7** + PostgreSQL | unit-of-work for money rows |
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

- **Money:** pots (`jar` in code): a new household gets three main pots (one per
  group `BASIS` / `FUTURE` / `FREE`, 55 / 20 / 25) and turns optional pots on or off
  inside a group (`money.jars.activate` / `deactivate`); existing households keep their
  six. Source: `packages/contracts/src/public/product/money/jar/jar.util.ts`, behaviour
  in `apps/backend/src/modules/public/product/money/README.md`. **Built (`0855c1e2`):** the fixed-cost form asks "Moet dit, of kies je dit?" (the answer only picks
  the pot; nothing new is stored — `features/forms/fixed-cost-pot-choice.tsx`), and split
  settings show a "Basics fit" hint (`app/_lib/basics-fit.ts`,
  `settings/_components/jars-basics-fit.tsx`): a button that fills in the split, never
  automatic, and the "room" case only when Daily is on. A pot's running balance ("saved")
  is priced month by month from a share history (`money_jar_share`, §13). **Not built
  yet:** Buffer fills first, category tags, automatic derivation of Basics from real fixed
  costs — `docs/BACKLOG.md`. Jar balances (one grouped query, not N+1); transactions and inbox;
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
- **A Postgres enum value added in a migration cannot be used in the same
  transaction.** MikroORM runs pending migrations in one master transaction;
  `alter type … add value` followed by an `insert` of that value fails ("unsafe use
  of new value"). Put the `add value` in its own migration with
  `isTransactional() { return false; }` (`Migration20261123100000_JarKeyDailyGoals`),
  and the rows that use it in the next one.
- **Never bake a stored pot name into text.** A pot's name depends on its group and on
  whether it is refined ("Basics" alone, "Fixed costs" once refined) and a household can
  rename it. Resolve the name by `JarKey` at render time. Two backend-composed Coach
  lines still do this wrong (`docs/BACKLOG.md`).
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

---

## 13. Release notes

### 2026-11-23 — Rumtelo Pots: three pots by default, refine inside a group

Commits `28d470d3` … `edc19ce2` on `dev`. Checked against the code; **migrations and every
screen are unverified until Given has run them on staging.**

**Breaking**

- `JarKey` has two new members, `DAILY` and `GOALS` (eight keys). Exhaustive `switch`es and
  `Record<JarKey, …>` maps in consumers need the new entries.
- The onboarding split (`OnboardingInput.split`, `OnboardingSplitPreviewInput.split`) accepts
  **3 to 8** entries, each key at most once, total exactly 100.00 (was exactly 6, every key).
  `OnboardingSplitPreview.jars` returns 3 to 8 entries. A custom split must name the three main
  pots (`NECESSITIES`, `LONG_TERM_SAVINGS`, `PLAY`) and nothing else (`jar_split_keys` otherwise).
- A new household gets **three** pots, not six. Clients that assumed six rows must read the list.
- `DEFAULT_JAR_SPLIT` is **removed** (it was deprecated); use `defaultJarSplitFor(keys)`.
- `@rumtelo/ui` `AuthManifesto`: the `strip` prop is now **required**; the `footer` prop, the
  `AuthManifestoFooter` type and `AUTH_MANIFESTO_JAR_VISUALS` are gone (the caller passes a
  translated strip; `showShare` on the strip puts each share in the tooltip). The old built-in
  English "Six jars" and "Four portals" strips are removed.
- `@rumtelo/utils` `jarPotBalance`: the input takes `cumulativeDeposit` instead of `allocated` +
  `monthCount` (see "A pot's running balance" below).
- Contract limits tightened: bulk sort `transactionIds` at most 500; week-check `allocations` at
  most one per pot (8).
- New API error keys: `jar_not_optional`, `jar_already_active`, `jar_not_empty`,
  `jar_share_too_small`, `goal_give_needs_give_jar`, and `jar_not_found`,
  `category_not_found`, `transaction_not_found`, `debt_not_found`, `fixed_cost_not_found`. They
  need i18n text under `common.message.error.api`.
- Writes that take a jar, category, debt, fixed cost or bank account id from the client now
  resolve it inside the household and answer `*_not_found` for an id that is not the
  household's (indistinguishable from one that does not exist).
- Device writes now follow the role matrix: `/device` maps to the `HOME` section
  (`permissionSectionFromPath` in `role-permissions.ts`), so MEMBER keeps day-to-day access and a
  VIEWER can read (`device.list`, `device.kinds`) but `device.create`, `device.update` and `device.delete` answer `viewer_read_only`. A device's wearer must be a
  member of the household (`member_not_found` otherwise).
- Migrations (both hand-written, **unverified until staging**, run by `db-migrate.yml` on a push of
  `dev` with changes under `apps/backend/src/database/migrations/**`):
  - `Migration20261123100000_JarKeyDailyGoals` — adds `DAILY` and `GOALS` to the native enum
    `money_jar_key`. Non-transactional on purpose; `down()` leaves the values in place.
  - `Migration20261123100100_JarTemplateMainPots` — adds `is_default` to the jar template table,
    sets NECESSITIES / LONG_TERM_SAVINGS / PLAY as default at 55 / 20 / 25 and the optional
    templates' shares, inserts the `DAILY` and `GOALS` templates with nl/es/fr names and category
    links. Household data is not touched.
- `Migration20261123120000_JarShare` (`88f57350`; hand-written, **unverified until
  staging**) — creates `public.money_jar_share` (one row per pot per month in which its share
  changed; unique `(jar_id, period)`, cascade from `money_jar`, `YYYY-MM` and 0–100 checks) and
  backfills one baseline row (`period` `1970-01`) per existing pot with its current percentage. No
  existing money row changes. `down()` drops the table (the history only lives there).
- **Deploy order for the share history:** the backend that reads `money_jar_share` must not start
  before this migration has run (a read of a missing table fails every pot list). A pot with no
  share row at all (created in a deploy window) is read as one baseline row with its current
  percentage; nothing is written on read.
- **Deploy order:** the new backend must be live with, or before, onboarding resuming after the
  migration. The previous backend reads every active template (now eight rows totalling 141 %), so
  an onboarding in that window fails the 100 % check or creates the wrong pots. Do not onboard a
  household between the migration and the new backend.

**Added** (Money)

- Pots in three groups on the board, Home, onboarding and Settings; Basics · Future · Free
  (NL Basis · Toekomst · Vrij).
- Optional pots per group: Daily (Basics); Goals, Investing, Learning (Future); Giving (Free).
  New procedures `money.jars.activate` and `money.jars.deactivate` (role UPDATE). A pot takes its
  share out of its group's main pot, so the three group totals do not change; turning off is only
  possible while nothing references the pot.
- `@rumtelo/contracts`: `JarGroup`, `JAR_GROUP_BY_KEY`, `JAR_MAIN_KEY_BY_GROUP`,
  `OPTIONAL_JAR_KEYS`, `OPTIONAL_JAR_SHARE`, `DEFAULT_GROUP_SPLIT`, `defaultJarSplitFor`,
  `resolveJarKeyForHousehold`, `sumPercentageByGroup`.
- Landing and sign-up show the three groups at 55 / 20 / 25; es/fr copy regenerated.

**Changed**

- **A pot's running balance ("saved") is priced month by month.** It used to be months × this
  month's allocation (today's income × today's share), so every split change, turning a pot on and
  every income change re-priced the whole past. Now each month is priced at that month's income
  and that month's share of the pot (`jar-share.util.ts`, `money_jar_share`, income history in
  `money_income_amount_period`). A household that never changed its split or income sees
  identical numbers; one that did sees corrected past figures; months before the first income
  count 0; the history starts at the split in force when `Migration20261123120000_JarShare` runs
  (the baseline row). Turning a pot off adds its history to the main pot's, so what both pots
  deposited is kept (the main pot can differ by a few cents from the old two-pot sum; the
  household total is exact). Looking Ahead still carries the current split forward.
- The fixed-cost form asks "Moet dit, of kies je dit?" (the answer only picks the pot) and split
  settings show a "Basics fit" hint with a button that fills in the split. Both in `0855c1e2`.
- A main pot shows the group name while alone and its own name once refined (Fixed costs,
  Buffer, Fun).
- Anything aimed at a pot that is off (presets, merchants, categories, archive restore) lands in
  the group's main pot. A Give pledge needs the Giving pot (`goal_give_needs_give_jar`).
- The split coach and the server money coach speak at group level (Basics above 60 %, Future below
  10 %); the per-pot tips are gone.
- Existing households keep their six pots and count as refined.
- Landing: the book card for "Secrets of the Millionaire Mind" and the footer attribution to the
  six-jar method are replaced by "Rumtelo Pots is our own method" (`3c2132aa`, `cc84a832`).

**Fixed**

- Turning on Daily (or changing a split) no longer moves months that already happened: the
  per-pot "saved" figure of the past stays at the split it had (see Changed).
- `updateSplit` checks the whole split: every pot once, total exactly 100.00 in basis points,
  a clean `jar_split_total` / `jar_split_keys` error instead of a 500.

**Security**

- Split save, activate and deactivate lock all of the household's pots so concurrent writes cannot
  leave the total off 100 %.
- **Fixed (`c8d0d0fa`):** jar, category, debt, fixed cost and bank account ids from
  the client were not checked against the household on transaction, fixed-cost, sort-rule, goal and
  week-check writes, so a member who knew another household's id could attach own rows to it
  (pre-existing, not from this change). `own-reference.util.ts` (`requireOwn*`) now resolves each id
  through `HouseholdScopedRepository`, applied to transactions, sort rules, fixed costs, goals,
  week-check allocations and the device wearer; debt and fixed-cost links are validated before a
  transaction is written. Remaining, in `docs/BACKLOG.md`: composite foreign keys `(id, household_id)` as defence in depth
  (Low), demo credentials in the root `README.md` (Low, for the owner to decide). The category-in-pot gap closed on 2026-11-24 (below).

**To verify on staging before `main`:** the ordered checklist is §14. Open follow-ups:
`docs/BACKLOG.md` ("Rumtelo Pots — follow-ups").

### 2026-11-24 — pot and category must match, restore is all-or-nothing

Uncommitted in the working tree when written; checked against the code. Nothing has run on staging.

**Changed**

- **A category must belong to the chosen pot.** A row that names both a pot and a category is
  refused with `category_not_found` when the category sits in another pot (`assertCategoryInJar`
  in `own-reference.util.ts`): transaction create / sort / bulk sort / update, sort-rule create /
  update / payee hint, fixed-cost create / update. No check when the row has no pot or no category
  is sent; an edit that touches neither is not re-judged. In the app, editing an expense sends the
  category only when sorting, and the fixed-cost form clears a category that is not in the selected
  pot. Rows saved before this are not rewritten (count them: §14, check 12).
- **Archive restore is all-or-nothing.** The real run is one transaction, so a failure in a late
  section leaves nothing behind. The preview (dry run) checks the same rules (`invalid_iban`,
  `due_month_required`, `settlement_account_invalid`, duplicate party names) and refuses in the
  preview too. The pot split is written last so pot locks are short.
- **Restore warnings and reasons are shown** in Settings → Import (at most 10 lines), in English and
  Dutch; a test fails when a backend warning id has no text.
- **Copy:** dead keys removed; the Members card seat line links to Settings → Plan (no price) for
  roles that can see billing; the import copy names the real file, `jars.csv`.

**Added:** `.github/workflows/ci.yml` (lint, types, tests, builds; see `docs/engineering/pr-gates.md`).
It reports; making it a required check is a GitHub / Railway setting.

**Needs Given:** `pnpm i18n:gen` for 23 new or changed EN strings from this batch (es and fr show
English until then). New findings from the review are in `docs/BACKLOG.md` ("Found on 2026-11-24").

---

## 14. Staging checklist — Rumtelo Pots (for Given, in order)

Nothing here has run on a database. All SQL below is read-only (`select`); run it against staging
only, never production before staging passes. Queries return ids, never names or amounts.

1. **The three migrations ran.** After the `dev` push, `db-migrate.yml` is green. Then
   `select name from mikro_orm_migrations order by id desc limit 5;` shows
   `Migration20261123100000_JarKeyDailyGoals`, `Migration20261123100100_JarTemplateMainPots` and
   `Migration20261123120000_JarShare` (MikroORM's default table name; the config does not override it).
   `select enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'money_jar_key';`
   lists `DAILY` and `GOALS`.
2. **Every pot has a share row.** Right after the migration the counts are equal; later a pot can
   have several rows (one per share change), so the lasting check is the second query (must be 0).

   ```sql
   select (select count(*) from public.money_jar_share) as share_rows,
          (select count(*) from public.money_jar) as pots;

   select j.id from public.money_jar j
   where not exists (select 1 from public.money_jar_share s where s.jar_id = j.id);
   ```
3. **No cross-household reference.** Each statement must return 0 rows. A row means a money row
   points at another household's jar, category, debt, fixed cost or bank account.

   ```sql
   select 'transaction' as row_kind, t.id from public.money_transaction t
   left join public.money_jar j on j.id = t.jar_id
   left join public.money_category c on c.id = t.category_id
   left join public.money_debt d on d.id = t.debt_id
   left join public.money_fixed_cost f on f.id = t.fixed_cost_id
   left join public.money_bank_account b on b.id = t.account_id
   where j.household_id <> t.household_id or c.household_id <> t.household_id
      or d.household_id <> t.household_id or f.household_id <> t.household_id
      or b.household_id <> t.household_id
   union all
   select 'sort_rule', r.id from public.money_sort_rule r
   left join public.money_jar j on j.id = r.jar_id
   left join public.money_category c on c.id = r.category_id
   where j.household_id <> r.household_id or c.household_id <> r.household_id
   union all
   select 'fixed_cost', f.id from public.money_fixed_cost f
   left join public.money_jar j on j.id = f.jar_id
   left join public.money_category c on c.id = f.category_id
   left join public.money_debt d on d.id = f.debt_id
   where j.household_id <> f.household_id or c.household_id <> f.household_id
      or d.household_id <> f.household_id
   union all
   select 'goal', g.id from public.money_goal g
   join public.money_jar j on j.id = g.jar_id
   where j.household_id <> g.household_id
   union all
   select 'week_check_allocation', a.id from public.money_week_check_allocation a
   join public.money_jar j on j.id = a.jar_id
   where j.household_id <> a.household_id;

   -- Devices whose wearer is not a member of the device's household.
   select d.id from public.platform_device d
   where d.account_id is not null
     and not exists (
       select 1 from auth.account a
       join auth.member m on m.user_id = a.user_id and m.household_id = d.household_id
       where a.id = d.account_id
     );
   ```

   A device row can also show up because its wearer left the household later: that is stale data,
   not a leak. Look at the row before deciding.
4. **Onboarding gives three pots.** Onboard an EN and an NL household: three pots at 55 / 20 / 25,
   names Basics / Future / Free; the split preview shows the same three.
5. **Turn a pot on and off.** Turn Daily on, then off (refused while anything points at it:
   `jar_not_empty`); do it in two tabs; save the split while a pot is being activated. The three
   group totals never change; the household total stays 100 %.
6. **"Saved" per pot, an older household.** Open an older household (six pots, or one that has
   changed split or income) and note "saved" per pot. Turn Daily on and compare: the past months
   must not move, only the months from now on. A household that never changed split or income must
   show exactly the numbers it showed before the deploy.
7. **Must or choose on a new fixed cost.** The form asks "Moet dit, of kies je dit?"; must lands the
   bill in the Basics main pot, choose in the Free main pot; the other-pot link opens the full picker;
   nothing extra appears on the saved bill.
8. **Basics fit.** In split settings the hint appears when fixed costs on Basics exceed the bills
   pot's share; the button fills in the form but does not save; the "room" case appears only with
   Daily on.
9. **VIEWER cannot write devices.** As a VIEWER open Settings → devices (it must open and list);
   `device.create`, `device.update` and `device.delete` (pair, edit, forget in the UI) must answer `viewer_read_only`. As a MEMBER they still work, and
   a wearer who is not a member is refused with `member_not_found`.
10. **Last:** the pot board and onboarding at 360 / 430 / 768 px, and an existing six-pot household
    (it keeps six pots).

11. **Fixed cost from a transaction (2026-11-24).** Open a transaction sorted in Daily, Buffer or
    Goals, choose "Make this a fixed cost": the form saves, and the bill lands in Basics.
12. **Pot and category together.** Edit an expense and change the pot and the category in one save
    (it saves); pick a category of another pot through an old link (refused, "Pick another
    category"). Count legacy rows whose category sits in another pot (SELECT only; each count is
    information, not a failure):

    ```sql
    select 'transaction' as row_kind, count(*) from public.money_transaction t
      join public.money_category c on c.id = t.category_id
      where t.jar_id is not null and c.jar_id <> t.jar_id
    union all
    select 'fixed_cost', count(*) from public.money_fixed_cost f
      join public.money_category c on c.id = f.category_id
      where f.jar_id is not null and c.jar_id <> f.jar_id
    union all
    select 'sort_rule', count(*) from public.money_sort_rule r
      join public.money_category c on c.id = r.category_id
      where r.jar_id is not null and c.jar_id <> r.jar_id;
    ```

    Such a row keeps working until someone edits its pot or category.
13. **Restore.** Settings → Import: (a) the dry run of a file with a yearly bill without a due month
    shows the reason and writes nothing; (b) a valid file restores; (c) a real run that fails anyway
    (the preview already refuses the known cases, so this is hard to provoke by hand) leaves
    nothing behind, not even the settings or parties it wrote first;
    (d) the warnings list shows readable lines (cap 10).
14. **First CI run.** After the push, `ci.yml` runs on GitHub and is green; decide whether to make
    it a required check.
15. **Members card.** As OWNER at the seat limit the seat line links to Settings → Plan; as MEMBER
    it shows the "ask the owner" line and no link. (The upgrade buttons above it still link to
    Plan for a MEMBER: open item in `docs/BACKLOG.md`.)
