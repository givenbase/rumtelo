# Bank data — CSV import, Enable Banking, and moving money

How Rumtelo gets bank transactions into the Inbox. **Statement file import (CAMT.053 / MT940 / CSV) is always-on** behind `moneyImport`. **Live PSD2 sync is Enable Banking** (AIS balances + transactions), behind a feature flag. **Moving money (PIS) is not on the near roadmap** — see [Moving money](#moving-money--pis-licences-bunq-vs-revolut) for why and for the three routes.

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
| **CAMT.053** (ISO 20022 XML) | Supported — prefer this when the bank offers it |
| **MT940** (SWIFT `.sta` / `.mt940`) | Supported — legacy fallback while banks still default to it |
| **CSV** | Supported (`importCsv`). NL/EN header aliases |
| OFX / QIF / PDF | **Not** parsed |

Prefer **CAMT.053** in product copy. NL support is broad (Rabobank often defaults to it; ABN, ING, Volksbank, Triodos, Knab also offer it). MT940 remains available on many portals during the ISO 20022 transition.

Samples for local testing:

- [`fixtures/statement-sample-nl.camt053.xml`](./fixtures/statement-sample-nl.camt053.xml)
- [`fixtures/statement-sample-nl.mt940.sta`](./fixtures/statement-sample-nl.mt940.sta)

Detection is automatic (`format: auto` on `money.transactions.importCsv`).

### NL bank download formats (sourced — do not invent)

Facts below are from bank help pages, Nmbrs/Yuki importer docs, bank2ynab configs, and bank/community format notes. Prefer **CAMT.053** when the portal offers it; CSV column lists are what our parser must recognise.

| Bank | Machine formats | CSV notes (when used) | Sources |
|---|---|---|---|
| **ING** | CAMT.053, MT940, CSV | Header (`;`, since ~2020): `Datum;Naam / Omschrijving;Rekening;Tegenrekening;Code;Af Bij;Bedrag (EUR);Mutatiesoort;Mededelingen;Saldo na mutatie;Tag`. Amount absolute + **Af/Bij**. Date `DD-MM-YYYY`. Payee = `Naam / Omschrijving`, memo = `Mededelingen`. | [Nmbrs ING](https://support.yuki.nl/nl/support/solutions/articles/80000787467-ing-bank-exportbestanden), [BankTrans ING format change](https://www.banktrans.nl/forum/9-vragen/2126-wijizging-csv-formaat-van-ing), [bank2ynab NL ING Checking 2020](https://git.data.coop/pedersen/bank2ynab/src/branch/develop/bank2ynab.conf) |
| **Rabobank** | CAMT.053 (common), MT940, CSV | Retail CSV (quoted `,`): `IBAN/BBAN,Munt,BIC,Volgnr,Datum,Rentedatum,Bedrag,Saldo na trn,Tegenrekening IBAN/BBAN,Naam tegenpartij,…,Omschrijving-1,Omschrijving-2,Omschrijving-3,…`. Signed `Bedrag` (`+1000,00`). Date `YYYY-MM-DD`. Payee = `Naam tegenpartij`, memo = `Omschrijving-1`. | [bank2ynab NL Rabobank-2018](https://git.data.coop/pedersen/bank2ynab/src/branch/develop/bank2ynab.conf), [Rabo CSV formaatbeschrijving](https://docplayer.nl/79991077-Formaatbeschrijving-csv-csv-extensie-versie-1-1-rabo-internetbankieren-professional-rabo-online-bankieren.html) |
| **ABN AMRO** | CAMT.053, MT940, **TAB/TXT** (no CSV header) | `TXT*.TAB`: tab-separated, **no header row**. Columns: account, currency, booking date `YYYYMMDD`, start/end balance, value date, signed amount, free-text description (`Naam:` / `IBAN:` inside). XLS export has headers `accountNumber,mutationcode,transactiondate,valuedate,startsaldo,endsaldo,amount,description`. | [abn-amro-statement-parser](https://github.com/denilsonsa/abn-amro-statement-parser) |
| **bunq** | PDF, CSV, MT940 ([help](https://help.bunq.com/en/articles/how-do-i-export-a-bank-statement)) | App CSV sample: `Date,Amount,Account,Counterparty,Name,Description` — signed amount, decimal `,`, date `YYYY-MM-DD`. Desktop export (`;`): `Datum;Bedrag;Rekening;Tegenrekening;Naam;Omschrijving`. | [bunq help](https://help.bunq.com/en/articles/how-do-i-export-a-bank-statement), [bank2ynab sample](https://git.data.coop/pedersen/bank2ynab/src/branch/develop/test-data/2019-03-02_11-50-46_bunq-statement.csv), [bank2ynab NL Bunq](https://git.data.coop/pedersen/bank2ynab/src/branch/develop/bank2ynab.conf) |
| **Revolut personal** | CSV (“Excel” mislabeled), PDF | `Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance`. EN decimals (`.`); datetime `YYYY-MM-DD HH:mm:ss`. Prefer **Completed Date**. | [revolut-toolkit](https://github.com/lastunicorn/revolut-toolkit) |
| **Revolut Business** | CSV, sometimes CAMT.053 | Longer EN headers, e.g. `Date started (UTC),Date completed (UTC),…,Description,Reference,Payer,…,Amount,Fee,Balance,…`. Variants differ by region. | [revolut-to-mt940 issues](https://github.com/gerwin3/revolut-to-mt940/issues/2) |
| **ASN / SNS (Volksbank)** | CAMT.053 (preferred; MT940 **retired**), CSV, PDF | Official CSV fields include: `Datum`, `Je rekening`, `Van / naar`, `Naam`, `Bedrag bij/af` (signed), `Verwerkingsdatum`, `Omschrijving`, `Categorie`, … Date `dd-mm-jjjj`. | [ASN CSV uitleg](https://www.asnbank.nl/web/file?contentid=852&owner=6916ad14-918d-4ea8-80ac-f71f0ff1928e&uuid=e2460173-b844-47ef-bba8-fd37134b3f61), [ASN CAMT](https://www.asnbank.nl/zakelijk/boekhoudpakket-koppelen/camt053.html), [SNS CAMT](https://www.snsbank.nl/zakelijk/zzp/camt053-voor-boekhoudpakketten.html) |
| **Knab** | CAMT.053 (boekhoudexport), CSV | CSV (`;`, header row 2): `Rekeningnummer;Transactiedatum;Valutacode;CreditDebet;Bedrag;Tegenrekeningnummer;Tegenrekeninghouder;…;Omschrijving;…;Boekdatum`. `CreditDebet` = `C`/`D`. | [bank2ynab NL KNAB](https://git.data.coop/pedersen/bank2ynab/src/branch/develop/bank2ynab.conf), [DigiBoox Knab CAMT](https://www.digiboox.app/nl/support/bankimport/knab-bankexport) |
| **Triodos** | Business: CAMT.053 + MT940; retail often PDF/CSV | Prefer CAMT/MT940 for zakelijk. Retail CSV column list **not** confirmed here — do not guess; use CAMT when possible. | [Triodos FAQ formats](https://www.triodos.nl/veelgestelde-vragen/in-welke-bestandstypen-kan-ik-overzichten-downloaden?id=ecea2482a3bc), [Nmbrs Triodos](https://support.yuki.nl/nl/support/solutions/articles/80000786202-triodos-bank-exportbestanden) |

**Not supported yet:** ABN `TXT*.TAB` (headerless TSV), Knab `CreditDebet` C/D as sole sign source if amount is absolute, Triodos retail CSV until we have a real sample.

**Account mismatch (hard block):** dry-run returns `accountMismatch: true` when the CSV dialect (headers or filename, e.g. `nl.revolut`) does not belong on the selected account’s catalog bank — including seats with no CSV dialect of their own (ABN AMRO, N26, Triodos, …). Import button stays disabled; a real import throws `statement_bank_mismatch`. CAMT/MT940 and undetected CSV dialects are not gated.

### CSV mapping

Parser (`csv-parser.ts`) matches **only documented headers** above (exact match first, then longest substring ≥4 chars). Payee columns → `counterparty`; memo/description columns → `description`. Inbox title = `counterparty || description`.

Imported rows: `source: CSV` (file import vs AIS `BANK`), amounts in eurocents, SHA-256 dedupe key so re-importing the same statement skips duplicates.

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

On `completeLink` / each sync, Rumtelo applies the ASPSP account label from Enable Banking (`details`/`product` + holder `name`, e.g. `Betaalrekening · Jamie Lee Rivera`) onto the seat — handmatig nicknames do not win while the account stays linked.

Constants: [`bank-sync.constants.ts`](../../apps/backend/src/modules/public/product/money/ledger/bank-sync/bank-sync.constants.ts) (`BANK_SYNC_CRON`, `BANK_SYNC_STALE_MS`). New Inbox rows use `source: BANK` + dedupe keys (same idea as CSV).

Each pull also refreshes `BankAccount.balance` from AIS (`GET …/balances`, preferring interim/closing available). Consent requests `balances` + `transactions` explicitly. Transaction pages follow `continuation_key` (capped).

**Consent (~90 days):** when the bank session expires, pulls fail until the user Connects again. UI warning for expiry is still a follow-up. Seats authorised **before** balances/transactions scopes were requested need a fresh Connect to pick up saldo.

### Redirect URLs (Control Panel whitelist)

Register **exact** origins+paths (no query string — Enable Banking appends `code` / `state`):

```
http://localhost:3000/banking/callback
https://app.rumtelo.com/banking/callback
```

Browser returns to `DOMAIN_APP` + `/banking/callback`; the app exchanges the code, syncs once, then redirects to Bank settings. Do **not** whitelist Nest/`DOMAIN_BACK`.

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
4. Connect → return to `/banking/callback` → sync → Bank settings.

### Mock ASPSP (sandbox balances + txs)

Live ASPSPs in sandbox often return **empty** transaction lists. For local AIS testing, import fixture data into Enable Banking’s **Mock ASPSP** (Control Panel → Mock ASPSP → Import), then Connect **Mock ASPSP** from Rumtelo.

- Fixture: [`fixtures/enable-banking-mock-nl.json`](./fixtures/enable-banking-mock-nl.json) — 3 EUR accounts (checking / savings / credit) named after the demo plan personas (`Jamie Lee Rivera` / `Avery Chen` / `Morgan Ellis Blake`), NL-style remittance names aligned with Inbox merchant needles. Format matches [EB sample JSON](https://enablebanking.com/sample-data/DK-Danske_Bank-synthetic-1.json).
- This is **not** `DemoHouseholdSeeder` / DB seed data — that path fills Rumtelo’s ledger directly; Mock ASPSP fills Enable Banking so our sync adapter pulls rows like a real bank.

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
| Plan capability | `moneyBank` + `maxBankLinks` for AIS; `moneyImport` for statement files (CAMT/MT940/CSV); live connect also gated by `FEATURE_BANK_SYNC` |

Flow:

```
CSV / MT940 / CAMT.053 ──► parseStatement ──► dedupe ──► Transaction (CSV, INBOX)
Bank AIS ──► BankingPort.fetchBalance ──► BankAccount.balance
         └──► BankingPort.fetchTransactions ──► Transaction (BANK, INBOX)
                    └──► household sorts in Inbox
```

---

## Product follow-ups (not done)

- Richer statement import wizard (preview/mapping) — minimal account+file upload ships on Transactions
- Consent-expiry warning UX (~90 days)
- Optional denser cron / shorter stale window once volume is known
- **Jar ↔ external account mapping** (route 1 above): link a bunq IBAN / Revolut currency account to a jar so balances mirror the bank
- Send the two outreach mails in [outreach-pis.md](./outreach-pis.md); record answers (price, agent model yes/no) here
- Optional later: OFX / QIF / PDF parsers

---

## Related

- [Outreach — PIS access](./outreach-pis.md) — draft mails to Enable Banking and Flow/FlowOS
- [Traps](./traps.md) — free open banking trap
- [Money module README](../../apps/backend/src/modules/public/product/money/README.md)
- [HANDOFF](../../HANDOFF.md) §11
