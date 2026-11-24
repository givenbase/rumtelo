# Product: Money (Geld)

The money loop. Children map one-to-one onto the Geld navigation.

## Doctrine — pots in three groups

Every euro gets a job the moment income lands — not after you’ve already spent it. That is the opposite of a classic after-the-fact budget. The method is called **Rumtelo Pots** (NL *Rumtelo-potjes*); it began as six fixed jars. A **new** household now starts with **three pots**, one **main** pot per group, and refines from there. Existing households keep the six rows they have.

| Group | Main pot (`JarKey`) | Default % | Optional pots inside the group |
|---|---|---|---|
| Basics (`BASIS`) | `NECESSITIES` | 55 | `DAILY` |
| Future (`FUTURE`) | `LONG_TERM_SAVINGS` | 20 | `GOALS`, `FINANCIAL_FREEDOM`, `EDUCATION` |
| Free (`FREE`) | `PLAY` | 25 | `GIVE` |

Source of truth: `jar.util.ts` in `@rumtelo/contracts` (`JAR_MAIN_KEY_BY_GROUP`, `OPTIONAL_JAR_KEYS`, `DEFAULT_GROUP_SPLIT`, `OPTIONAL_JAR_SHARE`, `resolveJarKeyForHousehold`). Percentages are **guidelines** — households may override; the split coach warns, never blocks (the split must still sum to exactly 100.00, compared in basis points).

**A household has 3 to 8 pots. Nothing in the backend may assume an optional pot exists.**

### Backend rules for the pots

- **Onboarding** copies only the `isDefault` jar templates (`JarTemplateService.listDefault`): the three main pots at 55 / 20 / 25. A custom split is validated against those three only (`jar_split_keys` if it names anything else). If no template is flagged default (seed not run) onboarding and the preview fail loudly instead of creating zero or eight pots.
- **Turn a pot on** — `jars.activate` (`JarService.activate`, role: UPDATE). Only optional keys (`jar_not_optional` otherwise; `jar_already_active` if the household has it). The pot copies the template (name, subtitle, icon, capabilities, sort order), sits on the main pot’s bank seat, and its share (`OPTIONAL_JAR_SHARE`, stored on the template) comes **out of the group’s main pot**, so the group total never changes. The main pot must keep more than 0 (`jar_share_too_small`). One transaction with a row lock on the main pot; the household still totals exactly 10 000 bp afterwards.
- **Turn a pot off** — `jars.deactivate` (`JarService.deactivate`, role: UPDATE). Main pots refuse (`jar_not_optional`). Any transaction, fixed cost, goal, sort rule or week-check allocation that points at the pot refuses (`jar_not_empty`): the transaction and goal foreign keys are SET NULL and would silently drop money out of every sum. Categories alone do not block (they go with the pot). The share returns to the main pot. Moving the contents to the main pot first is a separate, deliberate step (not built).
- **Fallback to the main pot.** Anything that resolves a pot by key for writing uses `resolveJarKeyForHousehold`: auto-sort of a merchant that targets an absent pot, and archive restore (rows for an absent pot land in the group’s main pot; a bill that falls onto a pot that takes no bills is skipped with `fixed_cost_jar_unmapped`; a Give pledge is *not* moved onto Play, it stays without a pot). The archive split is still skipped, with the existing warning, when the key sets differ.
- **A category belongs to a pot** (`Category.jar` is required). A write that names both a pot and a category — transaction create / sort / bulk sort / update, sort-rule create / update / payee hint, fixed-cost create / update — goes through `assertCategoryInJar` (`own-reference.util.ts`) and is refused with `category_not_found` when the category sits in another pot. No check when the row has no pot (an Inbox transaction) or no category is sent; an update that touches neither is not re-judged. Rows saved before the rule are not rewritten. Whether the category belongs to the household at all is `requireOwnCategory`.
- **Archive restore is atomic** (`archive/`). `ArchiveService.restore` runs the real pass in one `em.transactional`, so a service that rejects a row in a late section (income, debts, bills, goals) rolls back everything before it. The dry run walks the same pass and pre-validates the rules the services enforce (`archive-rules.util.ts`: `invalid_iban`, `due_month_required`, `settlement_account_invalid`, party-name dedupe), so the preview refuses what the real run would. The pot split (`jars.updateSplit`) is written last so its row locks are held briefly. Warnings (`fixed_cost_jar_unmapped`, `goal_give_pot_missing`, …) come back as ids; the app shows them in Settings → Import (`_lib/archive-warning-copy.ts`) and a test fails when an id has no text. Known gaps (restored transactions skip the closed-period and outflow checks; no size cap on the arrays) are in `docs/BACKLOG.md`.
- **Coach** speaks at group level: the Basics group sum (`sumPercentageByGroup`) against `GROUP_SOFT_CEILING.BASIS` (60) with goal `DEFAULT_GROUP_SPLIT.BASIS` (55), and bills against the pots that can carry them (`allowsFixedCosts`, today the NECESSITIES pot only) with the allocation of those same pots, so slack in DAILY never masks a Fixed costs overshoot. No stored pot name is baked into tip text: a main pot is shown as “Basics” while alone and “Fixed costs” once refined, so the client resolves the name from the jar.

