# @rumtelo/application

The authenticated product. Next.js 16 (App Router, Turbopack), React 19,
**Tailwind v4 only** — no CSS modules, no SCSS.

`app/globals.css` only imports `@rumtelo/config/tailwind/globals.css`; design
tokens live in `packages/config/tailwind/theme.css`.

**Data:** screens use live oRPC queries (`useLiveQuery` from `@rumtelo/hooks`,
or `useQuery(api.<domain>.<procedure>.queryOptions({ input }))`). There are no
mock fixtures.

**i18n:** next-intl via `@rumtelo/i18n` (EN source; NL/ES/FR generated).
`localePrefix: 'never'` — the `[locale]` segment exists in the file tree, not in URLs.

**Layout:**

```
app/
  (routes)/[locale]/
    (auth)/                 sign-in, sign-up, verify, invite
    onboarding/             start, create
    (app)/(household)/      product/{money,growth,energy,soul,coach,why}, settings, banking
    (app)/practice/         B2B Practice shell (clients, staff, billing, settings)
    (app)/@modal/           intercepted create/update modals
  _components/{layout,features}/   shared app composition
  _lib/ _utils/                    app-wide helpers
```

Route-local code sits next to the page in `./_components/` and `./_utils/`.
Patterns: `.cursor/rules/react-next-patterns.mdc`.

```bash
pnpm --filter @rumtelo/application dev   # :3000
```
