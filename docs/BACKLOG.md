# Backlog

The one place to find open work. Each row is one item and points to the doc with the details; long specs stay in their own docs. Direction and the "why" live in [`HANDOFF.md`](/HANDOFF.md) §9 (next steps) and §7 (what is real); code wins where they disagree.

**Priority:** Critical · High · Medium · Low. **Size:** S (≤ half a day) · M (1–2 days) · L (≤ a week) · XL (more). Order inside a section: priority first, then quick wins, respecting dependencies.

**Ways of working:** no local DB — `dev` deploys to Railway staging, `main` to production; pushing migrations to `dev` runs `db-migrate.yml`. Claude commits; Given pushes. Hand-written migrations stay "unverified" until they run on staging.

Last updated: 2026-11-16.

## Waiting for Given

| Branch | What | Needs |
| --- | --- | --- |
| `claude/docs-refresh` | HANDOFF and READMEs refreshed to match the code (i18n, Stripe, month-score close, rule replay, onboarding, Enable Banking marked built; Practice MANAGE gap, staging launch gating and CI gaps documented). | Review + push |
| `claude/course-goals-backend` | Course goals: soft limits and scope, merged Goals screen with goal trees, "Plan your year" intake. Two hand-written migrations: `Migration20261115120000_CourseSoftLimits`, `Migration20261115150000_PersonYearProfile` (+ `.snapshot-railway.json`). | Push to `dev`; verify both migrations on staging (`db-migrate.yml`), then smoke the Course screens |

## Now

| # | Item | Priority | Size | Details |
| --- | --- | --- | --- | --- |
| 1 | **Practice MANAGE writes** — MANAGE sponsors Plus and bills a seat but grants read-only access (VIEW and MANAGE both map to VIEWER). Build writes or stop billing it. | Critical | L | `apps/backend/src/common/household/membership.service.ts`, [`docs/product/practice.md`](/docs/product/practice.md) |
| 2 | **CI gates** — add `pnpm lint:check`, `pnpm check-types`, backend Vitest, contracts/utils/i18n node tests and `next build` to GitHub Actions (only `db-migrate`, `api-smoke`, `e2e-smoke` exist). | High | M | [`.github/workflows/README.md`](/.github/workflows/README.md), [`docs/engineering/pr-gates.md`](/docs/engineering/pr-gates.md) |
| 3 | **Staging launch gating** — staging runs `NODE_ENV=production`, so Energy and Soul are deferred there too. Decide and gate on an explicit flag, not `NODE_ENV`. | High | S | `packages/contracts/src/backoffice/plan/launch-products.ts`, `apps/backend/src/common/config/launch-products.util.ts` |
| 4 | **Customer clarity programme** — audit done (2026-11-16); work through the CL items below, starting with release "Clarity 1" (CL-1, CL-2, CL-3, CL-7, CL-10). Decisions D1–D11 wait for Given. | High | — | [`docs/product/clarity-audit.md`](/docs/product/clarity-audit.md) |
| 5 | **Stale "coming soon" copy** — "Extra seats are coming soon" while Stripe household seat add-ons exist; review other "coming soon" strings (bank connect, CHF, account deletion, wearables). | Medium | S | `packages/i18n/translations/pages/settings.ts` |
| 6 | **Fix failing node tests** — `@rumtelo/utils` and `@rumtelo/i18n` each have 1 failing test (2026-11-16 run). | Medium | S | `pnpm --filter @rumtelo/utils test`, `pnpm --filter @rumtelo/i18n test` |

## Clarity (from the clarity audit)

Source and copy: [`docs/product/clarity-audit.md`](/docs/product/clarity-audit.md) §8. Sizes there use the `CLAUDE.md` scale (S < 1 h, M 1–4 h, L ≤ 1 day); see decision D9.

