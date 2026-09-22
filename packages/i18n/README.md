# @rumtelo/i18n

Internationalization for Rumtelo: `next-intl` + TypeScript sources under `translations/` → generated JSON in `languages/`.

**Locale list:** contracts `Locale` in `@rumtelo/contracts` (`common.enums`) — single source of truth. Intl tags are `Lowercase<Locale>`.

## Source of truth

- **Edit copy only** under [`translations/`](./translations/) (`common/`, `ui/`, `features/`, `pages/`).
- **Do not hand-edit** [`languages/*.json`](./languages/) — they are generated.
- After changing `translations/`, run:

```bash
pnpm i18n:gen
```

That rebuilds `languages/en.json`, fills missing keys for other locales from English, then DeepL-translates leaves still identical to EN (`DEEPL_API_KEY` in `packages/i18n/.env`). JSON-only: `pnpm i18n:generate`.

## Usage

```tsx
import { useTranslations } from '@rumtelo/i18n';

const t = useTranslations();
t('pages.shell.settings');
t('features.brand.tagline');
```

Apps load messages via `i18n/request.ts` + `next-intl` plugin (see `apps/application/i18n/request.ts`).

## Status

- **EN source of truth:** `translations/**/*.ts` → `pnpm i18n:gen`.
- **Locales via DeepL:** `pnpm i18n:translate:locales` (or full `pnpm i18n:gen`).
- **Wired:** Application and website UI chrome use `next-intl`.
- **Still EN by design:** `@rumtelo/ui` defaults, API freeform fields, learn catalog merchants, Stripe catalog, throw messages.
