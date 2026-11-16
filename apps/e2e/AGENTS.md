# E2E (`apps/e2e`) — agent guide

Guide for any AI agent working here (Claude Code loads it through `CLAUDE.md` in this folder). It links to the real docs instead of copying them.

## 1. What this app is and who uses it

Playwright end-to-end tests for the application, run as seeded demo personas (Basic, Plus, Max, Practice). Used by QA and CI ([`e2e-smoke.yml`](/.github/workflows/e2e-smoke.yml), manual dispatch, staging only — never production) to prove sign-in, plan gating and the practice flow work against a real backend.

## 2. Stack and how to run/check it

Playwright (Chromium, one worker, `en-US`, `Europe/Amsterdam`), config in [`playwright.config.ts`](/apps/e2e/playwright.config.ts). Targets come from `APP_URL` / `BACKEND_URL` ([`shared/env.ts`](/apps/e2e/shared/env.ts)); personas and overrides in [`.env.example`](/apps/e2e/.env.example).

There is no local DB, so runs need a deployed, seeded target (staging) or a reachable local stack pointed at one.

| Task | Command |
|------|---------|
| Install browser | `pnpm --filter @rumtelo/e2e install:browsers` |
| All | `pnpm test:e2e` |
| Tagged | `pnpm test:e2e:smoke` · `pnpm test:e2e:plan` · `pnpm test:e2e:practice` |
| UI / headed / report | `pnpm --filter @rumtelo/e2e test:ui` · `test:headed` · `report` |
| Type check | no `check-types` script in this package; `pnpm lint` (oxlint + oxfmt) covers style only |

## 3. Map

- `modules/application/specs/{smoke,plan,practice}/` — specs, tagged `@smoke` / `@plan` / `@practice`.
- `shared/auth/` — sign-in helpers per persona; `shared/fixtures/`; `shared/practice/`; `shared/locale-en.ts` — EN strings used in selectors.
- Seed personas: `apps/backend/src/database/seeders/` (demo household seeder).

## 4. Rules that apply here

Always on: [`workflow.md`](/.claude/rules/workflow.md), [`rumtelo-context.md`](/.claude/rules/rumtelo-context.md), [`team-workflow.md`](/.claude/rules/team-workflow.md). Frontend selectors follow [`frontend.md`](/.claude/rules/frontend.md).

- Only seeded demo personas; never real accounts. Do not repeat persona passwords in reports.
- Prefer role / label selectors; text from `shared/locale-en.ts` or the EN translations.
- Each spec leaves the household as it found it (or uses data it created).
- Never point e2e at production.

## 5. Recommended agents for this app

| Kind of work | Agents | Skill |
| --- | --- | --- |
| New or expanded specs | `qa-test-engineer` | `write-tests` |
| Flaky spec, wrong selector | `qa-test-engineer` → `nextjs-frontend-engineer` | `fix-bug` |
| Plan / role / practice access checks | `qa-test-engineer` → `security-reviewer` | `write-tests` |
| a11y checks inside flows | `wcag-compliance-auditor` | — |

## 6. Definition of done

`pnpm lint` clean (and `pnpm check-types` for any app code touched); spec tagged; it passes against staging after Given pushes (report it as **not yet run** until then).

## 7. Known gotchas

- The practice invite outbox needs memory email + Swagger enabled on the target (see `.env.example`).
- `retries` is 1 locally and 2 on CI; a pass after retry is still flaky — fix it.
- Staging runs `NODE_ENV=production`: Energy and Soul are deferred, so specs must not expect them there.
- `playwright-report/` and `test-results/` are output; do not commit them.
