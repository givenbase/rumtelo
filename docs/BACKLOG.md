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
| 4 | **Customer clarity audit** — run the `product-audit` skill on onboarding, home, Money, Course and the website landing; feed findings back here. | High | M | [`.claude/skills/product-audit/SKILL.md`](/.claude/skills/product-audit/SKILL.md) |
| 5 | **Stale "coming soon" copy** — "Extra seats are coming soon" while Stripe household seat add-ons exist; review other "coming soon" strings (bank connect, CHF, account deletion, wearables). | Medium | S | `packages/i18n/translations/pages/settings.ts` |
| 6 | **Fix failing node tests** — `@rumtelo/utils` and `@rumtelo/i18n` each have 1 failing test (2026-11-16 run). | Medium | S | `pnpm --filter @rumtelo/utils test`, `pnpm --filter @rumtelo/i18n test` |

## Next

| # | Item | Priority | Size | Details |
| --- | --- | --- | --- | --- |
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
