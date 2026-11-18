# Traps already hit

Do not re-learn these. Full context: [`HANDOFF.md`](../../HANDOFF.md) §11.

---

| Trap | Rule |
|---|---|
| `@orpc/*` is ESM-only | Backend must be ESM-compatible; contracts ship dual CJS+ESM. No CommonJS `require()` path. |
| Bundlers strip `"use client"` | `packages/contracts` re-attaches it in `scripts/add-use-client.mjs`. |
| Duplicate `fastify` versions | Pin via pnpm override to what `@nestjs/platform-fastify` needs. |
| `AsyncLocalStorage` in a Nest guard | Store is gone before handlers. Use **interceptor** (`HouseholdScopeInterceptor`) wrapping `next.handle()`. |
| Next apps are `"type": "module"` | `next.config.js` needs `export default`, not `module.exports`. |
| String-enum members are nominal | They don’t satisfy contract literal unions — derive DTOs from the contract. |
| Overspent jar UI | Full red meter, **not** empty — empty reads as “no data.” |
| Free open banking | GoCardless Bank Account Data closed to new signups. Prefer **Enable Banking** (restricted production) behind a port; null adapter by default; CSV always-on. Banking adapter must not silently return `[]`. Full detail + pricing: [banking.md](./banking.md). |
| macOS `Downloads` TCC / `com.apple.macl` | Attributes follow copies into `design/`. Clear with `xattr -cr` or `ditto --norsrc`. Historical — `design/` is readable now. |

---

## Related

- [Architecture](./architecture.md)
- [Bank data](./banking.md)
- [HANDOFF](../../HANDOFF.md)
