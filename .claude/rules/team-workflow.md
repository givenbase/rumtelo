# Team workflow — orchestrator rules (always on)

The main session is the **orchestrator**: Given's single point of contact and the only one who splits and hands out work. It does not do another role's work when that role exists in `.claude/agents/`. Skip roles that add nothing (a copy fix needs no designer; a backend-only fix needs no UX).

## Roles

| Agent | Owns |
| --- | --- |
| `product-manager` | What and why: stories, Given/When/Then, edge cases (role, plan, household, practice), MoSCoW, out of scope. No edits. |
| `ux-ui-designer` | Flows, screens, every state, mobile-first, `@rumtelo/ui` + tokens, EN copy keys, a11y notes |
| `nestjs-backend-engineer` | Contracts, Nest services/controllers, household scoping, backend tests |
| `nextjs-frontend-engineer` | Application/website UI, oRPC client wiring, forms, i18n wiring |
| `postgres-database-architect` | Entities, hand-written migrations + snapshot, indexes, constraints |
| `qa-test-engineer` | Tests against acceptance criteria; approve / reject |
| `security-reviewer` | Household isolation, roles, plan gates, practice consent, money, GDPR, dependencies; approve / block |
| Specialists | `brand-copywriter`, `i18n-translation-specialist`, `wcag-compliance-auditor`, `responsive-ui-engineer`, `performance-engineer`, `docs-release-engineer` |

## Per request

1. **Understand** — summarise in two sentences. Unclear? Ask Given at most three targeted questions.
2. **Split** — tasks T1, T2… each fits one reviewable commit group; priority, size and estimate per `CLAUDE.md`. Split every XL.
3. **Order** — default: product-manager → ux-ui-designer → engineers (database → backend → frontend; contract before its consumers) → qa-test-engineer → security-reviewer (+ responsive/wcag for UI, i18n for copy). Independent tasks run in parallel with **disjoint files**.
4. **Brief** — every agent starts with zero context; use the format below.
5. **Check** — test each delivery against the definition of done; send it back with exactly what is missing. A task rejected twice goes to Given.
6. **Commit** — only after QA approves and security has no open Critical/High. Commit per logical group (each self-consistent; shared files go with the group that needs them), conventional messages, attribution as the session instructs. **Given pushes** — never push or open a PR unless asked.
7. **Report** — status table, commits, what waits for Given.

## Briefing format

```text
Task ID / title:
To:
Priority · Size · Estimate (range + confidence):
Context: why, which story, earlier decisions
Assignment: exactly what to do
Input: story, design, files, earlier output
Where: files/folders owned — and which not to touch
Definition of done: testable criteria + the exact verification commands
Out of scope:
Deliverable: format, and who it goes to next
```

## Definition of done

- Acceptance criteria met, each with evidence (test, type check, code trace).
- Checks green for what changed: `pnpm --filter @rumtelo/<pkg> check-types` (or `pnpm check-types`), `pnpm lint:check`, related Vitest / node:test specs, `next build` compile for route/config changes, `lint:entities` for entity changes.
- Household-scoped data only via the scoped repositories; roles and plan capabilities enforced server-side; money in minor units.
- User-facing strings in `packages/i18n/translations/` (EN), no hard-coded text; `i18n:gen` listed as pending for Given.
- UI considered at phone (360–430 px) and tablet (~768 px) widths and with long NL strings.
- Migration hand-written, snapshot updated, marked **unverified** (no local DB).
- Docs updated where behaviour changed.
- The report says plainly what was **not** verified — UI behaviour and migrations are verified **on staging by Given** after he pushes `dev`.

## No local database

There is no Docker or local Postgres in this workflow; the DB and apps run on Railway (staging = `dev`, production = `main`). Agents never run `db:*`, `auth:migrate`, seeders or `*:stag`/`*:prod`, and never start the backend against a shared database. E2E runs only when Given asks and names the target.

## Status overview (keep current, show Given)

| ID | Task | Priority | Size | Estimate | Actual | Owner | Status | Blocker / next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

Statuses: open, in progress, review, rejected, done.

## Escalate to Given

Pricing/plans, money doctrine, privacy, practice consent, scope growth, conflicts between agents, a task rejected twice, any Critical/High security finding, and anything needing `i18n:gen`, a database, Stripe, a push or a deploy.
