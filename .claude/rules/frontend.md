---
paths:
  - "apps/application/**"
  - "apps/website/**"
  - "packages/ui/**"
  - "packages/hooks/**"
  - "packages/contracts/src/public/product/**/catalogs/**"
  - "apps/backend/src/modules/public/product/**/catalogs/**"
---

# Frontend (Next.js 16 App Router + Tailwind v4)

Prefer patterns the Next.js and React docs endorse. Lint is a hint: keep rules that catch real bugs; don't invent ceremony for pedantic warnings. Primitives: `packages/ui/README.md`.

## Components

- **Server Components by default**; `'use client'` only for hooks, events, browser APIs. Extract a small client island instead of making a page client.
- **`Link` for navigation**; `router.push` only after mutations / programmatic redirects.
- Keys from identity (`id`), not index (static non-reordering grids are fine).
- Effects sync with the outside world; derive UI from props/state otherwise. Clean up only when there is something to clean — never `return () => {}` for lint.
- `useMemo` / `useCallback` only when a memoised child or a real dependency needs stability.
- Stable empty fallbacks (`const EMPTY_X: T[] = []`) only for query fallbacks / hook deps — not to satisfy `no-object-type-as-default-prop`.
- Classnames: `cn` from `@rumtelo/utils`.

## Styling & tokens

- Tailwind utilities only — no CSS files/modules, no inline `style`, no hex. Tokens live in `packages/config/tailwind/theme.css`; apps import `@rumtelo/config/tailwind/globals.css`.
- Use Rumtelo token names: `fg`, `fg-muted`, `fg-secondary`, `surface`, `raised`, `line`, `line-strong`, `accent`, `accent-soft`, `danger`. Shadcn aliases (`foreground`, `border`, `primary`, …) are `var()` aliases — fine to read, don't introduce new ones or parallel palettes.
- Overspent jar = full red meter, never empty (empty reads as "no data").

## Primitives & overlays (`@rumtelo/ui`)

- Dates: `DatePicker` / `Calendar` — never `Input type="date"` / `datetime-local`.
- Menus: `Select` (portal + scroll lock built in). Don't re-skin with local `MENU_CONTENT` / `MENU_ITEM` / `accent/10` constants.
- Suggestion lists: `SuggestionPanel` (Radix Popover `modal`). Inside Sheet/Dialog a hand-rolled `createPortal(…, document.body)` list loses wheel/touch scroll under `RemoveScroll`. Keep focus on the input (`onOpenAutoFocus` preventDefault).
- New floating list → Popover `modal` or an existing primitive, not custom portal + viewport clamp.

## Forms & state

| Job | Pattern |
| --- | --- |
| Any submit fields | `useForm` + `zodResolver` + `@rumtelo/ui` Form / `FormCreateEditShell`; `reset(server)` on edit open, `reset()` on success/cancel |
| Shared submit Zod | One schema module (mirror money `form-zod`) shared by UI and resolver |
| Instant toggle / mutate-on-pick | One `useState` or direct mutation — no fake form |
| UI-only flags | Single `useState` |
| Server lists, search, cache | TanStack + `apiQuery` (+ feature Provider to share in a route tree) |
| Route-tree wiring | React Context Provider |
| App-wide client UI | Provider first; Zustand only when distant trees need one store — never form fields, never a second API cache |
| Cross-route hand-off | Draft Provider / storage → hydrate into `useForm` |

**Banned:** parallel `useState` per form field (`*Draft`, `*Password`); Provider/Zustand holding submit values; `useMutation` + `setHits` for remote search; re-fetching the same `apiQuery` in every child.

## Data

- Application calls the backend through `app/_lib/api.ts` (`api` client, same-origin `/api/backend` proxy with household headers). Wire types and enums come from `@rumtelo/contracts` — never redeclare them.
- Plan and role gates in the UI mirror the server (`app/_lib/capability-access.ts`, `role-permissions.ts`, `launch-products.ts`); the backend still enforces.

## Route co-location

Under `app/(routes)`, segment roots hold only Next entry files (`page`, `layout`, `loading`, `error`, `not-found`, `template`, `default`, `route`) and real segments. Everything else:

