---
name: write-tests
description: Plan and write high-value Rumtelo tests - Vitest for backend services, node:test for contracts/utils/application helpers, Playwright for e2e against seeded demo personas. Use when asked to add tests, raise coverage, or test a feature or fix.
argument-hint: "[file, module, or 'changed']"
---

# Write tests

Target: $ARGUMENTS (if `changed` or empty: `git diff --name-only origin/dev...HEAD` plus uncommitted changes).

**Agents:** `qa-test-engineer` (lead); `nestjs-backend-engineer` / `nextjs-frontend-engineer` for unit tests next to their code.

Copy the style of the nearest existing test.

## Plan (before writing)

Rank scenarios by value:

1. Business rules in services and pure helpers — jar splits, rounding remainder, debt avalanche/snowball, goal pace, course period/schedule rules, plan gates.
2. Sad paths — not found, forbidden, invalid input, **cross-household read/write refused**.
3. Wire mapping — entity → contract shape (no dropped fields, enums correct, money stays integer minor units).
4. UI behaviour users rely on — via e2e, since the apps have no component test runner.

Skip framework glue and trivial getters.

## Where tests go

| Kind | Tool | Location | Run (verified) |
|------|------|----------|-----|
| Backend unit/service | Vitest | `*.spec.ts` beside the code | `pnpm --filter @rumtelo/backend test` |
| Contracts | `node:test` | `packages/contracts/src/**/*.test.ts` | `cd packages/contracts && ../../apps/backend/node_modules/.bin/tsx --test 'src/**/*.test.ts'` |
| Utils / i18n | `node:test` | `src/**/*.test.ts` | `pnpm --filter @rumtelo/utils test` · `pnpm --filter @rumtelo/i18n test` |
| Application pure helpers | `node:test` | `app/**/*.test.ts` | `cd apps/application && ../backend/node_modules/.bin/tsx --test 'app/**/*.test.ts'` |
| End-to-end | Playwright | `apps/e2e/modules/application/specs/{smoke,plan,practice}` (tags `@smoke` `@plan` `@practice`) | `pnpm test:e2e:smoke` etc. — needs a running, seeded target (`APP_URL`, `BACKEND_URL`); staging via `e2e-smoke.yml` |

Contracts has no `test` script and no own `tsx`; the command above borrows the backend's. E2E personas and overrides: [`apps/e2e/.env.example`](/apps/e2e/.env.example).

## Quality bar

- Deterministic: fixed dates, no real network, no order dependence.
- Each test builds its own data; only seeded demo personas, never real people or real bank data.
- Assert behaviour, one reason to fail, descriptive names (`refuses a jar read from another household`).

## Definition of done

- New tests pass and fail when the logic under test is broken (sanity check).
- `pnpm check-types` and `pnpm lint` clean.
- Report the scenario list with which are covered, and which need staging (e2e) to run.
