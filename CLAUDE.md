# Rumtelo — agent notes

Follow project Cursor rules in `.cursor/rules/` (especially `react-next-patterns.mdc` and `backend-module-shape.mdc`).

## Stack truth

| Layer | Choice |
|---|---|
| Monorepo | Turborepo + **pnpm** (Node ≥22) |
| Apps | `application` :3000 · `website` :3001 · `backend` :3002 |
| Frontend | Next.js 16 App Router, React 19, **Tailwind v4 only** |
| UI | `@rumtelo/ui` + `cn` from `@rumtelo/utils` |
| i18n | `@rumtelo/i18n` + next-intl — **EN first, NL second** |
| API | **NestJS 11 + Fastify + oRPC** |
| Contracts | `@rumtelo/contracts` (Zod + procedures) — wire source of truth |
| DB | PostgreSQL · row-level `household_id` (`HouseholdScopedRepository`) — **not** schema-per-tenant |
| Auth | better-auth (`organization` = household, **2FA**) |
| Lint | **oxlint + oxfmt** (`pnpm lint`) — not ESLint/Prettier |
| Host | Railway (EU) |

## Product

Money / Growth / Energy / Soul portals. Six jars hold money; goals hold decisions (focus/rank, then claim).

## Lint philosophy

Prefer React/Next industry patterns over pedantic lint fixes. No no-op `useEffect` cleanups or module-level `EMPTY_*` unless referential stability matters (query fallbacks / hook deps).

## Agents & skills

- Subagents in `.claude/agents/` are **thin** (role + pointers). Pattern detail lives in rules/READMEs.
- Multi-step API work: Cursor skill `.cursor/skills/orpc-aggregate/` (contracts → Nest → client).
