# @rumtelo/i18n

Internationalization for Rumtelo: `next-intl` + TypeScript sources under `translations/` → generated JSON in `languages/`.

## Source of truth

- **Edit copy only** under [`translations/`](./translations/) (`common/`, `ui/`, `features/`, `pages/`).
- **Do not hand-edit** [`languages/*.json`](./languages/) as the long-term workflow — they are generated. A one-time Dutch seed may exist until DeepL is wired.
- After changing `translations/`, run:

```bash
pnpm --filter @rumtelo/i18n generate
```

That rebuilds `languages/en.json` and fills **missing** keys in other locales from English (no DeepL API calls).

## Usage

```tsx
import { useTranslations } from '@rumtelo/i18n';

const t = useTranslations();
t('pages.shell.settings');
t('features.brand.tagline');
```

Apps load messages via `i18n/request.ts` + `next-intl` plugin (see `apps/application/i18n/request.ts`).

Brand lockups that are not yet on `useTranslations` can import `BRAND_TAGLINE` / `AUTH_QUOTES` — those re-export from the same `translations/` modules.

## Scope

**In scope:** next-intl routing helpers, locale metadata, common action/status/message, ui button/form, Rumtelo brand + auth + shell/onboarding/dashboard. **EN first, NL second.**

**Out of scope:** POS, shop, checkout, student portal, admin commerce, DeepL scripts, i18next mobile stacks, healthcare vocabulary.
