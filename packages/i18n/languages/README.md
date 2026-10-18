# `languages/` — generated locale files

**Do not edit, merge, reorder, or manually add keys in any `*.json` file in this directory.**

These files are build output. They are produced from [`../translations/`](../translations/) by `pnpm i18n:gen`.

- A changed English string in `translations/*.ts` is translated again.
- Unchanged English is reused from [`../cache/`](../cache/).
- A wrong machine translation is corrected in [`../translations/overrides.ts`](../translations/overrides.ts), not here.

Manual edits in this folder are overwritten on the next generation.
