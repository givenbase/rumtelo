# Generated locale files

Do not treat these as the source of truth. Do **not** hand-edit JSON for new copy.

Edit `../translations/**/*.ts`, then:

```bash
pnpm i18n:gen
```

That runs `generate` (rebuild `en.json` + fill missing keys for every non-EN locale) then DeepL `translate:locales` for leaves still identical to English. Existing overrides are kept.

JSON-only (no DeepL): `pnpm i18n:generate`.
