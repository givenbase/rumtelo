# PR gates — agent checklist

Use before merge. Agents are thin; this is the shared bar.

| Gate | Command / check | Agent owner |
|------|-----------------|-------------|
| React islands / forms | Pattern review (`useForm` for submits; Provider/`apiQuery` for shared remote data) + `pnpm lint` | nextjs-frontend / standards-enforcer |
| Contracts | `pnpm --filter @rumtelo/contracts check-types` | nestjs / standards |
| Entities | `pnpm --filter @rumtelo/backend lint:entities` | postgres |
| i18n | Edit `packages/i18n/translations/` only + `pnpm --filter @rumtelo/i18n generate` | i18n-translation |
| a11y | Labels on icon-only; real `<button>`; no `aria-pressed` on `Link` | wcag |
| Security | No cross-household R/W; `CAPABILITIES.*` | security / iam |
| Money | Integer minor units only | nestjs / qa |

Soft review (settings/forms): flag `useState` named `*Draft` / `*Password` — prefer `useForm`.

See also: `.cursor/rules/react-next-patterns.mdc`, `CLAUDE.md`.