### A pot’s running balance (`potBalance`) and the share history

`potBalance` = **everything the split deposited into the pot, month by month** + credited − spent, from the month the household started through the viewed month. Each month is priced with **that month’s income and that month’s share of the pot**, so changing the split (or turning a pot on or off) never re-prices an earlier month.

- **Share history** — `money_jar_share` (`JarShare`): one row per pot per month in which its share changed (`period` `YYYY-MM`, `percentage`). The share of a pot in month M is the row with the greatest `period` ≤ M; no such row means the pot did not exist in M (share 0). `Jar.percentage` stays the cached current share. Pots that predate the table carry one baseline row (`JAR_SHARE_BASELINE_PERIOD`, `1970-01`).
- **Invariant** — after any write, each pot’s row for the current month equals `jar.percentage`. Writers (`JarService`, one transaction, under the household jar lock): `updateSplit` (a row for each pot whose share changed), `activate` (the new pot starts now; the main pot steps down now), `deactivate` (the removed pot’s history is added onto the main pot’s, period by period, then its rows go with it), onboarding (`seedBoard`: a baseline row per new pot). Any other code that creates a pot or changes a percentage must go through the same helper.
- **Deploy-window drift** — while the OLD backend still runs after the table exists, its `activate` / `deactivate` / `updateSplit` write no share rows. Rules (reads self-heal, writes repair, nothing is written on read):
  - **Current month = `jar.percentage`.** On read, the share of every pot for the current month is its `jar.percentage` whatever the rows say, so today can never be affected by drift.
  - **A pot with no rows at all**: if the household has no share rows at all (before the migration filled the table) it is read — and, on the first write, stored — as a baseline row (`1970-01`) with its percentage, for every pot alike. If the household has rows for other pots, the pot was created by old code after the table existed: it counts **from the current month on** (read as a row at the current month; its first stored row, written by the next write, is at the current month), never from the 1970 baseline.
  - **Repair on the next write** — `updateSplit`, `activate` and `deactivate` first run `reconcileHistory`: row-less pots get their first row as above, and any pot whose share for the current month differs from `jar.percentage` gets a current-month row with `jar.percentage`. Afterwards every pot’s row for the current month equals its percentage; the drift stays confined to the months of the deploy window.
  - **A month over 100 %** (an old-code activate left the main pot’s old share on top of the new pot’s) is scaled down proportionally in integer maths, remainder to the largest share: it allocates exactly the income, never more. **Under 100 %** (an old-code deactivate cascaded rows away without merging) allocates what the shares say, floored; the rest is unallocated, not handed to a pot.
