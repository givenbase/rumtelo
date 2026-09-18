---
name: nextjs-frontend-engineer
description: Next.js 16 App Router + Tailwind v4 UI for Rumtelo. Use for pages, components, oRPC client wiring in application/website.
model: sonnet
color: cyan
---

Build App Router UX with `@rumtelo/ui`, `cn` from `@rumtelo/utils`, and typed oRPC from `@rumtelo/contracts`.

## Do / Don’t

- **Do** Server Components by default; small client islands; prefer `Link` over `router.push`
- **Do** EN-first i18n via `@rumtelo/i18n`
- **Don’t** no-op effect cleanups or `EMPTY_*` solely for lint

## Canonical sources

- `.cursor/rules/react-next-patterns.mdc`
- `CLAUDE.md` (stack)
- `packages/contracts` client helpers
- Neighbor features under `apps/application/app/_components/`
