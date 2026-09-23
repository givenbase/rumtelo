# Bank data — CSV import, Enable Banking, and moving money

How Rumtelo gets bank transactions into the Inbox. **CSV is always-on. Live PSD2 sync is Enable Banking**, behind a feature flag, not implemented end-to-end yet. **Moving money (PIS) is not on the near roadmap** — see [Moving money](#moving-money--pis-licences-bunq-vs-revolut) for why and for the three routes.

---

## Why we need bank data

The money loop needs ledger rows. Users either:

1. **Upload a bank export** (file import), or
2. **Connect a bank** (open banking / PSD2 account information — AIS)

Rows land as transactions in **Inbox** (`status: INBOX`). The household sorts them into jars — import does not auto-categorise to “perfect money.”

---

## How competitors typically do it

| Pattern | Who | Approach |
|---|---|---|
| Bank-first | Dutch apps like **Dyme** | PSD2 bank koppelen (own DNB licence or partner). Auto-categorise. Re-consent ~every 90 days. Product barely works without connect. |
| Move-the-money | **Flow (Flow Your Money)** | Own DNB licence (AISP + PISP, R166735). Deep **bunq** integration: real IBAN sub-accounts + realtime triggers = salary lands → jars filled. Other banks (incl. **Revolut**) are only "Flow Contacts" — external IBANs they pay *to*; no balance read, Pockets unreachable. Now also sells the rails as **FlowOS** (embedded finance). |
| Sync + files | **YNAB** and similar | Direct Import where an aggregator covers the bank; **CSV / OFX** with column mapping as the reliable fallback. NL coverage is often incomplete — community converters and third-party syncers fill gaps. |
| File-first | Converters / DIY | Bank CSV → map columns → import with dedupe. No aggregator bill; more friction. |

Shared practices: paid plans for bank connect, dedupe on re-import, human review after ingest.

---

## Why not Stripe

Stripe in Rumtelo is **subscriptions / Checkout / Customer Portal** only. It does **not** pull household bank statement history for a budget app. Stripe Financial Connections (where available) is for payout/verification flows — not a Dutch PSD2 statement feed.

---

## Rumtelo strategy

1. **CSV statement import** — always available (Plus capability `moneyImport`). No third-party AIS cost.
2. **Enable Banking restricted production** — owner + friends whitelist their own accounts; free under Enable Banking’s ToS for eval / personal use. Fits early product.
3. **Enable Banking full production** — when any paying customer can connect a bank: commercial contract + quote. Gate behind Plus/Max bank-connect capability.

Chosen aggregator: **Enable Banking** (already stubbed). Port allows swap to Tink / Yapily / TrueLayer later without rewriting transaction persistence.

---

## File formats today

| Format | Status |
|---|---|
| **CSV** | Supported on the backend (`importCsv`). NL/EN header aliases. |
| MT940 / CAMT.053 / OFX / QIF / PDF | **Not** parsed. Banks often offer these on download screens; we do not ingest them yet. |

### CSV mapping

Server-side header aliases only (date/datum, amount/bedrag, description/omschrijving, counterparty/tegenrekening, …) in [`csv-parser.ts`](../../apps/backend/src/modules/public/product/money/ledger/transaction/csv/csv-parser.ts). No upload UI or manual column-map wizard in the app yet; `dryRun` preview exists on the contract but is not wired in the UI (`sample` is empty).

Imported rows: `source: CSV`, amounts in eurocents, SHA-256 dedupe key so re-importing the same statement skips duplicates.

---

## Enable Banking (live sync)

- **Licence / path:** PSD2 AIS via Enable Banking; we do not talk to ING/Rabobank APIs ourselves.
- **NL coverage (major):** ABN AMRO, ING, Rabobank have production AISP. Other Dutch ASPSPs (Volksbank brands, Triodos, etc.) — check [Enable Banking NL docs](https://enablebanking.com/docs/markets/nl/) and their ASPSP list.
- **Consent:** typically expires ~**90 days**; UI must warn before expiry when sync ships.
- **Code:** [`BankingPort`](../../apps/backend/src/banking/banking.port.ts) imports shared DTOs (`BankInstitution`, start-link result) from `@rumtelo/contracts`; provider-only shapes stay on the port. Null adapter by default; [`EnableBankingAdapter`](../../apps/backend/src/banking/adapters/enable-banking.adapter.ts) when `FEATURE_BANK_SYNC` is on.
- **API:** `money.bankSync.*` (status, listInstitutions, startLink, completeLink, syncNow, syncStale, disconnect). Frontend never holds the PEM.

### When transactions refresh

AIS does **not** push every booking. Rumtelo polls:

| Trigger | Where | Behaviour |
|---|---|---|
| **Cron (every 6h)** | Nest `BankSyncScheduler` (`0 */6 * * *`) | Walks every seat with `connectionId`; skips if synced within **30 minutes**; runs each pull inside `householdStorage` |
| **On visit** | Money hub, Transactions (Inbox), Bank settings | `useBankSyncOnVisit` → `bankSync.syncStale` once per mount; same 30‑minute freshness gate; silent if sync is off |
| **Manual** | Bank settings **Sync now** | Always pulls that seat |
| **After Connect** | OAuth return on bank settings | `completeLink` then immediate `syncNow` |

Constants: [`bank-sync.constants.ts`](../../apps/backend/src/modules/public/product/money/ledger/bank-sync/bank-sync.constants.ts) (`BANK_SYNC_CRON`, `BANK_SYNC_STALE_MS`). New Inbox rows use `source: BANK` + dedupe keys (same idea as CSV).

**Consent (~90 days):** when the bank session expires, pulls fail until the user Connects again. UI warning for expiry is still a follow-up.

### Redirect URLs (Control Panel whitelist)

Register **exact** origins+paths (no query string — Enable Banking appends `code` / `state`):

```
http://localhost:3000/settings/product/money/bank
https://app.rumtelo.com/settings/product/money/bank
```

Browser returns to `DOMAIN_APP`; Nest exchanges the code via oRPC. Do **not** whitelist Nest/`DOMAIN_BACK`.

### Env (see `apps/backend/.env.example`)

```bash
FEATURE_BANK_SYNC=false
ENABLE_BANKING_APP_ID=          # UUID — same as .pem filename
ENABLE_BANKING_PRIVATE_KEY=    # PEM contents (quoted; use \n for newlines)
```

When `FEATURE_BANK_SYNC` is on, **both** `ENABLE_BANKING_APP_ID` and `ENABLE_BANKING_PRIVATE_KEY` are required. Keep the flag false until credentials are set; the UI calls `bankSync.status` and only shows the Connect wizard when `enabled` is true.

### Settings UX (Open Banking vs manual)

Bank settings splits hard on `account.connectionId`:

- **Open Banking** — only linked seats, grouped by catalog bank (accordion). Actions: Sync now, Disconnect, **Connect a bank** wizard (institution → seat → `startLink`). Badge is **N linked / None linked**, never “feature flag on”.
- **Manual accounts** — seats with no `connectionId`. Primary seat (`BankAccount.isPrimary`) is the default for CSV labels. No Connect on manual rows in v1.
### Enable checklist

1. Register Sandbox app at Enable Banking; paste the two redirect URLs above.
2. Save App ID + PEM into local `.env` (never commit).
3. Ship adapter + `bankSync` procedures; flip `FEATURE_BANK_SYNC=true` locally.
4. Connect → return to settings → `connectionId` on the seat → Sync.

---

## Pricing

Enable Banking does **not** publish a public price list for unrestricted production. You get a quote for AIS volume, countries, and whether you use their TPP licence.

| Tier | Cost |
|---|---|
| Sandbox | Free |
| Restricted production (whitelisted own accounts) | Free under their ToS for evaluation / personal use |
| **Full production** (any end-user bank link) | **Sales quote only** — [enablebanking.com](https://enablebanking.com) “Get a Quote” |
| Stripe | N/A for bank statements |

**Peer ballparks** (indie writeups for TrueLayer / Yapily-style starters — **not** Enable Banking official): often discussed around **~£150–500/mo** at small volume; Tink tends more enterprise. Order-of-magnitude only.

When you have a real quote (“NL, AIS only, ~N households, no PIS”), replace the ballparks in this doc with that number.

**CSV import:** €0 aggregator cost.

---

## Moving money — PIS, licences, bunq vs Revolut

Everything above is **AIS** (read). "Salary lands → six jars fill *in the bank*" is **PIS** (payment initiation). This section records what we verified in Sep 2026 so we do not re-research it.

### The regulatory wall

| Capability | Who may do it | What Rumtelo has |
|---|---|---|
| Read accounts/transactions (AIS) | Licensed AISP, **or** an agent using an aggregator's licence | Enable Banking — planned, behind `FEATURE_BANK_SYNC` |
| Initiate a payment (PIS) | **PISP licence holder only.** Enable Banking: *"in PRODUCTION, payment initiation is only available to companies holding a PISP license."* | Nothing |
| Move money without per-payment SCA | Bank-specific automation (bunq internal transfers, standing orders). No EU-wide variable recurring payments yet (UK-only VRP). | Nothing |

A PISP licence is a full payment-institution application at DNB: minimum own funds, compliance officer, safeguarding, security audit, ~9–18 months, six-figure cost. Only worth it if moving money becomes the product. Our positioning is **"a coach, not a bank"** — so it is not.

### Revolut — what is and isn't possible

- **Revolut Bank UAB** (the EU entity, NL branch) is in **Enable Banking production: AISP + PISP, SEPA**. No Revolut partnership is needed to *read* a Revolut account.
- Revolut's own Open Banking API is for regulated TPPs only (eIDAS QWAC + QSeal). There is a "Revolut Partners — contact us" path for non-regulated parties; treat it as a long shot.
- **Pockets are not exposed.** `GET /accounts` returns currency sub-accounts (shared IBAN, unique `AccountId`) and `UK.Revolut.InternalAccountId` entries that *cannot receive funds*. Six Rumtelo jars ≠ six Revolut Pockets. Do not promise it.
- Every PIS payment from Revolut needs SCA in the Revolut app. No webhooks for third parties.

**Conclusion:** Revolut is a fine *source* of transactions and a fine *destination IBAN*. It is not a partner for real-money jars.

### bunq — the bank that makes real jars possible

- Up to **25 real IBAN sub-accounts** per user, one fee. Each can be a jar.
- Realtime push on incoming payments (this is what makes Flow instant).
- PSD2 sandbox open; production needs a QSeal certificate (i.e. a licence — ours or an umbrella's). bunq's OAuth for non-TPPs exists but bunq explicitly warns it "may be subject to PSD2" for other users' data — do not build on that.
- Also in Enable Banking coverage for AIS.

If we ever do "real jars", **bunq is the bank**, exactly as it is for Flow.

### Three routes, in order

1. **Now — read, don't move (no licence).**
   Enable Banking AIS for Revolut, bunq, ING, Rabobank, ABN AMRO. Jars stay virtual in the ledger. New product piece: **map a real sub-account (bunq IBAN, Revolut currency account) to a jar**, so the jar balance mirrors the bank. Fits `BankingPort` as-is; needs a `jar ↔ external account` link on the household.
2. **Next — "Split assist" with one tap.**
   Salary lands → Coach computes the split → user approves the transfers in one flow (SCA per payment, bank rules apply). Needs PIS **without our own licence**, via one of:
   - **Agent / licence umbrella** — ask Enable Banking (or Yapily / Tink) whether they onboard a PIS *agent* under their licence, and at what price.
   - **FlowOS** — embed Flow's rails; Rumtelo stays the brain (jars, Coach, energy, soul). Turns the closest NL competitor into infra.
   Whichever says yes first decides the route. Outreach drafts: [outreach-pis.md](./outreach-pis.md).
3. **Later, if ever — full automation, own DNB licence.**
   Only if route 2 proves demand *and* per-payment SCA is what users churn on.

### What this means for copy and trust

- Keep **"Read-only, ever"** in the trust cards and footer until route 2 ships; it is both the honest state and what the licence allows.
- Roadmap card "Live bank sync — PSD2, read-only" stays accurate. Do not add "automatic transfers" anywhere on the site.
- If route 2 ships, the product language is "Rumtelo *proposes*, you *approve*" — never "Rumtelo moves your money".

---

## Code map

| Piece | Location |
|---|---|
| Banking port + adapters | `apps/backend/src/banking/` |
| CSV parse | `…/ledger/transaction/csv/csv-parser.ts` |
| Import API | `TransactionService.importCsv` → `money.transactions.importCsv` |
| Contracts | `packages/contracts` — `ImportCsv` / `ImportPreview` |
| Settings UX | Open Banking vs Manual accounts. Primary = `BankAccount.isPrimary` (one per household). Live link seats: Basic 0 / Plus 2 / Max 6 (`maxBankLinks`; paid extras later) |
| Plan capability | `moneyBank` + `maxBankLinks` for AIS; `moneyImport` for CSV; live connect also gated by `FEATURE_BANK_SYNC` |

Flow:

```
CSV file ──► parseStatementCsv ──► dedupe ──► Transaction (CSV, INBOX)
Bank AIS ──► BankingPort.fetchTransactions ──► Transaction (BANK, INBOX)
                    └──► household sorts in Inbox
```

---

## Product follow-ups (not done)

- CSV **import wizard** UI: pick account → upload → confirm mapping/preview → commit
- Consent-expiry warning UX (~90 days)
- Optional denser cron / shorter stale window once volume is known
- **Jar ↔ external account mapping** (route 1 above): link a bunq IBAN / Revolut currency account to a jar so balances mirror the bank
- Send the two outreach mails in [outreach-pis.md](./outreach-pis.md); record answers (price, agent model yes/no) here
- Optional later: MT940 / CAMT.053 parsers if customers need them beyond CSV

---

## Related

- [Outreach — PIS access](./outreach-pis.md) — draft mails to Enable Banking and Flow/FlowOS
- [Traps](./traps.md) — free open banking trap
- [Money module README](../../apps/backend/src/modules/public/product/money/README.md)
- [HANDOFF](../../HANDOFF.md) §11