| # | Item | Priority | Size | Details |
| --- | --- | --- | --- | --- |
| CL-1 | **Stop selling what production hides** — launch-filter hero floaters/ticker/demo line, Plus "Energy" line, Practice f3, Home help, Coach quiet-state link to `energy/week`, principle 3 on the landing. | High | S | `apps/website/app/_components/landing/landing-hero.tsx`, `pages/landing.ts` |
| CL-2 | **Fix NL meaning errors** — pin `quotes.md` twins and fixes in `overrides.ts`; `i18n:gen` by Given. | High | S | audit finding 6 |
| CL-3 | **Hero + How it works** — mechanism in the sub, "Split my income — free", 3-step `#how`, section reorder, pricing lead. | High | M | audit §5 (needs D2) |
| CL-4 | **Week check in the IA** — Money header button + Home card independent of the Coach; fold/rename the Course week check. | High | M | audit finding 5 (needs D5) |
| CL-5 | **Home week-1 layout** — one state-driven next-move card, one Coach tip, month score/levels hidden until trigger. | High | M | audit §6, mockup `home-week-1.svg` (needs D4) |
| CL-6 | **Onboarding to 2 screens** — income + split in € (server preview), default household name, dream and bank mapping to a week-1 checklist. | High | L | audit §6, mockup `onboarding-split.svg` (needs D6) |
| CL-7 | **Fix the dream promise** — visible in production or moved to "Plan your year". | High | S | audit finding 7 |
| CL-8 | **New navigation** — Home · Money · Growth · More; Money = Jars · Inbox · Fixed costs · Income; one mobile portal list; "Start a practice" out of the avatar menu. | Medium | M | audit §4 (needs D1, Course goals merge) |
| CL-9 | **Lock UX** — gain line, price, preview, "Not now", accessible lock; Basic gets one "More with Plus" entry. | Medium | M | audit §6 |
| CL-10 | **Pricing honesty** — Course named on Plus, stale "coming" lines out, outcomes instead of feature meters. | Medium | S | audit finding 12/14 |
| CL-11 | **Practice door** — own `/practices` page, short band on the landing. | Medium | M | audit finding 13 (needs D8) |
| CL-12 | **Progressive unlock ladder** — event triggers + "Show everything now"; remove fake level unlocks. Ask Given before starting. | Medium | L | audit §4 (needs D3) |
| CL-13 | **Quick add** — 4 kinds in week 1. | Low | S | after CL-12 |
| CL-14 | **Naming consistency** — routine not "practice"; NL potjes/Noodzakelijk/weekcheck/je/cliënten. | Low | S | audit finding 16 |
| CL-15 | **Book list** — decide on *The Secret*. | Low | S | needs D10 |

## Next

| # | Item | Priority | Size | Details |
| --- | --- | --- | --- | --- |
| N1 | **`periodStartDay` is stored but unused server-side.** Jars, month scores and month close all use calendar months, but Settings lets people pick a start day. Decide: hide the setting, or build a real period-window model. | High | M–L | Found in Clarity 3 (G-1). Spec pins calendar months today. Needs a decision from Given |
| N2 | **D7 Course-lite for Basic** (1 goal) and **D11 read-only debt list on Basic.** | Medium | M | Accepted decisions from the clarity audit, not built yet |
| N3 | **CL-16 website round 2** ("grip on your life", money as the engine, audience band). | Medium | M | Spec on `claude/product-audit-bd73fa` (`012ec44e`), not yet merged |
| N4 | **`BILLING_PREVIEW_BYPASS` must be off in production.** If it's on, a client can upgrade for free, and now that also unlocks the full board. | High | S | Check Railway env (security review, Clarity 3) |
| 7 | **Energy food / training / sleep** — real APIs behind the empty-state pages. | Medium | L | `apps/backend/src/modules/public/product/energy/`, [`docs/explain/02-energy.md`](/docs/explain/02-energy.md) |
| 8 | **Soul aggregates** — centers, intent, stillness as their own aggregate (stillness writes an `energy.logs` entry today). | Medium | L | `modules/public/product/soul/`, [`docs/explain/02-soul.md`](/docs/explain/02-soul.md) |
| 9 | **Non-money week checks** — stages for Growth, Energy and Soul (only `current()` + `complete()` today; compare Money `advance()`). | Medium | L | [`docs/engineering/growth-week-check-plan.md`](/docs/engineering/growth-week-check-plan.md) |
| 10 | **E2E expansion** — beyond smoke, plan gating and practice invite: money CRUD, week check, Course, household switch, viewer limits. | Medium | L | [`apps/e2e/AGENTS.md`](/apps/e2e/AGENTS.md) |
| 11 | **i18n es/fr regeneration with DeepL** — es/fr fall back to English without `DEEPL_API_KEY`; run `pnpm i18n:gen` with the key and review NL overrides. | Medium | S | [`packages/i18n/README.md`](/packages/i18n/README.md) |

## Later

| # | Item | Priority | Size | Details |
| --- | --- | --- | --- | --- |
| 12 | **Growth levers and milestones** beyond list/CRUD. | Low | M | `modules/public/product/growth/{lever,milestone}`, [`docs/engineering/growth-cascade-plan.md`](/docs/engineering/growth-cascade-plan.md) |
| 13 | **Design** — finish porting Money screens against artboards; design surfaces the Kluis export never covered (Growth, Energy, Soul, Practice, billing). | Low | XL | [`docs/design/README.md`](/docs/design/README.md), HANDOFF §8 |

