# @rumtelo/i18n

Internationalization for Rumtelo: `next-intl` + TypeScript sources under `translations/` → generated JSON in `languages/`.

## Source of truth

- **Edit copy only** under [`translations/`](./translations/) (`common/`, `ui/`, `features/`, `pages/`).
- **Do not hand-edit** [`languages/*.json`](./languages/) as the long-term workflow — they are generated. A one-time Dutch seed may exist until DeepL is wired.
- After changing `translations/`, run:

```bash
pnpm i18n:gen
```

That rebuilds `languages/en.json`, fills **missing** NL keys from English, then translates leaves still identical to EN via DeepL (`DEEPL_API_KEY` in `packages/i18n/.env`). For JSON-only sync without DeepL: `pnpm i18n:generate`.

## Usage

```tsx
import { useTranslations } from '@rumtelo/i18n';

const t = useTranslations();
t('pages.shell.settings');
t('features.brand.tagline');
```

Apps load messages via `i18n/request.ts` + `next-intl` plugin (see `apps/application/i18n/request.ts`).

## Status

- **EN source of truth:** `translations/**/*.ts` → `pnpm i18n:gen` rebuilds `en.json`, fills missing NL from EN, then DeepL-translates identical leaves.
- **NL via DeepL:** `pnpm i18n:gen` fills missing keys then translates leaves still identical to EN. Existing Dutch in `nl.json` is kept. Standalone: `pnpm i18n:translate:nl`.
- **Wired:** Application and website UI chrome use `next-intl` (`useTranslations` / `getTranslations`).
- **Still EN by design:** `@rumtelo/ui` defaults, API freeform fields, learn catalog merchants, Stripe catalog, throw messages.

## Scope

**In scope:** next-intl routing helpers, locale metadata, common action/status/message, ui button/form, Rumtelo brand + auth + shell/onboarding/dashboard. **EN first, NL second.** Optional DeepL fill for `nl.json`.

**Out of scope:** POS, shop, checkout, student portal, admin commerce, i18next mobile stacks, healthcare vocabulary.