- **Income history** — `money_income_amount_period` (read once, with the income sources, by `JarService.loadIncomeSources`). A month’s income is `monthlyNetAsOf(sources, last day of the month)`, the same function `monthlyNetIncome` uses for a single date.
- **Read** — `JarService.balancesSnapshot`: load share rows once and income once, cut the months from the household’s start to the viewed month into segments where neither income nor any share changes (`cumulativeDepositsByPot`), allocate one month per segment with `allocateByPercentage` (remainder to the largest share, so the pots add up to the income to the cent) and multiply by the segment’s length. Constant queries whatever the number of months; work follows the number of changes. A month whose shares do not total 100 % gets what the shares say, floored, no invented remainder. The viewed month’s `allocated`, `remaining`, `available`, `progress` and `overspent` use the shares of that month (for the live month: the current split, as before).
- **What changed for existing households** — the old formula was `months × this month’s allocation` (current income × current percentage), so it re-priced the whole past on every change. A household whose split and income never changed reads **exactly** the same numbers. A household that changed its split reads its past at the split it had when each month happened (from the baseline the migration wrote, i.e. the split at deploy, forward); a household whose income changed reads each earlier month at the income of that month; months before the first income source started now count 0. Turning off a pot moves what it deposited onto the main pot; because the remainder rule can land a cent differently once two pots become one, the main pot can differ by a few cents from the two pots’ sum (the household total is always exact).
- **Looking Ahead** keeps the current split carried forward: `projectPotBalanceAhead` adds this month’s allocation per month ahead on top of the live running balance.

### When Basics can’t fit in 55% (or fixed costs blow the envelope)

This is **common when starting**. The 55% is a **goal to work toward**, not a hard gate: the habit of splitting first matters more than the exact amount.

**Do this (in order of product messaging):**

1. **Simplify** — review fixed costs on the Basics pots. Cut or renegotiate must-pays until they fit closer to the envelope.
2. **Earn more** — raise income so 55% covers the same bills. Cutting has a floor; income does not.
3. **Bridge OK** — temporarily run Basics above 55% if needed; soft-coach toward the target. Do **not** “fix” the gap by raiding the Future group.

**Do not:** permanently starve the Future group to fund rent without a plan to reverse it.

**Product surfaces this as:**

- Jar math: `available = allocated − spent − fixed OUT` → a pot is **overspent** when commitments exceed the envelope (`jarCoverage` in `@rumtelo/utils`)
- Fixed costs / jars UI: shortfall callout + CTAs → review fixed costs · add income  
  (`NecessitiesPressureCard` — `apps/application/app/_components/features/money/necessities-pressure-card.tsx`)
- Split coach: tip when Basics % &gt; 60% — cut fixed costs before cutting the Future group

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
| `jar/` | the household’s pots (3 main, up to 5 optional) and their categories; turn optional pots on/off; the split must total 100% |
| `income/` | income sources and the split that runs when money arrives |
| `fixed-cost/` | recurring obligations, drawn from a jar |
| `account/` | bank accounts, manual or linked |
| `transaction/` | the ledger, the Inbox, and CSV import (`csv/`) |
| `rule/` | auto-sort engine; first match wins, in priority order |
| `goal/` | targets with a monthly rate and a straight-line projection |
| `debt/` | balances plus avalanche/snowball ordering |
| `month-score/` | the monthly score — points, level, event log |
| `week-check/` | the ten-minute weekly week check and its surplus allocations |
| `progress/` | board stage (`SPLIT` → `SORTING` → `ROUTINE` → `MONTH`) derived on every read; `contract.money.progress.get`, also the `progress` field of `contract.money.dashboard.get`. Paid plans (Plus/Max) are at `MONTH`: the floor `HouseholdSettings.boardStageFloor` is written on a paid start or upgrade and kept on downgrade (also the migration backfill). Guidance for the shell only, never an access gate |
| `dashboard/` | composition root; one aggregated read for the main screen |

`dashboard` depends on the others through their services. It exists so the most
visited route in the product is one round trip instead of a waterfall.
