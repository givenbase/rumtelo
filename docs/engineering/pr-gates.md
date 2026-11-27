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

## What CI runs for you

`.github/workflows/ci.yml` runs on every pull request and every push to `dev` / `main`, without secrets or a database:

| Step | Command |
|------|---------|
| Contracts build | `pnpm --filter @rumtelo/contracts build` |
| Lint, format, entity lint, types | `pnpm lint:check` (includes `pnpm check-types`) |
| Unit tests | `pnpm test --filter='!@rumtelo/e2e'` — backend Vitest, utils + i18n node:test |
| Contracts node tests | `cd packages/contracts && ../../apps/backend/node_modules/.bin/tsx --test 'src/**/*.test.ts'` |
| Application node tests | `cd apps/application && ../backend/node_modules/.bin/tsx --test 'app/**/*.test.ts'` |
| Compile | `pnpm --filter @rumtelo/application build`, `pnpm --filter @rumtelo/website build` |

Run the same commands locally before a commit. Plain `pnpm test` also starts Playwright (`@rumtelo/e2e`), which needs browsers and a running target — use the filter. CI does not cover the review gates in the table above, UI behaviour, migrations or e2e; those stay with the agents and with Given on staging. The run does not block a Railway deploy unless the check is made required (`.github/workflows/README.md`).

Soft review (settings/forms): flag `useState` named `*Draft` / `*Password` — prefer `useForm`.

Route co-location: non-page files beside `page.tsx` / `layout.tsx` belong in `_components` or `_utils` — see `.claude/rules/frontend.md`.

See also: `.claude/rules/frontend.md`, `CLAUDE.md`.
