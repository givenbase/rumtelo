# Workflow & code standards (always on)

## Current stack (trust this over older docs)

- **Backend:** NestJS 11 + Fastify (pinned `5.11.3` via pnpm override), oRPC 1.13 (`@orpc/nest` — `@Implement` + `implement().handler`), MikroORM 7 (`@mikro-orm/decorators/legacy`) + PostgreSQL, better-auth (`organization` = household, `twoFactor`). Backend is ESM.
- **Contracts:** `@rumtelo/contracts` — Zod 4 schemas + oRPC procedures, dual CJS+ESM; enums, capabilities and plan catalog live here.
- **Frontend:** Next.js 16 App Router, React 19, Tailwind v4, next-intl 4, `@rumtelo/ui`, TanStack Query via `apiQuery`.
- **Tooling:** pnpm 10 + Turborepo, oxlint + oxfmt (not ESLint/Prettier), Vitest in the backend, node:test in `utils`/`i18n`, Playwright in `apps/e2e`.
- The package is MikroORM `^7.2`; `apps/backend/AGENTS.md` still said "MikroORM 6" (fixed in the same patch).

## Package & runtime

- pnpm only. Ask before adding a dependency; prefer internal packages (`@rumtelo/ui`, `@rumtelo/utils`, `@rumtelo/hooks`, `@rumtelo/contracts`).
- Pinned: Node ≥ 22.17, pnpm 10.x, TypeScript 5.9.x — don't bump casually.

## Changes

- Minimal, reversible patches that follow the nearest neighbour (same feature folder first). No unrelated refactors in the same change.
- No placeholders or TODO stubs in delivered code. Don't remove working code unless replaced, and say so.
- Comment the *why*. Keep the section banners (`// ? CREATE Operations` …) and JSDoc density of the surrounding code.
- Names: no single-letter locals; domain words (`goal`, `debt`, `transaction`, not `g`/`d`/`tx`).
- Library APIs: check official docs (Context7), don't guess.

## Verify before calling it done

There is **no local database**, so agents verify statically. Run what covers your change:

```bash
pnpm --filter @rumtelo/<pkg> check-types      # every touched package (or pnpm check-types)
pnpm lint:check                                # oxlint + oxfmt check + entity lint + types (pnpm lint writes fixes)
pnpm --filter @rumtelo/backend test -- <file>  # Vitest for touched backend code
pnpm --filter @rumtelo/application build       # compile check when routes/config changed (same for website)
```

- Contract change → `pnpm --filter @rumtelo/contracts check-types` and the backend + app type checks that consume it.
- Entity change → `pnpm --filter @rumtelo/backend lint:entities`.
- E2E (`pnpm test:e2e:*`) needs a running target; agents don't run it against staging unless Given asks.
- Report what ran, what passed, and what only staging can verify (UI behaviour, migrations, auth flows).

## Never without Given's explicit permission in this session

- `pnpm i18n:gen` (DeepL quota; rewrites `languages/*.json`).
- Any `db:*` script, `auth:migrate`, seeders, `*:stag` / `*:prod`, `stripe:*`, `sync:github-secrets`, `env:use*`.
- `git push`, PRs, merges.

## Money and personal data

- Money: integer minor units; `money.util.ts` for splits; `MoneyType` columns. Never compute amounts on the client for anything that is stored or billed.
- Household data is only touched through the household context. No personal or financial data in logs, errors, URLs, analytics or fixtures.
