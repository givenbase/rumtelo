---
name: add-translations
description: Replace hard-coded UI text with next-intl keys and add or curate English-first keys in packages/i18n/translations, Dutch fixes via overrides.ts. Use when adding user-facing copy, fixing hard-coded strings, or correcting a translation.
argument-hint: "[component/feature path or text]"
---

# Add translations

Target: $ARGUMENTS

Rule `.claude/rules/i18n.md` applies. Reference: [`packages/i18n/README.md`](/packages/i18n/README.md).

**Agents:** `i18n-translation-specialist` (keys, NL) → `brand-copywriter` for product voice (jars, goals, household; "information, never shame") → `nextjs-frontend-engineer` to wire them.

## Facts

- English is the source: `packages/i18n/translations/{common,features,pages,ui}/*.ts`.
- **Never edit `packages/i18n/languages/*.json`** — generated.
- `pnpm i18n:gen` needs `DEEPL_API_KEY` (in `packages/i18n/.env`). Without it, es/fr fall back to English; NL comes from cache plus overrides.
- Wrong or missing NL: fix the exact string in `translations/overrides.ts` (locale + dot path).
- After running `pnpm i18n:gen`, revert unrelated `packages/i18n/cache/*` noise before committing.
- Locales come from `Locale` in `@rumtelo/contracts`; EN first, NL second.

## 1. Find hard-coded strings

JSX text, `aria-label`, `alt`, `title`, `placeholder`, toasts, table headers, enum labels.

## 2. Reuse before adding

`grep -rn "Text" packages/i18n/translations` — check `common/` → `features/<product>.ts` → `ui/` → `pages/`.

## 3. Add keys

- Shared term → `common/`; product (money, growth, energy, soul, coach) → `features/`; screen copy → `pages/`.
- snake_case leaf keys, ICU for plurals and variables; same word for the same concept (jar, goal, household, week check, Course — never "plan" for Course keys).
- Dates and money through `Intl` with the locale; no hardcoded month names or currency strings.

## 4. Use them

```tsx
import { useTranslations } from '@rumtelo/i18n';
const t = useTranslations();
t('pages.shell.settings');
```

## Checklist

- [ ] No hard-coded visible text left in the target
- [ ] Keys reused where they exist
- [ ] NL checked; corrections in `overrides.ts`
- [ ] `languages/*.json` not hand-edited; `cache/*` noise reverted

## Definition of done

`pnpm --filter @rumtelo/i18n check-types`, `pnpm check-types`, `pnpm lint` clean. Report keys added/reused and whether `pnpm i18n:gen` ran (and with or without DeepL).
