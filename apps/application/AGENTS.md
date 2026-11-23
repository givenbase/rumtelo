# Application (`apps/application`) — agent guide

Guide for any AI agent working here (Claude Code loads it through `CLAUDE.md` in this folder). It links to the real docs instead of copying them. Human docs: [`README.md`](/apps/application/README.md) (partly stale; code wins).

## 1. What this app is and who uses it

The authenticated Rumtelo product: Money (pots in three groups — Basics, Future, Free — three by default, up to eight; inbox, fixed costs, goals, debts, week check, month score), Growth (Course), Energy, Soul, the Coach, household settings and the Practice portal. Used by household members (full or viewer), on Basic / Plus / Max plans, and by practices (coaches, advisors) looking along with clients. Every screen shows one household's data, filtered by role, plan and visibility.

## 2. Stack and how to run/check it

Next.js 16 App Router (Turbopack dev, webpack build), React 19, **Tailwind v4 only**, `@rumtelo/ui` + `cn` from `@rumtelo/utils`, next-intl via `@rumtelo/i18n`, TanStack Query over the oRPC client. Port **3000**; backend **3002**.

The backend and DB live on Railway staging (`dev` branch); there is no local DB, so a local dev server only works against a reachable backend.

| Task | Command |
|------|---------|
| Type check (runs `next typegen`) | `pnpm --filter @rumtelo/application check-types` (all: `pnpm check-types`) |
| Lint + format + types (fixes) | `pnpm lint` · read-only: `pnpm lint:check` |
| Pure-helper tests (`node:test`) | `cd apps/application && ../backend/node_modules/.bin/tsx --test 'app/**/*.test.ts'` |
| Build | `pnpm --filter @rumtelo/application build` — fails locally only on missing env; a clean compile step is the signal |
| Dev | `pnpm dev:app` (with backend) or Browser pane `application` from `.claude/launch.json` |
| E2E | see [`apps/e2e/AGENTS.md`](/apps/e2e/AGENTS.md) |

## 3. Map

- `app/(routes)/[locale]/(auth)/` — sign-in, 2FA, reset.
- `app/(routes)/[locale]/(app)/(household)/product/{money,growth,energy,soul,coach,why}` — the four portals + Coach.
- `app/(routes)/[locale]/(app)/(household)/{settings,banking}` and `(app)/practice/` — settings, bank, Practice portal; `(app)/@modal` — intercepted create/edit modals.
- `app/(routes)/[locale]/onboarding/` — household onboarding.
- `app/api/{backend,auth}` — same-origin proxies to Nest (oRPC, better-auth).
- `app/_lib/api.ts` (`api`) and `app/_lib/api-hooks.ts` (`apiQuery`) — the only way to call the backend; other `_lib` files are domain helpers (jar, goal, course, coach, plan, routes).
- `app/_components/{layout,features}/` — shell and domain composition; route-local `_components/` and `_utils/`.
- `proxy.ts` — Next 16 request proxy; `i18n/` — next-intl request config.
- Tokens: `packages/config/tailwind/theme.css`; primitives: [`packages/ui/README.md`](/packages/ui/README.md).
- Product docs: [`docs/product/`](/docs/product/overview.md), [`docs/explain/`](/docs/explain/README.md).

## 4. Rules that apply here

Always on: [`workflow.md`](/.claude/rules/workflow.md), [`rumtelo-context.md`](/.claude/rules/rumtelo-context.md), [`team-workflow.md`](/.claude/rules/team-workflow.md). Path rules: [`frontend.md`](/.claude/rules/frontend.md), [`i18n.md`](/.claude/rules/i18n.md). Also [`.cursor/rules/react-next-patterns.mdc`](/.cursor/rules/react-next-patterns.mdc) and [`docs/engineering/pr-gates.md`](/docs/engineering/pr-gates.md).

- **Wire types** from `@rumtelo/contracts`; never redeclare a shape.
- **State:** submits → `useForm` + `zodResolver`; shared remote data → Provider + `apiQuery`; UI flags → `useState`.
- **Styling:** Tailwind utilities on tokens only — no CSS files, modules or inline `style`; `cn` for conditional classes.
- **i18n:** no hard-coded visible text; EN first, NL second; dates and money through `Intl`.
- **Money** shown from integer minor units via the locale formatter.
- **Server Components by default**; small client islands.

## 5. Recommended agents for this app

| Kind of work | Agents (in order) | Skill |
| --- | --- | --- |
| New screen or flow | `product-manager` → `ux-ui-designer` → `nextjs-frontend-engineer` → `wcag-compliance-auditor` → `qa-test-engineer` | `backend-feature` if the API changes |
| Copy, labels, NL | `brand-copywriter` → `i18n-translation-specialist` | `add-translations` |
| Phone / tablet layout | `responsive-ui-engineer` → `wcag-compliance-auditor` | `responsive-pass` |
| Bug, wrong value, empty screen | `nextjs-frontend-engineer` → `qa-test-engineer` | `fix-bug` |
| Slow page, refetch storms | `performance-engineer` | — |
| Customer clarity of a surface | `product-manager` + `ux-ui-designer` + `brand-copywriter` | `product-audit` |
| Auth, household switch, plan gates, practice access | `nextjs-frontend-engineer` → `security-reviewer` | — |

## 6. Definition of done

```bash
pnpm check-types
pnpm lint
pnpm --filter @rumtelo/application build   # compile step must pass; env errors after it are OK locally
```

Plus helper tests where logic changed, no hard-coded copy, checked at 375 px, labels on icon-only controls, and QA sign-off.

## 7. Known gotchas

- Overspent jar = full red meter, never empty (empty reads as "no data").
- `"use client"` is re-added to contracts by `scripts/add-use-client.mjs`; a stale `packages/contracts/dist` gives odd type or hook errors — rebuild contracts.
- `next.config.js` is ESM (`export default`).
- Staging runs `NODE_ENV=production`, so Energy + Soul are deferred there (`app/_lib/launch-products.ts`).
- Stable empty fallbacks only where they feed query fallbacks or hook deps; no no-op effect cleanups.
- Growth planner is **Course** (`course` keys and routes), never `plan`.
