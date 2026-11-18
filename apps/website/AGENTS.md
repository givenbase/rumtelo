# Website (`apps/website`) — agent guide

Guide for any AI agent working here (Claude Code loads it through `CLAUDE.md` in this folder). It links to the real docs instead of copying them. Human docs: [`README.md`](/apps/website/README.md).

## 1. What this app is and who uses it

The public Rumtelo marketing site and acquisition funnel: landing, pricing / plan intent, legal, support, sign-up, email verify, forgot / reset password, and household and practice invite landings. Used by prospects (see [`docs/product/audience.md`](/docs/product/audience.md)), invited household members and practice clients. After auth, product CTAs go to the application (`NEXT_PUBLIC_DOMAIN_APP`).

## 2. Stack and how to run/check it

Next.js 16 App Router, React 19, **Tailwind v4 only** (same tokens as the application), next-intl via `@rumtelo/i18n`. Port **3001**. Proxies `/api/auth` and `/api/backend` to Nest (server-only `DOMAIN_BACK`).

| Task | Command |
|------|---------|
| Type check | `pnpm --filter @rumtelo/website check-types` (all: `pnpm check-types`) |
| Lint + format + types (fixes) | `pnpm lint` · read-only: `pnpm lint:check` |
| Build | `pnpm --filter @rumtelo/website build` — fails locally only on missing env; a clean compile step is the signal |
| Dev | `pnpm dev:web` or Browser pane `website` from `.claude/launch.json` |

## 3. Map

- `app/(routes)/[locale]/(pages)/` — marketing, pricing, legal, support pages.
- `app/(routes)/[locale]/(auth)/` — sign-up, verify, forgot / reset.
- `app/_components/landing/`, `legal/`, `support/` — page sections; `*-provider.tsx` — sign-up draft, plan intent, household / practice invite state; `staging-banner*.tsx`.
- `app/_lib/` — helpers; `app/api/{auth,backend}` — proxies; `proxy.ts`, `i18n/`.
- Copy: `packages/i18n/translations/pages/{landing,meta,legal,support}.ts`.
- Positioning and voice: [`docs/brand/positioning.md`](/docs/brand/positioning.md), [`docs/product/practice.md`](/docs/product/practice.md) (practice pitch; "Proposed website copy" is not live).

## 4. Rules that apply here

Always on: [`workflow.md`](/.claude/rules/workflow.md), [`rumtelo-context.md`](/.claude/rules/rumtelo-context.md), [`team-workflow.md`](/.claude/rules/team-workflow.md). Path rules: [`frontend.md`](/.claude/rules/frontend.md), [`i18n.md`](/.claude/rules/i18n.md); [`.cursor/rules/react-next-patterns.mdc`](/.cursor/rules/react-next-patterns.mdc).

- Claims must match what the product does today ([`docs/product/overview.md`](/docs/product/overview.md)); no promises for features in Later.
- Prices come from the plan catalog / `plan.util.ts`, not hard-coded copy.
- Tailwind tokens only; `next/image` with `sizes`; Server Components by default.
- EN first, NL second; `meta.ts` for titles and descriptions.

## 5. Recommended agents for this app

| Kind of work | Agents (in order) | Skill |
| --- | --- | --- |
| New page or section | `product-manager` → `brand-copywriter` → `ux-ui-designer` → `nextjs-frontend-engineer` → `wcag-compliance-auditor` | `add-translations` |
| Copy, SEO, NL | `brand-copywriter` → `i18n-translation-specialist` | `add-translations` |
| Customer clarity / funnel review | `product-manager` + `ux-ui-designer` + `brand-copywriter` | `product-audit` |
| Phone / tablet layout | `responsive-ui-engineer` | `responsive-pass` |
| Sign-up, verify, invite bugs | `nextjs-frontend-engineer` → `security-reviewer` → `qa-test-engineer` | `fix-bug` |
| Core Web Vitals | `performance-engineer` | — |

## 6. Definition of done

```bash
pnpm check-types
pnpm lint
pnpm --filter @rumtelo/website build   # compile step must pass
```

Plus no hard-coded copy, metadata set, checked at 375 px, and no claim that contradicts `docs/product`.

## 7. Known gotchas

- `NEXT_PUBLIC_DOMAIN_*` are baked at build time on Railway; a changed domain needs a rebuild.
- Staging shows a banner (`staging-banner.tsx`) with a layout offset — keep the offset when changing headers.
- Auth proxy needs server-only `DOMAIN_BACK` (private Nest URL on Railway).
- Stale "coming soon" strings exist in shared translations (seats, bank connect); check before reusing.
