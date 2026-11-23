# Backlog

The one place to find open work. Each row is one item and points to the doc with the details; long specs stay in their own docs. Direction and the "why" live in [`HANDOFF.md`](/HANDOFF.md) §9 (next steps) and §7 (what is real); code wins where they disagree.

**Priority:** Critical · High · Medium · Low. **Size:** S (≤ half a day) · M (1–2 days) · L (≤ a week) · XL (more). Order inside a section: priority first, then quick wins, respecting dependencies.

**Ways of working:** no local DB — `dev` deploys to Railway staging, `main` to production; pushing migrations to `dev` runs `db-migrate.yml`. Claude commits; Given pushes. Hand-written migrations stay "unverified" until they run on staging.

Last updated: 2026-11-23 (Rumtelo Pots sections).

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
- **Decisions for Given:** remove the "Secrets of the Millionaire Mind / T. Harv Eker" book card (`landing-why.tsx`, copy in `pages/landing.ts`) and the footer attribution (`pages/landing.ts`) — being done in the working tree on 2026-11-23, not committed yet; the brand line replacing "Six jars. Ten minutes a week." (`docs/brand/quotes.md`); the Coach tip that names 55% as the default starting point (changes with the default split in step 2); the pot name "Beleggen / Investing".
- **Step 2 (done) and step 3:** the three-pot default, Giving off by default and the must/choose question are built; Buffer that fills first, category tags (ECOICOP, Nibud group, must/choose) and automatic Basis from real fixed costs are open — see the step 2 table below.

## Rumtelo Pots — follow-ups after step 2 (2026-11-23)

Step 2 = three pots by default (55 / 20 / 25), optional pots turned on inside a group. Migrations `Migration20261123100000_JarKeyDailyGoals`, `Migration20261123100100_JarTemplateMainPots` and `Migration20261123120000_JarShare` (pot share history) are hand-written and **unverified until staging**. Staging checklist in order: [`HANDOFF.md`](/HANDOFF.md) §14.

