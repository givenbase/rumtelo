# Rumtelo — shared context for every agent

Code wins over docs. When this file, `HANDOFF.md` or a README disagrees with the code, trust the code and flag the stale doc.

## Product

Rumtelo ("grip on life", from Spanish *rumbo*, course) helps a **household** see where its money and life went, and steer it. Four portals — **Money · Growth · Energy · Soul** — sit on one board: income splits into **pots** the same second (three to start — Basics 55 · Future 20 · Free 25, **Rumtelo Pots** — refined per household with optional pots), fixed costs draw from pots, transactions land in an Inbox, a ten-minute **week check** redirects surplus, and a month score closes the turn; Growth holds goals and the **Course** planner (NL *Koers*), and **The Coach** gives rule-based tips with one next move. **Rumtelo Practice** is the B2B desk where coaches and advisors follow client households, only with the household's consent.

Audience: people who are doing well, people who want change, and people who want to be successful but lack a map — plus the practices that help them. NL/EU-first (Railway EU, EU-resident data). Copy is **English first, Dutch second**; `es` and `fr` are machine-generated. Full context: `.claude/rules/rumtelo-context.md`.

## Repo map (pnpm 10 + Turborepo, Node ≥ 22.17, TypeScript 5.9)

| Path | What | Port |
| --- | --- | --- |
| `apps/application` | Authenticated product (Next.js 16, React 19, Tailwind v4) — household shell + Practice shell | 3000 |
| `apps/website` | Marketing site + sign-up door | 3001 |
| `apps/backend` | NestJS 11 + Fastify + oRPC + MikroORM 7 (`^7.2`) + PostgreSQL, better-auth | 3002 |
| `apps/e2e` | Playwright (`@smoke`, `@plan`, `@practice`) | — |
| `packages/contracts` | `@rumtelo/contracts` — Zod + oRPC procedures, enums, plan/capability catalog (wire source of truth) | — |
| `packages/ui` | `@rumtelo/ui` — primitives (Radix/shadcn) + Rumtelo widgets | — |
| `packages/config` | Tailwind v4 tokens (`tailwind/theme.css`, single source of colour) | — |
| `packages/i18n` | `@rumtelo/i18n` — EN source in `translations/`, generated `languages/{en,nl,es,fr}.json` | — |
| `packages/utils`, `hooks`, `brand`, `typescript-config` | `cn`, money/name helpers, shared hooks, brand assets | — |
| `docs/` | Product, brand, explain scripts, engineering (`docs/README.md` is the index) | — |

Per app: `apps/<app>/AGENTS.md` holds what the app is for, its folder map, commands and traps; each `apps/<app>/CLAUDE.md` imports it with `@AGENTS.md`. Shared rules live here; don't repeat them there.

## Commands (root `package.json`)

| Task | Command |
| --- | --- |
| Type check (all) | `pnpm check-types` · one package: `pnpm --filter @rumtelo/<pkg> check-types` |
| Lint + format + entity lint + types (writes fixes) | `pnpm lint` · read-only: `pnpm lint:check` |
| Entity style lint | `pnpm --filter @rumtelo/backend lint:entities` |
| Unit tests | `pnpm test` (backend Vitest; `utils`/`i18n` node:test) · one file: `pnpm --filter @rumtelo/backend test -- <file>` |
| Compile a Next app | `pnpm --filter @rumtelo/application build` / `@rumtelo/website build` |
| Build contracts (needed before backend scripts) | `pnpm --filter @rumtelo/contracts build` |
| E2E (needs a running target) | `pnpm test:e2e:smoke`, `test:e2e:plan`, `test:e2e:practice` |
| Dev servers | `pnpm dev:app`, `dev:web`, `dev:back` (backend needs a reachable DB — see Environments) |
| Translations | `pnpm i18n:gen` — **only with Given's go-ahead** (DeepL key + quota) |
| New migration | `pnpm db:gen` — needs a DB; see Fixed rules → Migrations |

## Environments

| Env | Branch | Where |
| --- | --- | --- |
| Staging | `dev` | Railway (EU) — apps + Postgres |
| Production | `main` | Railway (EU) — apps + Postgres |