| Folder | Holds |
| --- | --- |
| `_components/` | UI, islands, feature Providers, hooks returning JSX, `*-page.tsx` shells |
| `_utils/` | Pure TS: schemas, fixtures, catalogs, label mappers, non-UI hooks |

No `_providers`, `_hooks`, `_schemas`, `_helpers`, `_i18n`, `_locales`. App-wide providers stay in `[locale]/providers.tsx` + `app/_components/features/shell`; cross-feature code in `app/_components`, `app/_lib`, `app/_utils`. Shells: `(app)/(household)/*` → `HouseholdShell`, `(app)/practice/*` → `PracticeShell` (picked by `AppBootGate`).

## Text, a11y, responsive

- No hard-coded user-visible strings (incl. `aria-label`, `alt`, `placeholder`, toasts): `useTranslations()` from `@rumtelo/i18n`; keys in `packages/i18n/translations/` (see `i18n.md`). Dates/currency through `Intl` with the locale.
- Labels on icon-only controls; real `<button>` for toggles; no `aria-pressed` on `Link`; visible focus with accent tokens.
- Mobile-first: phone 360–430 px, tablet ~768 px; `min-w-0` on text-holding flex/grid children; no horizontal page scroll; touch targets ≥ 44 px.

## Catalog edit lock (money / growth forms)

Applies to `app/_components/features/forms/**`, the `{fixed-cost,debt,income,goal,asset,expense}-pages.tsx` routes and the catalogs leaves in contracts/backend.

| Form | Preset key state | Chips | Persist `presetKey`? |
| --- | --- | --- | --- |
| `fixed-cost-form` | `nameLock` (`NameLock`: preset / vendor / other) | Paid-to merchants | Yes |
| `debt-form` | `presetKey` | Lenders via `presetForMerchant` | Yes |
| `income-form` | from name / stored `presetKey` | — | Yes |
| `goal-form` | `goalPresetKey` | Car brands when CAR | No — match name |
| `asset-form` | `presetKey` | — | Yes when possible |

1. **Create:** `PresetNameField` with `lockPresets` + `onSelect` → set preset key, apply jar/category/kind, fill the party field when the pick implies one.
2. **Edit hydrate (render-time, one-shot):** when `mode === 'edit'` and the catalog `query.data !== undefined`, match the saved label with `findByNameOrAlias` (`@rumtelo/utils`), set the key, decide custom vs chip, flip a `*Hydrated` flag. No effect; always gate on `!*Hydrated`.
3. **Lock UI:** `initialLockedKey={presetKey}` so edit shows the chip.
4. **mapRow** passes every id the form needs (`categoryId`, `kind`, `presetKey`, …).
5. **New name catalog:** `aliases` on the Zod preset; list handler returns `aliasesFor…Preset(key, name)`.
6. **Vendor picked as name:** `resolveVendorPresets(presets, merchant.key, prefer?)` — one → lock it; several → keep vendor name + `CatalogCandidateChips`; none → vendor name only. Always fill Paid-to / lender. Same helper on create and edit.
7. **Mixed picker:** keep `NameLock` typed (`nameLockFromOptionKey` / `nameLockToOptionKey` in `merchant-name-options.ts`); the `merchant:` prefix never leaks into state/JSX; badges "Vendor" vs "Bill type".

Don't: match with raw `===` or locale-only `findByName`; invent a second "paid to"/lender autocomplete (reuse `CatalogChipPicker` + `merchantKeys`); store vendor keys in preset state or pick the first linked preset; derive the payee from the lock at render time.

## Auth aside — Setup 1 (`auth-aside.tsx`, `packages/ui/src/display/AuthManifesto/`)

Locked unless Given asks: full-bleed background video (no card or black wash); slim bottom strip with the **four portals** by default and the **three pot groups at 55 / 20 / 25** (Basics · Future · Free) on website sign-up. Still iterating: the quote block above the strip — manifesto headline (teal eyebrow, hairline, large display), not caption bars. Website quotes = marketing door (`AUTH_QUOTES_WEB`); application quotes = habit (`AUTH_QUOTES_APP`). "Go back to setup 1" = video + quote block + strip.

## PR self-check

Would I still write this if the lint rule didn't exist? Are non-page files under a route segment in `_components` or `_utils`?
