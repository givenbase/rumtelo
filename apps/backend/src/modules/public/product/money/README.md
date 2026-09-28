# Product: Money (Geld)

The money loop. Children map one-to-one onto the Geld navigation.

## Doctrine — the six jars

Rumtelo’s money product is built on **T. Harv Eker’s 6 jar system**: every euro gets a job the moment income lands — not after you’ve already spent it. That is the opposite of a classic after-the-fact budget.

**Default split** (`DEFAULT_JAR_SPLIT` in `@rumtelo/contracts`): **55 / 10 / 10 / 10 / 10 / 5**.

| Jar | % | Job |
|---|---|---|
| Necessities | 55 | Rent, food, bills, transport, insurance — real must-pays |
| Financial Freedom | 10 | Investments only. Money goes in and is **never spent** — only returns (ideally left in) |
| Long Term Savings | 10 | Planned future spends: emergency fund, car, holiday, down payment, debt payoff |
| Education | 10 | Skills that raise earning power — books, courses, mentors |
| Play | 10 | Guilt-free fun. Spend it regularly so the plan stays human |
| Give | 5 | Charity / foundation — abundance practice, not leftover crumbs |

**FF ≠ LTS.** Confusing them is the #1 product mistake. Freedom builds wealth you don’t liquidate; Long Term Savings is for known, planned purchases. Goals and the split simulator should respect the goal’s jar, not assume everything is LTS.

**Why 55 / 5, not 50 / 10?** Some Eker summaries use Necessities 50% and Give 10%. We ship the **55 / 5** variant (also common in productised 6-jar apps). Percentages are **guidelines** — households may override; the split coach warns, never blocks (must still sum to 100%).

### When Necessities can’t fit in 55% (or fixed costs blow the envelope)

This is **common when starting**. The 55% is a **goal to work toward**, not a hard gate. Official Eker teaching: the habit of managing money matters more than the amount ([FAQ](https://www.harveker.com/blog/6-step-money-managing-system/)).

**Do this (in order of product messaging):**

1. **Simplify** — review fixed costs on Necessities (and other jars). Cut or renegotiate must-pays until they fit closer to the envelope.
2. **Earn more** — raise income so 55% covers the same bills. Cutting has a floor; income does not.
3. **Bridge OK** — temporarily run Necessities above 55% if needed; soft-coach toward the target. Do **not** “fix” the gap by raiding Financial Freedom.

**Do not:** permanently starve FF/LTS to fund rent without a plan to reverse it.

**Product surfaces this as:**

- Jar math: `available = allocated − spent − fixed OUT` → Necessities **overspent** when commitments exceed the envelope (`jarCoverage` in `@rumtelo/utils`)
- Fixed costs / jars UI: shortfall callout + CTAs → review fixed costs · add income  
  (`NecessitiesPressureCard` — `apps/application/app/_components/features/money/necessities-pressure-card.tsx`)
- Split coach: tip when Necessities % &gt; 60% — cut fixed costs before cutting Freedom

**Product mapping**

- Income arrives → `income` + jar split (`jar`)
- Recurring draws → `fixed-cost` from a jar
- Bank noise → `transaction` Inbox → sort into a jar (`rule` optional). CSV import and Enable Banking / PSD2 strategy: [docs/engineering/banking.md](../../../../../../../docs/engineering/banking.md)
- Planned outcomes → `goal` / `debt` attached to the right jar behavior
- Soft teaching when people drag the split → [split coach](../../../../../../application/app/_lib/split-coach/README.md)

User-facing jar copy (allowed / not allowed) lives in the app: `apps/application/app/_lib/jar-guide.ts`.

## Module map

| Child | Owns |
|---|---|
| `jar/` | the six jars and their categories; the split must total 100% |
| `income/` | income sources and the split that runs when money arrives |
| `fixed-cost/` | recurring obligations, drawn from a jar |
| `account/` | bank accounts, manual or linked |
| `transaction/` | the ledger, the Inbox, and CSV import (`csv/`) |
| `rule/` | auto-sort engine; first match wins, in priority order |
| `goal/` | targets with a monthly rate and a straight-line projection |
| `debt/` | balances plus avalanche/snowball ordering |
| `month-score/` | the monthly score — points, level, event log |
| `week-check/` | the ten-minute weekly week check and its surplus allocations |
| `dashboard/` | composition root; one aggregated read for the main screen |

`dashboard` depends on the others through their services. It exists so the most
visited route in the product is one round trip instead of a waterfall.