| Priority | Item | Note |
| --- | --- | --- |
| Done (uncommitted) | Cross-household reference on write | Fixed 2026-11-23: `own-reference.util.ts` (`requireOwn*`) resolves every jar, category, debt, fixed cost and bank account id from the client through `HouseholdScopedRepository`; applied to transactions, sort rules, fixed costs, goals and week-check allocations; the device wearer must be a household member. Debt and fixed-cost links are validated before a transaction is written. Verify with the read-only queries in `HANDOFF.md` §14 |
| Medium | Category may belong to another pot of the same household | A category id is checked against the household, not against the chosen pot; a transaction can carry a category of a different pot (security pass) |
| Low | Composite foreign keys `(id, household_id)` | Defence in depth: let the database refuse a cross-household reference even if a service forgets the check |
| Low | Demo passwords in the root `README.md` | Owner to decide whether they belong there; do not copy them anywhere |
| High | Staging check after deploy | No household onboarded in the window between the migration and the new backend (the old backend reads all eight templates, 141%); the backend that reads `money_jar_share` must not start before `Migration20261123120000_JarShare` has run; the rest of the list is `HANDOFF.md` §14 |
| Medium | Given confirms | `OPTIONAL_JAR_SHARE` (Daily 20, Goals 6, Investing 5, Learning 5, Giving 5); Coach tips `basics-high` / `future-low`; MEMBER may turn pots on/off (same as the split); sweep rule "Basics surplus → Investing" when Investing is off |
| Medium | Step 3, what is left | Built (uncommitted): "Moet dit, of kies je dit?" on the fixed-cost form (picks the pot, stores nothing) and the "Basics fit" hint in split settings (a button that fills in the split). Not built: Buffer fills first (options A–D and four open questions in [`split-step3-decisions.md`](/docs/product/split-step3-decisions.md)), category tags, automatic derivation of Basics from real fixed costs |
| Medium | Bill preset for an optional pot that is off | `fixed-cost.service.ts` ~515: an Education bill preset resolved to Future's main pot is refused (pot takes no bills) — decide whether Buffer may carry bills |
| Low | Dead copy keys | old `features.coach.split_tips.*` ids (`play-above-default`, `give-above-default`, … see `split-coach/README.md`) and `features.brand.auth_manifesto.jars.*` are still in `packages/i18n/translations` (`features/coach.ts`, `features/brand.ts`) though nothing renders them. `DEFAULT_JAR_SPLIT` and `AUTH_MANIFESTO_JAR_VISUALS` are gone. `.claude/rules/frontend.md` "six jars" is in the prepared instruction patch |
| Low | Guide card for a lone main pot | shows the key's guide, not the group purpose; `giving-finder.tsx:262` hard-codes the Give key; NL `guides.LONG_TERM_SAVINGS.links.goals` says "Doelstellingen" |
| Low | Archive restore | warning `goal_give_pot_missing` has no translated text yet; restore is still not transactional |
| Medium | "Sweep surplus" is a toggle with no code behind it | Settings → Automation (`automation-settings.tsx`, `AUTO_RULE_KEYS` `split` / `guard` / `sweep` in `settings-shared.ts`): the three switches are component `useState` defaults; nothing is saved and nothing in the backend reads them. Decide: hide the switches or build the rules |
| Medium | Archive restore warnings are never shown | `archive.service.ts` returns `warnings` (`fixed_cost_jar_unmapped`, `goal_give_pot_missing`, `account_reconnect_needed`, …); `import-settings.tsx` stores the result but renders no warning, and no key has translated text |
| Medium | The role interceptor lets unmapped household paths through | `RolePermissionInterceptor` skips any path `permissionSectionFromPath` does not map (a new area is open to a VIEWER until someone maps it). Decide: default-deny for household paths |
| Low | Docs left for the copywriter | `docs/explain/*` scripts (L1-P, L2 Money, L3 Jars, L3 Income) got a short factual correction only; they need a voice pass for "pots". `docs/product/practice.md` pitch texts and `docs/engineering/outreach-pis.md` mails say "six jars" / "zes potjes" in copy that is not ours to rewrite. `docs/demo/demo-2026-11-18.md` (untracked) says "zes potjes". `.claude/**` and `CLAUDE.md` still say "six jars" (needs Given's go-ahead, patch prepared) |
| Low | Code comments and one catalog line still say six | `plan.util.ts:62` ("The six jars — core money model."), `jar.entity.ts:16` and `:55`, `plan.module.ts:9`, `necessities-pressure.ts:5` and `:22` ("Eker envelope", "defaults to Eker 55") |

## Found by the reviews on 2026-11-23 (night) — waiting for Given

| Priority | Item | Note |
| --- | --- | --- |
| High | Practice invite redeem is not OWNER-only (pre-existing) | `practice.service.ts` `redeemClientInvite` (~303–318, 644–654, 816–828) only checks household membership: a VIEWER or MEMBER whose email matches can create a link and reset an ACTIVE link to INVITED (clears `householdAcceptedAt` and the sponsor flag). Fix: `assertHouseholdOwnerOrAdmin` first; never reset an ACTIVE link from redeem. Practice consent — Given decides |
| Medium | Income edits change closed months | Pausing an income without an end date, deleting it, or back-dating `startedOn` / `amountEffectiveFrom` changes pot balances of past months, including closed ones; income writes have no period-lock check and no audit trail. Options: pausing sets `endsOn` to today; end instead of delete; `assertPeriodOpen` on back-dated dates. Money doctrine — Given decides |
| Medium | Share history is not in the export | `money_jar_share` is not in the household export or archive; a restore starts every pot at a baseline. Deletion is covered (cascade). Privacy/GDPR — Given decides |
| Low | A month's income is "as of its last day" | An income that ends on the 15th counts 0 for that month, one that starts on the 15th counts in full; dashboard and month score read "as of today" and can differ from `allocated` in the current month |
| Low | Month boundary uses server time | `currentPeriodKey` uses local server time; on UTC a split saved just after midnight on the 1st (NL time) is dated to the previous month |
| Low | Income amount periods have no cap | one per source per day, back-dating allowed; the balance walk grows with them |
| Low | Deactivating a pot shifts cents in past months | the remainder rule re-runs on fewer pots: up to a few cents per month per pot; the household total stays exact |
| Low | Learn library still lists "Secrets of the Millionaire Mind" | `book.seed-data.ts:43`; a book in a catalog, not a credit for the method — keep or remove |
| Low | Dead i18n keys | `pages.landing.why.books.millionaire_mind.*`, `pages.landing.why.more_books`, old `features.coach.split_tips.*`, `features.brand.auth_manifesto.jars.*` |
