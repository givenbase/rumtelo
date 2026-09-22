# Generated locale files

Do not treat these as the source of truth. Do **not** hand-edit `en.json` / `nl.json` for new copy.

Edit `../translations/**/*.ts`, then:

```bash
pnpm i18n:gen
```

That runs `generate` (rebuild `en.json` + fill missing NL from EN) then DeepL `translate:nl` for leaves still identical to English. Existing Dutch overrides are kept; do not paste new strings into JSON by hand.

JSON-only (no DeepL): `pnpm i18n:generate`.
