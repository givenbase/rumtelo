# Rumtelo Pots — step 3 decisions for Given

Date: 2026-11-23. Status: **open, waiting for Given.** Source: product-manager brief (SP3-F), checked against the code. Money doctrine is Given's call.

## 1. Finding first: a pot's "saved" figure rewrote the past — fixed (uncommitted until the orchestrator commits)

`jarPotBalance` (`packages/utils/src/money-plan.ts`) used to compute a pot's running balance as *months since the household started × this month's allocation*, and this month's allocation used the pot's **current** percentage and the **current** income (`balancesSnapshot`, `apps/backend/src/modules/public/product/money/plan/jar/jar.service.ts`). Nothing stored what a pot received in an earlier month.

- Every split change re-priced every past month. This existed before step 2.
- Step 2 made it visible: a six-month-old household that turned on Daily at 20% instantly showed six months of 20% as saved in Daily, and the same amount gone from Basics. The household total stayed correct; the figure per pot did not.
- **Built:** `money_jar_share` (`Migration20261123120000_JarShare`, unverified until staging) remembers which share each pot had from which month on; `jarPotBalance` now takes a `cumulativeDeposit` built month by month (`plan/jar/jar-share.util.ts`). A change counts only from the month it was made.
- **Income per month was already stored** (`money_income_amount_period`); the earlier note here ("income per past month is still today's income") rested on a stale code comment. The new balance prices each month at that month's income too.
- Details and what changes for existing households: `apps/backend/src/modules/public/product/money/README.md` ("A pot's running balance…").

## 2. "Buffer fills first" — four options

| | A — show the target | B — waterfall | C — Coach tip | D — week check offers Buffer first |
| --- | --- | --- | --- | --- |
| Household sees | Buffer shows "€1,840 of €6,000 · 1.1 months" with a bar | Goals gets €0 until the buffer is full | A tip with one button that proposes a split change | Surplus in the week check is offered to Buffer first |
| Engine | Unchanged; a target and derived progress | A rule inside the allocation; needs stored allocations per month | Unchanged; changes shares only after the household confirms | Unchanged; uses the stored week-check allocations |
| Effort | M–L, 4–7 h | XL, 3–5 days; split before starting | M, 2–3 h on top of A | M, 2–4 h on top of A |
| Money risk | Low | High: a wrong threshold misroutes every euro | Low | Lowest |
| Principles | Fits all four | Fights "information, never shame" unless labelled very clearly (Goals at €0) | Fits; must stay a suggestion | Strongest on "ten minutes a week" |

**Recommendation: A first, then D, then C. Park B** until allocations are stored per month. A and D give the behaviour — attention and surplus go to the buffer first — without a hidden rule routing money.

Wording: do not say "vult eerst" / "fills first" in copy until D or B exists. Until then: "Eerst je buffer, dan je doelen."

## 3. When is the buffer "full"?

| Definition | Data we have | Trade-off |
| --- | --- | --- |
| N × monthly Basics allocation | Yes | Moves when the split moves; measures the plan, not real costs |
| N × real fixed costs | Yes | Honest about must-pays; zero on day one; misses groceries |
| Nibud-style amount | No | Most trusted; needs household composition; licensing and advice questions |
| A number the household types | Trivial | Matches the earlier decision; people do not know what to type |

**Recommendation:** the household types the number, pre-filled with N × (real monthly fixed costs + Daily if on), falling back to N × Basics when there are no fixed costs yet. Label: "Een richtlijn. Jij beslist."

## 4. The share an optional pot takes — today's numbers work against "buffer first"

Shares are a percentage of income (`OPTIONAL_JAR_SHARE`): Daily 20, Goals 6, Investing 5, Learning 5, Giving 5.

- With Goals, Investing and Learning all on, Buffer keeps **4%** of income.
- Daily 20 leaves Fixed costs at **35%**; real fixed costs are often above that.

Options: (1) make the share a part of the group (for example Goals 30% of Future, Buffer keeps at least half); (2) lower the numbers (Goals 5, Investing 3, Learning 2) and derive Daily from real fixed costs with a floor. Giving 5 is fine.

## 5. Smaller items

| Item | Recommendation | Cost |
| --- | --- | --- |
| Basics from real fixed costs | A hint that fills in the split; the household saves (being built, SP3-C) | built tonight |
| "Moet dit, of kies je dit?" | The answer picks the pot; no stored field (being built, SP3-C) | built tonight |
| Category tags (ECOICOP, Nibud group) | Later; nothing consumes them yet | M, 3–5 h + migration |
| Who may refine | MEMBER, the same as the split today | none |
| Plan gate on refining | None; the method is the core of the product | none |

## 6. Five questions, one word or number each

1. How many months is the suggested buffer: 3 or 6?
2. Buffer now: A + D (show it, week check offers it first) or B (automatic waterfall)?
3. Who may set the buffer target: OWNER or MEMBER?
4. Optional pot shares: a percentage of income (today) or a part of the group?
5. Derive Daily's share from real fixed costs: yes or no?
