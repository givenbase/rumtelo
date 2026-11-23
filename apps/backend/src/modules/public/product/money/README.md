# Product: Money (Geld)

The money loop. Children map one-to-one onto the Geld navigation.

## Doctrine — pots in three groups

Every euro gets a job the moment income lands — not after you’ve already spent it. That is the opposite of a classic after-the-fact budget. The method started from T. Harv Eker’s six jars; a **new** household now starts with **three pots**, one **main** pot per group, and refines from there. Existing households keep the six rows they have.

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
- **Coach** speaks at group level: the Basics group sum (`sumPercentageByGroup`) against `GROUP_SOFT_CEILING.BASIS` (60) with goal `DEFAULT_GROUP_SPLIT.BASIS` (55), and bills against the pots that can carry them (`allowsFixedCosts`, today the NECESSITIES pot only) with the allocation of those same pots, so slack in DAILY never masks a Fixed costs overshoot. No stored pot name is baked into tip text: a main pot is shown as “Basics” while alone and “Fixed costs” once refined, so the client resolves the name from the jar.

### When Basics can’t fit in 55% (or fixed costs blow the envelope)

This is **common when starting**. The 55% is a **goal to work toward**, not a hard gate. Official Eker teaching: the habit of managing money matters more than the amount ([FAQ](https://www.harveker.com/blog/6-step-money-managing-system/)).

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