- **No local Docker or database.** `infra:up` exists but is not part of the workflow. Agents verify with type checks, lint, unit tests and compile; UI and migrations are verified **on staging by Given**.
- Pushing `dev` (or `main`) with changes under `apps/backend/src/database/migrations/**` or the auth engine config runs `.github/workflows/db-migrate.yml` (`db:push` + `auth:migrate`, then API smoke) against that environment.
- **Never run anything against the staging or production database**: no `db:*`, `db:*:stag`, `db:*:prod`, `auth:migrate`, seeders, `stripe:*` or `sync:github-secrets`, and never read or copy `.env*` values into briefs, logs or files.

## Fixed rules

- **Money** is integer minor units (eurocents), never floats or decimal-string arithmetic. Splits go through `apps/backend/src/common/utils/money.util.ts` (remainder to the largest share). Entity money columns use `MoneyType`.
- **Household isolation is row-level** `household_id`. `HouseholdScopeInterceptor` sets the context; household rows extend `HouseholdEntity` and are read/written only via `HouseholdScopedRepository` (person-attributed rows: `PersonalHouseholdEntity` + `PersonalScopedRepository`). Never schema-per-tenant, never `em.find` on household entities directly.
- **Contracts first**: Zod + procedures in `@rumtelo/contracts` → service → thin `@Implement` controller → typed client. No wire DTOs in the backend; controllers hold no business `if`s.
- **CRUD order** Create → Read → Update → Delete in contracts, services and controllers, with `// ? CREATE Operations` … banners.
- **Styling**: Tailwind v4 utilities and Rumtelo tokens only (`fg`, `fg-muted`, `surface`, `raised`, `line`, `accent`, `accent-soft`, `danger`, …). No CSS files, inline styles or hex.
- **i18n**: EN source in `packages/i18n/translations/`; never edit `languages/*.json`; wrong machine output is fixed in `translations/overrides.ts`. `pnpm i18n:gen` needs the DeepL key — Given runs it or approves it.
- **Migrations**: `pnpm db:gen` needs a database, which agents don't have. Hand-write the migration following the latest file in `apps/backend/src/database/migrations/` (class `Migration<yyyyMMddHHmmss>`, `up`/`down`, `addSql`, rename-in-place over drop+create), update `.snapshot-railway.json` to match the entities, and flag it as **unverified** for Given to check on staging. Never alter better-auth tables in a Mikro migration (`check-ba-migration-ownership.ts`).
- **Product principles** (a feature that fights one loses): (1) split first, spend second; (2) ten minutes a week; (3) energy carries money; (4) information, never shame — every warning carries one next move.
- **Pots**: the user-facing word is **pot** (NL *potje*), the code says `jar`. One main pot per group (`JarKey.NECESSITIES` / `LONG_TERM_SAVINGS` / `PLAY`), five optional pots a household turns on (`DAILY`, `GOALS`, `FINANCIAL_FREEDOM`, `EDUCATION`, `GIVE`); source `packages/contracts/src/public/product/money/jar/jar.util.ts`. The product never credits another author's six-jar method.
- **Naming**: **The Coach** (capital, in-app tips) vs a coach/advisor (human, via **Practice**); the weekly habit is a **routine**, never "practice"; the Growth planner is **Course** (`course` keys everywhere), never `plan` — `plan` means the subscription (`PlanKey` Basic/Plus/Max). Code, routes, tables English.

## Traps already hit (`docs/engineering/traps.md`)

- `@orpc/*` is ESM-only: the backend is ESM; contracts ship dual CJS+ESM and re-attach `"use client"` in `scripts/add-use-client.mjs`.
- `fastify` is pinned by a pnpm override to what `@nestjs/platform-fastify` needs — don't add a second version.
- Household context lives in an **interceptor**, not a guard (AsyncLocalStorage is gone before handlers otherwise).
- Next apps are `"type": "module"`: `next.config.js` uses `export default`.
- String-enum members are nominal: derive DTO types from the contract.
- Overspent jar = full red meter, not empty.
- Banking adapters never silently return `[]`; CSV import is the always-on path (`docs/engineering/banking.md`).
- A Postgres enum value added in a migration can't be used in the same transaction: own non-transactional migration first.
- A computed balance must not be priced at today's split or income: store the history and price each month at its own values (`money_jar_share`).
- Never bake a stored pot name into text; resolve it by `JarKey` (a main pot reads "Basics" alone, "Fixed costs" once refined). A household has 3–8 pots; never assume an optional one exists.

## Where to read first

