# PR gates — agent checklist

Use before merge. Agents live in `.claude/agents/`; this is the shared bar. Definition of done: `.claude/rules/team-workflow.md`.

| Gate | Command / check | Agent owner |
|------|-----------------|-------------|
| React islands / forms | Pattern review (`useForm` for submits; Provider/`apiQuery` for shared remote data) + `pnpm lint` | nextjs-frontend-engineer |
| Responsive | Phone 360–430 px + tablet ~768 px, long NL strings, no horizontal scroll | responsive-ui-engineer |
| Contracts | `pnpm --filter @rumtelo/contracts check-types` | nestjs-backend-engineer |
| Entities / migrations | `pnpm --filter @rumtelo/backend lint:entities`; hand-written migration + `.snapshot-railway.json`, marked unverified | postgres-database-architect |
| Tests | Acceptance criteria covered; `pnpm test` / targeted Vitest specs green | qa-test-engineer |
| i18n | Edit `packages/i18n/translations/` only; `pnpm i18n:gen` run or approved by Given | i18n-translation-specialist |
| a11y | Labels on icon-only; real `<button>`; no `aria-pressed` on `Link` | wcag-compliance-auditor |
| Security | No cross-household R/W; roles + `CAPABILITIES.*` server-side; Practice consent | security-reviewer |
| Money | Integer minor units only; splits via `money.util.ts` | nestjs-backend-engineer / qa-test-engineer |
| Docs | Docs match behaviour where it changed | docs-release-engineer |

Soft review (settings/forms): flag `useState` named `*Draft` / `*Password` — prefer `useForm`.

Route co-location: non-page files beside `page.tsx` / `layout.tsx` belong in `_components` or `_utils` — see `.claude/rules/frontend.md`.

See also: `.claude/rules/frontend.md`, `CLAUDE.md`.
