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
| New Postgres enum value in a migration | `alter type … add value` cannot be used in the same transaction (MikroORM runs pending migrations in one master transaction): the value is "unsafe to use" until commit. Put it in its own migration with `isTransactional(): false` and `add value if not exists`; rows that use it go in the next migration (`Migration20261123100000_JarKeyDailyGoals`). Postgres cannot drop enum values, so `down()` leaves them. |
| Stored pot name baked into text | A pot's name depends on its group and on whether it is refined (“Basics” alone, “Fixed costs” once refined) and households can rename it. Resolve the name by `JarKey` at render time (`resolvePotName` in the application); never interpolate `jar.name` into a stored or server-composed sentence. Two backend Coach lines still do (`docs/BACKLOG.md`). |
| A computed balance priced at today's split or income | A running figure (a pot's "saved") that multiplies *months × today's allocation* re-prices the whole past every time the split or income changes (it did, until `money_jar_share`). Store the history (share per pot per month, income per month) and price each month at its own values (`jar-share.util.ts`, `cumulativeDepositsByPot`); a household that never changed anything must read the same numbers as before. Months before the first income count 0. |
| Assuming a household has six pots | A household has 3 to 8. Optional pots (`DAILY`, `GOALS`, `FINANCIAL_FREEDOM`, `EDUCATION`, `GIVE`) may be absent; resolve writes with `resolveJarKeyForHousehold`, never look a pot up by key and assume it exists. |
| Free open banking | GoCardless Bank Account Data closed to new signups. Prefer **Enable Banking** (restricted production) behind a port; null adapter by default; CSV always-on. Banking adapter must not silently return `[]`. Full detail + pricing: [banking.md](./banking.md). |
| macOS `Downloads` TCC / `com.apple.macl` | Attributes follow copies into `design/`. Clear with `xattr -cr` or `ditto --norsrc`. Historical — `design/` is readable now. |

---

## Related

- [Architecture](./architecture.md)
- [Bank data](./banking.md)
- [HANDOFF](../../HANDOFF.md)