| Need | Read |
| --- | --- |
| Product, audience, principles | `docs/product/*`, `docs/brand/positioning.md`, `.claude/rules/rumtelo-context.md` |
| Backend shape | `apps/backend/src/modules/README.md`, `apps/backend/README.md`, `.claude/rules/backend.md` |
| Entities | `apps/backend/docs/ENTITY_STYLE.md`, `.claude/rules/database.md` |
| Contracts | `packages/contracts/README.md`, `.claude/rules/orpc-leaf.md` |
| UI | `packages/ui/README.md`, `.claude/rules/frontend.md`, `docs/design/README.md` |
| Course (Koers) | `docs/engineering/growth-cascade-plan.md` |
| Status / history | `HANDOFF.md` (may be stale), `docs/BACKLOG.md` |

## Git

- Claude commits only when asked; **Given pushes**. Never push, open a PR or merge unless Given asks in this session.
- One commit per logical group, conventional messages (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`). Subagents never `git add`, commit, stash or restore — the orchestrator commits.

## Quality bar

- Work as a senior engineer on a money product: secure, maintainable, tested, documented; design as if there were 100× the households.
- Follow the nearest existing code over inventing patterns; minimal, reversible changes; no TODOs without a backlog line.
- Prefer React/Next industry patterns over lint theatre (no no-op effect cleanups, no `EMPTY_*` unless referential stability matters).
- Check current official docs (Context7) instead of memory for library APIs.
- Verify before you report and say plainly what you did not verify (anything that needs staging).

## Priority, size and estimate

Every task in a plan or brief carries a priority, a size and an estimate (agent work time, range + confidence). Scan the code before estimating; never estimate from a title.

| Priority | Meaning |
| --- | --- |
| **Critical** | Live breakage: login, money totals wrong, data loss, cross-household leak, security/privacy hole. Drop other work. |
| **High** | Blocks households, practices or the next release; user-reported bug in a core flow (jars, income, week check, Course). |
| **Medium** | Planned feature work, bugs with a workaround, medium findings. |
| **Low** | Polish, cleanup, docs, refactors without user impact. |

| Size | Agent effort | Rule |
| --- | --- | --- |
| **S** | < 1 h | |
| **M** | 1–4 h | |
| **L** | 4 h – 1 day | Ask Given before starting a non-Critical L while he is active. |
| **XL** | > 1 day | Split before starting. |

Order: priority first; within a priority, quick wins first; respect dependencies (contract → backend → UI). Past 1.5× the likely estimate, stop and re-estimate.

### Status updates to Given

At the start and end of a session and whenever a task finishes:

| Task | Priority | Size | Estimate | Actual | Status | Blocker / next step |
| --- | --- | --- | --- | --- | --- | --- |

Below it: commits (hashes), what waits for Given (decisions, staging checks, `i18n:gen`, migrations to verify), what starts next.

## Escalate to Given

- Pricing and plans (Basic/Plus/Max, seat add-ons, Practice pricing, capability grants).
- Money doctrine: jar split percentages and floors, rounding, what counts as income/fixed cost, Coach advice that steers money.
- Privacy and data sharing: GDPR, exports/deletion, new third parties, analytics.
- Practice consent: anything that changes what a practice can see or do, or when.
- Scope growth, conflicting requirements, anything needing staging/production, `i18n:gen` or Stripe.

## Claude Code setup

- **Rules** (`.claude/rules/`): always on — `workflow.md` (stack, code standards), `rumtelo-context.md` (product, roles, plans), `team-workflow.md` (orchestration, briefs, done). Path-scoped — `backend.md`, `orpc-leaf.md`, `database.md`, `frontend.md`, `i18n.md`. `.cursor/rules/*.mdc` point at these.
- **Skills** (`.claude/skills/`): `backend-feature`, `db-schema-change`, `fix-bug`, `write-tests`, `add-translations`, `responsive-pass`, `write-docs`, `product-audit`. Cursor: `.cursor/skills/orpc-aggregate/`.
- **Agents** (`.claude/agents/`): core team `product-manager`, `ux-ui-designer`, `nestjs-backend-engineer`, `nextjs-frontend-engineer`, `postgres-database-architect`, `qa-test-engineer`, `security-reviewer`; specialists `brand-copywriter`, `i18n-translation-specialist`, `wcag-compliance-auditor`, `responsive-ui-engineer`, `performance-engineer`, `docs-release-engineer`. The main session orchestrates (`team-workflow.md`).
- **Per app**: `apps/*/AGENTS.md`, imported by `apps/*/CLAUDE.md` via `@AGENTS.md`.
- PR gates: `docs/engineering/pr-gates.md`. Traps: `docs/engineering/traps.md`.