## Rumtelo Pots — follow-ups after step 1 (2026-11-23)

Step 1 (three groups, new pot names, split validation) is on `dev`. See `docs/product/split-system-proposal.md`.

- **Not yet seen running.** The UI was verified by type checks, unit tests and code review only. Check on staging: the pots board at 360/430/768 px, `?group=` links, onboarding and settings grouping, one pot name on every screen for an NL-seeded, an EN-seeded and a renamed household, Save in settings only at exactly 100%.
- **`pnpm i18n:gen` (Given).** es/fr show the changed strings in English until it runs with the DeepL key.
- **Coach lines composed in the backend still use the stored pot name (Medium, S).** `money-coach.service.ts:175` and `fixed-cost-coach.util.ts:77` — e.g. "Noodzakelijk bills come to …". Needs the name resolved by key server-side or the text composed in the application.
- **Archive restore is not transactional (Medium, M).** A service-level failure in a later section (income, debts, fixed costs, goals) leaves a half-applied import; the dry run can promise rows the real run rejects. Wrap the real run in one transaction or pre-validate each section.
- **Application unit tests are not part of `pnpm test` (Low, S).** `apps/application` has no `test` script; its 16 node:test files only run by hand. Needs `tsx` as a devDependency — Given's approval.
- **Decisions for Given:** remove the "Secrets of the Millionaire Mind / T. Harv Eker" book card (`apps/website/app/_components/landing/landing-why.tsx:9`) and footer attribution (`pages/landing.ts:387`); the brand line replacing "Six jars. Ten minutes a week." (`docs/brand/quotes.md`); the Coach tip that names 55% as the default starting point (changes with the default split in step 2); the pot name "Beleggen / Investing".
- **Step 2 (needs a migration):** separate Buffer pot that fills first, Giving off by default, subscriptions under Fun with "Moet dit, of kies je dit?", category tags (ECOICOP, Nibud group, must/choose), default split 55/20/25 and Basis derived from real fixed costs.

## Rumtelo Pots — follow-ups after step 2 (2026-11-23)

Step 2 = three pots by default (55 / 20 / 25), optional pots turned on inside a group. Migrations `Migration20261123100000_JarKeyDailyGoals` and `Migration20261123100100_JarTemplateMainPots` are hand-written and **unverified until staging**.

| Priority | Item | Note |
| --- | --- | --- |
| High | Cross-household reference on write (pre-existing) | `transaction.service.ts`, `fixed-cost.service.ts`, `sort-rule.service.ts` take a jar/category id from the client via `em.getReference` / `findOneOrFail` without a household check; a member who knows another household's id can attach own rows to it. Resolve through `HouseholdScopedRepository`. Found by the security review; not introduced by step 2 |
| High | Staging check after deploy | No household onboarded in the window between migration and new backend with a split that is not 100%; turn pots on/off in two tabs; split save during an activation |
| Medium | Given confirms | `OPTIONAL_JAR_SHARE` (Daily 20, Goals 6, Investing 5, Learning 5, Giving 5); Coach tips `basics-high` / `future-low`; MEMBER may turn pots on/off (same as the split); sweep rule "Basics surplus → Investing" when Investing is off |
| Medium | Step 3 | Buffer fills first; "Moet dit, of kies je dit?"; Basics derived from real fixed costs; category tags |
| Medium | Bill preset for an optional pot that is off | `fixed-cost.service.ts` ~515: an Education bill preset resolved to Future's main pot is refused (pot takes no bills) — decide whether Buffer may carry bills |
| Low | `packages/utils` `coach-readiness.test.ts:69` fails (pre-existing) | asserts `GROWTH_TIP_PRODUCERS` is backlog, code has SHIP; makes root `pnpm test` red |
| Low | Dead copy and constants | old `features.coach.split_tips.*` keys, `features.brand.auth_manifesto.jars.*`, `AUTH_MANIFESTO_JAR_VISUALS` / "Six jars" in `packages/ui` AuthManifesto, `DEFAULT_JAR_SPLIT` (deprecated), `.claude/rules/frontend.md` "six jars" |
| Low | Guide card for a lone main pot | shows the key's guide, not the group purpose; `giving-finder.tsx:262` hard-codes the Give key; NL `guides.LONG_TERM_SAVINGS.links.goals` says "Doelstellingen" |
| Low | Archive restore | warning `goal_give_pot_missing` has no translated text yet; restore is still not transactional |
