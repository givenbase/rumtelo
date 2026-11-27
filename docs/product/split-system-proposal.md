# Rumtelo Pots — the split system (decisions, state, research)

Status: **decided and partly built** (2026-11-23). Read §0, §0.2 and "What is built, what is next" for the current state. §0.1 (terminology) is still valid research. Everything under "Earlier drafts" is the first draft written the same morning, kept as history with its sources; it uses names that were later replaced. Money doctrine (which pots exist, default shares, the order) is Given's call. Where a figure is press- or vendor-sourced it says so. Companion: [market-research-2026-11.md](./market-research-2026-11.md).

## 0. Decisions so far (Given, 2026-11-23)

These override the names used under "Earlier drafts" further down ("Nodig · Later · Vrij", "Af en toe"). Read Nodig as Basis and Later as Toekomst.

| Topic | Decision |
| --- | --- |
| Replace the six jars | Yes |
| Group labels | **Basis · Toekomst · Vrij** (EN **Basics · Future · Free**; ES Básico · Futuro · Libre; FR Base · Futur · Libre). Set by hand per language, not machine-translated. First chosen as "Vast · Toekomst · Vrij"; "Vast" was replaced by "Basis" after the terminology check (§0.1) |
| Method name | Given's suggestion: **Rumtelo-potjes** (EN "Rumtelo Pots") — to confirm |
| Emergency pot | Called **Buffer** (EN "Emergency fund"), the standard term at Nibud and the banks, with the line **"Voor nood en tegenvallers"** so someone looking for "nood" finds it. One pot, target set by the household |
| Known irregular costs | A pot in **Toekomst**, not in Vast. "Af en toe" is rejected as a name; decided: **Grote uitgaven** (EN "Big expenses"), line "Je weet dat ze komen." |
| Geven | Optional pot, off by default; existing households keep theirs |
| Drill-down | Tapping a group opens a group page with its pots in order; tapping a pot opens the pot |
| Default shares | "A logical split": proposed start 55% Vast · 20% Toekomst · 25% Vrij, then Vast is derived from real fixed costs; Toekomst at least 10%; Noodpot gets most of Toekomst until full. Numbers are a proposal, to confirm |

Further decisions the same day:

| Topic | Decision |
| --- | --- |
| What the first group means | **What must be paid**, not "what recurs". A recurring cost the household chooses (cinema pass, streaming, gym) is paid from Vrij. When adding a recurring cost the app asks "Moet dit, of kies je dit?" |
| Grote uitgaven | **Dropped as a pot** (it reads like "Vaste kosten"). Yearly and quarterly bills are fixed costs with a yearly/quarterly cadence; repairs and replacement come from the emergency pot; planned purchases are goals |

### 0.2 Built as step 2 (Given, 2026-11-23): three pots, refine inside

Given's rule: **55 / 20 / 25 is the split at group level; inside a group a household can specify further and turns that on itself.** This supersedes the "on by default" column below.

| Topic | Decision / state |
| --- | --- |
| Default household | **Three pots**: Basis 55% · Toekomst 20% · Vrij 25% (one main pot per group) |
| Refining | Optional pots are turned on per group in Settings › split: Basis → Dagelijks; Toekomst → Doelen, Beleggen, Leren; Vrij → Geven. A pot takes its share out of its group's main pot; the three group totals do not change |
| Names | A main pot shows the group name while alone (Basis), its own name once refined (Vaste kosten, Buffer, Plezier) |
| Turning off | Only while nothing references the pot (transactions, fixed costs, goals, rules, week-check lines); the share returns to the main pot |
| Existing households | Keep their six pots untouched; they count as refined |
| Pot that is off | Presets, merchants, categories and archive rows that target it land in the group's main pot. A Give pledge needs the Giving pot (no fallback) |
| Share an optional pot takes when turned on | **Proposal, to confirm:** Dagelijks 20, Doelen 6, Beleggen 5, Leren 5, Geven 5 (`OPTIONAL_JAR_SHARE`) |
| Coach | Group level: Basis above 60% and Toekomst under 10% (thresholds unchanged from before; copy to confirm) |
| Step 3, built (uncommitted at the time of writing) | "Moet dit, of kies je dit?" on the fixed-cost form (the answer only picks the pot, Basics or Free; nothing new is stored); a "Basics fit" hint in split settings (a button that fills in the split, never automatic) |
| Not built | "Buffer fills first", category tags (ECOICOP/Nibud), Basis derived automatically from real fixed costs |

Pots per group today (the earlier "on by default" column was replaced by 0.2):

| Group | Line under it | Main pot (every household) | Optional (turned on per household) |
| --- | --- | --- | --- |
| **Basis** | Wat moet, elke maand | `NECESSITIES` — "Basis" while alone, "Vaste kosten" once refined | Dagelijks (`DAILY`) |
| **Toekomst** | Wat je opbouwt | `LONG_TERM_SAVINGS` — "Toekomst" while alone, "Buffer" once refined | Doelen (`GOALS`), Beleggen (`FINANCIAL_FREEDOM`), Leren (`EDUCATION`) |
| **Vrij** | Wat je kiest | `PLAY` — "Vrij" while alone, "Plezier" once refined | Geven (`GIVE`) |

Planned, not built: Plezier showing how much is already committed to subscriptions.

## What is built, what is next

Verified against the code on `dev` plus the uncommitted work in the worktree (2026-11-23; marked where it is not committed yet). Open follow-ups, priorities and the staging checklist live in [`docs/BACKLOG.md`](../BACKLOG.md) ("Rumtelo Pots — follow-ups").

**Built**

| Step | What | Where |
| --- | --- | --- |
| Step 1 | Three display groups (`JarGroup`: `BASIS`, `FUTURE`, `FREE`), group headers and stacked bar on the pot board, onboarding split and settings; one pot name on every screen; split validation (every pot once, total exactly 100.00 in basis points) | `jar.util.ts`, `apps/backend/src/common/utils/jar-split.util.ts` |
| Step 2 | New households start with three main pots at 55 / 20 / 25; five optional pots (`DAILY`, `GOALS`, `FINANCIAL_FREEDOM`, `EDUCATION`, `GIVE`) turned on and off in Settings (`money.jars.activate` / `deactivate`); an optional pot takes its share out of its group's main pot (`OPTIONAL_JAR_SHARE`); fallback to the main pot for presets, merchants, categories and archive rows; group-level split coach (Basics above 60%, Future below 10%); landing and sign-up show the three groups | contracts `jar.util.ts`, `jar.service.ts`, migrations `Migration20261123100000_JarKeyDailyGoals` and `Migration20261123100100_JarTemplateMainPots` (hand-written, **unverified until staging**) |
| Step 3 (part) | The fixed-cost form asks "Moet dit, of kies je dit?": must → the Basics main pot, choose → the Free main pot, a quiet link opens the full pot picker. The answer only picks the pot. Split settings show a "Basics fit" hint: fixed costs on Basics against the bills pot's share, with one button that fills the form (the household still presses Save). The "room" case (spare share on the bills pot goes to Future) is only offered when Daily is on, because with Daily off the bills pot also pays groceries. Nothing is automatic | `apps/application/app/_components/features/forms/fixed-cost-pot-choice.tsx`, `apps/application/app/_lib/basics-fit.ts`, `settings/_components/jars-basics-fit.tsx` |
| Pot history | A pot's running balance ("saved") is priced month by month at that month's income and share; new table `money_jar_share` (`Migration20261123120000_JarShare`, **unverified until staging**) | `jar-share.util.ts`, `jar.service.ts` |
| Draft steps S0, S1 | Done (S0 = `updateSplit` validation; S1 = groups and names). S2 (Needs as three lines) is replaced by the optional Daily pot | see "Earlier drafts" §8 |

**Next (planned, not built)**

- Buffer fills first, then hands its share on when full (draft rule 2, step S3). Options and a recommendation: [split-step3-decisions.md](./split-step3-decisions.md).
- Basis derived **automatically** from real fixed costs (today only a hint the household applies); Future at least 10% (draft rule 3, step S4). The 55 / 20 / 25 default is a proposal the owner still confirms, like `OPTIONAL_JAR_SHARE`.
- Category tags (ECOICOP division, Nibud group, default must/choose) — a contract and template change with a hand-written migration (§0.1 finding 3).
- Resolve the stored pot name by key in backend-composed Coach lines (`money-coach.service.ts`, `fixed-cost-coach.util.ts`).

**Not decided or not planned**

- A Belasting / Tax group and pot (draft step S5): not part of the decisions above; belongs with the Bedrijf product.
- Custom and extra pots beyond the eight keys (draft step S6).
- "Grote uitgaven" as a pot: dropped (see §0).

### 0.1 Terminology check against the standards (2026-11-23)

Checked against Nibud's budgeting method, the official EU/CBS classification of household spending (ECOICOP v2), bank apps and open-banking category lists. Sources: [Nibud method](https://www.nibud.nl/onderwerpen/rondkomen/plannen-en-begroten/nibud-methode-van-budgetteren/), [Nibud on subscriptions](https://www.nibud.nl/onderwerpen/uitgaven/abonnementen/), [Nibud leefgeld](https://www.nibud.nl/onderwerpen/geldproblemen/leefgeld-in-de-schuldhulpverlening/), [CBS ECOICOP v2](https://www.cbs.nl/nl-nl/longread/diversen/2026/de-ecoicopv2-indeling?onepage=true), [Plaid taxonomy](https://plaid.com/documents/pfc-taxonomy-all.csv), [Yapily categories](https://docs.yapily.com/data/data-plus/categorisation-list.md).

**Finding 1 — two separate axes.** No authority merges "does it recur?" with "is it necessary?". Nibud sorts by recurrence: *vaste lasten* (contractual, recurring — **including subscriptions**), *reserveringsuitgaven* (certain, timing unknown: clothing, household goods, own risk, holidays) and *huishoudelijke uitgaven* (frequent, varying: food, care, cleaning). Necessity is a separate lens ("basispakket"). The transaction taxonomies have no need/want axis at all. So the product needs two fields per cost: **recurrence** and **must / choose**.

**Finding 2 — word by word.**

| Our word | Standard term | Verdict |
| --- | --- | --- |
| Vast (group, meaning "what must") | Nibud's "vast" means contractual and recurring and includes subscriptions | **Changed to Basis / Basics (decided)** (Nibud's own word for necessities is "basispakket"). "Vast" for essentials contradicts the standard and our own subscription rule |
| Toekomst / Future | none | Keep |
| Vrij / Free | "vrij besteedbaar" is a standard phrase | Keep |
| Vaste kosten | "Vaste lasten" is the standard (Nibud, ABN AMRO, Knab, CPB); "vaste kosten" is an understood synonym | Keep (deliberate: no "lasten"); map to Nibud "vaste lasten" in data |
| Dagelijks | Nibud "huishoudelijke uitgaven"; debt help "leefgeld" | Keep; map to "huishoudelijke uitgaven" |
| Noodpot | "Buffer" / "financiële buffer" (Nibud BufferBerekenaar, banks). "Noodpot" was found only on one blog | **Changed to Buffer (decided)**, with the line "Voor nood en tegenvallers" so people looking for "nood" find it |
| Doelen | banks say "spaardoelen" (not verified) | Keep; goals come from Planning and are not only savings |
| Beleggen | not checked | Keep; never names a product |
| Leren | ECOICOP 10 "Onderwijs" | Keep; map to Onderwijs |
| Plezier | ECOICOP 09 "Recreatie, sport en cultuur", 11 "Restaurants en accommodatie" | Keep |
| Geven | tax term "giften" | Keep the pot name; category "Giften" |
| "Moet dit, of kies je dit?" | English advisers warn that "needs vs wants" reads as deprivation or shame; no Dutch wording research found | Keep: "kies je" is a choice, not a want. Test in interviews |

**Finding 3 — categories.** The app has about 55 spending categories. Against the standards:

- `SUBSCRIPTIONS` can only sit under Necessities today, so a cinema pass lands in "what must". It needs to be allowed under Plezier with a default of "choose".
- Clothing exists only as `FASHION` under Play; Nibud counts clothing as a necessary reservation. Add a clothing category under the first group.
- No telecom category ("Internet, tv en telefoon", ECOICOP 08).
- Recommended: keep the existing categories and give each one three tags — an ECOICOP division (01–13), a Nibud group (vast / reservering / huishoudelijk) and a default must/choose — so household data can later be compared with CBS and Nibud reference figures. Eighteen top-level groups are enough for reporting: Wonen, Energie en water, Verzekeringen, Zorg, Internet tv en telefoon, Abonnementen, Boodschappen, Verzorging en schoonmaak, Vervoer, Kleding, Inboedel en onderhoud, Onderwijs, Uitgaan en restaurants, Vrije tijd sport en cultuur, Vakantie, Giften, Sparen en beleggen, Overig.

Work: category tags are a contract + template change with a hand-written migration (Medium, M, 3–5 h, medium confidence) and belong with step S2.

Not verified: the full category lists of ING, Rabobank and ABN AMRO; Tink, Salt Edge and GoCardless lists; where ECOICOP places donations and health insurance.

---

## Earlier drafts (history, not current)

Everything from here to the end is the first draft of the same morning. It shows the first names ("Nodig · Later · Vrij", "Af en toe", "Grote uitgaven"), a five-pot start, a Tax group and the steps table S0–S6. The decisions in §0 and §0.2 replace it; the research and sources stay because the decisions rest on them.

## 1. Why replace the six jars

The six jars are T. Harv Eker's method with fixed shares (55/10/10/10/10/5). It is free to use, but it is not ours, and it has five weak spots:

| Weak spot | Evidence |
| --- | --- |
| Fixed 55% for necessities does not fit many Dutch households | Nibud: fixed costs alone are over 55% of net income at modal income with average rent; ideal is at most 50%, over 60% is worrying (2019, via [Radar](https://radar.avrotros.nl/artikelen/31502)). The Coach already ships a tip for exactly this (`money.fixed_costs.over_necessities`) |
| No buffer | Nibud advises saving 10% of net income to build and refill a personal buffer ([Nibud](https://www.nibud.nl/onderwerpen/sparen/een-financiele-buffer-opbouwen/)). One in seven households could not raise €2,000 in a month ([DNB](https://www.dnb.nl/en/general-news/2020/one-in-seven-dutch-households-financially-fragile-in-finanical-emergency)). Today the buffer is only a goal preset |
| Nothing for tax | 27% of zzp'ers have a tax debt ([CBS](https://www.cbs.nl/nl-nl/nieuws/2025/47/ruim-kwart-zelfstandigen-heeft-belastingschuld)); no tax reserve exists in the product |
| No order | Every jar gets its share at once, also when rent is not covered. Standard household guidance is an order: essentials → starter buffer → expensive debt → full buffer → goals and investing ([MoneyGuy order of operations](https://moneyguy.com/episode/what-is-the-financial-order-of-operations/), secondary) |
| Two jars people confuse | "Financial freedom" and "Long-term savings" |

It also removes a branding risk: the method's names and course material belong to someone else.

## 2. The system in one picture

Income lands and flows down in a fixed order. Each step is a group; pots sit inside a group.

```text
Income lands
   │
   ▼  0. Belasting / Tax        only if you run a business — this money is not yours
   ▼  1. Nodig / Needs          what must be paid every month
   ▼  2. Later / Later          what you build: buffer first, then goals, then investing
   ▼  3. Vrij / Free            what you spend without guilt
```

| Group | One-line promise (NL / EN) | Pots at the start | Optional pots |
| --- | --- | --- | --- |
| **Belasting / Tax** | "Eerst apart, want dit is niet van jou." / "Set aside first — this isn't yours." | Btw, Inkomstenbelasting | — |
| **Nodig / Needs** | "Wat elke maand moet." / "What has to be paid every month." | Vaste kosten, Dagelijks | Af en toe (clothes, repairs, yearly bills) |
| **Later / Later** | "Wat je opbouwt." / "What you build." | Buffer, Doelen | Beleggen, Leren |
| **Vrij / Free** | "Uitgeven zonder schuldgevoel." / "Spend without guilt." | Plezier | Geven |

A new household starts with **five pots**, not six, and adds the optional ones when it is ready. The evidence that fewer goals help people save is thin (one small study, reviewed by [the World Bank blog](https://blogs.worldbank.org/en/impactevaluations/marketing-saving-fewer-goals-can-lead-to-higher-savings)), but it points the same way as our own clarity work.

## 3. The five rules

1. **Order, not just shares.** Money flows Needs → Later → Free. Inside Later: Buffer first, then goals, then investing. Minimum debt payments live in Needs (they already post to Necessities); extra repayment of expensive debt ranks before goals.
2. **The buffer fills first, then steps aside.** When the buffer reaches its target, its share moves on to the next pot automatically and the household is told. If the buffer is used, the flow returns to it. No competitor was confirmed doing this; the closest are two vendor pages without independent reviews.
3. **Shares fit the household.** Needs is **derived** from the household's real fixed costs plus a daily amount, not preset. The app then suggests Later (anchor: Nibud's 10%) and the rest is Free. The household can change every share.
4. **Tax comes off the top for the self-employed.** VAT received is set aside in full; income tax is one share the user sets. Pre-filled value and wording are a planning aid: "your own estimate, not tax advice", with a pointer to the provisional assessment. Knab's rule of thumb is 30–40% of profit and it says no single percentage fits everyone ([Knab](https://bieb.knab.nl/ondernemen/hoeveel-moet-ik-als-zzper-reserveren-voor-de-btw-en-inkomstenbelasting)).
5. **A signal always carries one next move.** Needs above 60% is not a failure: the screen shows the biggest fixed cost and one action. Free is never shown as "what is left over"; it is money with a job.

## 4. What is new, and what customers already know

| Element | Already familiar from | What we add |
| --- | --- | --- |
| Three groups | 50/30/20, which ABN AMRO also teaches ([ABN AMRO](https://www.abnamro.nl/nl/prive/themas/hulp-bij-geldzaken/inzicht-inkomsten-uitgaven/50-30-20-regel.html)) | Plain words instead of numbers; shares that fit the household |
| Pots | "Potjes" at Rabobank, Knab, bunq, ING | Pots grouped and ordered, shared by the household |
| Split on arrival | ING Inkomen Sparen, Knab Inkomstenverdeler, bunq, Revolut, N26 — each inside one bank, per payment or per payer | Bank-agnostic: one list of what to transfer, whichever banks the household uses |
| Tax first | bunq AutoVAT, Knab Btw Sparen — business account only | Private and business in one flow |
| Buffer | Nibud, every budget coach | Fills first and hands its share on when full |
| Weekly routine | — | The ten-minute week check stays the habit that keeps it going |

## 5. Names

### The system

| Candidate (NL / EN) | Verdict |
| --- | --- |
| De Verdeling / The Split | **Rejected.** "Verdeling" is the legal term for dividing an estate or marital property (art. 3:185 BW) and reads as "after a divorce". "Split" is tied to Splitwise and bill splitting |
| Potjesplan / Pots plan | Literal and B1-level, but generic and awkward in English |
| Geldplan, Money Flow, Allocation | Generic or jargon; ABN AMRO has "De Geldplanner" |
| **Nodig · Later · Vrij / Needs · Later · Free** | **Recommended.** The method is named by its content, the way 50/30/20 is. Ownable, literal, nothing to explain |

The screen and nav item are a verb: **Verdelen / Split** ("Verdeel je inkomen"). The principle line stays: *Eerst verdelen, dan uitgeven.*

### The groups

"Nodig", "Later" and "Vrij" each have a second reading (an adjective without a noun; procrastination; free of charge or a day off). The one-line promise under each label removes it. Alternatives considered: "Moet / Wil / Later" (duty and guilt), "Leven / Bouwen / Genieten" (positive but abstract), "Vast / Sparen / Vrij" ("Sparen" excludes investing). No research on these labels was found; this is judgment and should be tested in the customer interviews.

None of the names has been checked against the BOIP or EUIPO registers.

## 6. Screen

- One **stacked bar** for the three groups. It is the best-supported choice for non-experts (one test of about 1,000 people: [Common Cents case study](https://finsights.guide/case-studies/SUoXS5Ob/learning-from-the-lab-building-better-spending-vi)); Sankey diagrams confuse newcomers.
- A **"left to assign" state** in words: "Alles heeft een plek" or "Nog € 120 te verdelen".
- Three numbered group cards in order, each with its pots and amounts in euros first, percentage second.
- The buffer shows progress and what happens when it is full.
- One primary action: **"Laat zien wat ik moet overmaken"** — the transfer list per bank account.
- Phone first (360–430 px); long Dutch pot names wrap, amounts never do.

## 7. From six jars to the new system

| Today (`JarKey`) | Group | New pot name (NL / EN) |
| --- | --- | --- |
| `NECESSITIES` | Nodig | Nodig → later shown as Vaste kosten + Dagelijks + Af en toe |
| `LONG_TERM_SAVINGS` | Later | Buffer en doelen / Buffer and goals |
| `FINANCIAL_FREEDOM` | Later | Beleggen / Investing |
| `EDUCATION` | Later | Leren / Learning |
| `PLAY` | Vrij | Plezier / Fun |
| `GIVE` | Vrij | Geven / Giving |

Nothing is lost for existing households: every jar keeps its money, history, goals and rules.

## 8. Work, in steps

Estimates are agent work time, from a code scan on 2026-11-23 (93 files reference `JarKey`; the jar is unique per household and key; allocation is computed at read time and never stored).

| ID | Step | What changes | Priority | Size | Estimate (confidence) |
| --- | --- | --- | --- | --- | --- |
| S0 | Fix `updateSplit` validation | `jar.service.ts`: it only checks that the **submitted** entries total 100, so a partial payload can leave the household above or below 100%; it throws a plain `Error` (a 500). Found by reading, not reproduced | High | S | 30–60 min (high) |
| S1 | Groups and names, display only | Group map in contracts; group headers, order numbers and stacked bar on the jar board, onboarding split and settings; pot names via template names and i18n; website copy ("six jars" appears 43 times in copy). **No schema change** | Medium | M | 3–5 h (medium) |
| S2 | Needs shown as three lines | Fixed costs, daily and occasional shown inside Needs using existing fixed costs and jar categories. No new pots | Medium | M | 2–4 h (medium) |
| S3 | Buffer first | Buffer target and "fills first, then hands on". Likely route: the existing emergency-fund goal with first priority inside the Later pot, so no stateful allocation is needed. To confirm in design | Medium | M–L | 4–8 h (low) |
| S4 | Shares that fit the household | Onboarding derives Needs from fixed costs and suggests Later; default shares change. Doctrine decision first | Medium | M | 3–5 h (medium) |
| S5 | Tax reserve | New pot type and a split per income source for self-employed income; contract, entity, hand-written migration (native enum `money_jar_key` is shared by three tables). Belongs with the Bedrijf product | Medium | L | 1–1.5 days (low) |
| S6 | Custom and extra pots | Drop the one-jar-per-key rule, create/delete procedures, routes by id | Low | XL | split before starting |

S1 and S2 give most of the customer-visible change without touching the database. S5 and S6 are the expensive ones and can wait for validation.

**Riskiest couplings found:** jar capabilities are derived from the key (the stored value is ignored); debt payments, several Coach tips and Soul's giving page look up `NECESSITIES` or `GIVE` by key; onboarding requires exactly six entries (`.length(6)`); rounding sends the remainder to the largest share, so which pot gets the cent changes if Needs is split.

## 9. Legal and wording

- Showing budget shares and an order of pots is **informing**, not financial advice under the Wft, as long as the app does not recommend a specific financial product to a specific user ([CMS on the AFM interpretation](https://cms.law/en/nld/publication/interpretatie-afm-verduidelijking-toepassingsbereik-wft-bij-adviseren-over-financiele-producten)). Wording such as "fits your situation" next to a product would cross that line. The Beleggen pot therefore never names a product.
- Tax shares are user-set planning figures, labelled as such.
- Suggested shares are a starting point: "Een richtlijn. Jij beslist."
- Not researched: consumer-credit rules around the debt step.

## 10. What is not proven

- That customers understand three ordered groups faster than six jars. No research on the labels exists; test it in the 10–15 interviews.
- The default shares by income level. The anchors (Nibud's 10% and the 50–60% fixed-cost range) are sourced; a full table by income is inference.
- Behavioural effect sizes. A separate labelled pot and automatic transfers have the best support ([J-PAL](https://www.povertyactionlab.org/evaluation/constraints-saving-health-expenditures-kenya)); "fewer categories" and "weekly review" are weakly supported.
- S3's cheaper route through goal priority.

## 11. Decisions for Given (answered in §0; kept for history)

1. Replace the six jars with Nodig · Later · Vrij — yes or no.
2. The system name (recommended: the three words) and the group labels.
3. Where Leren and Geven sit (proposed: Later and Vrij).
4. Buffer guidance: one buffer with a target the household sets, or separate buffers for repairs and for income loss.
5. Default shares, and whether Needs is derived from real fixed costs.
6. Start with S0 + S1 now, before the customer interviews, or after.

Answers: 1 yes. 2 method **Rumtelo Pots** (to confirm), groups Basis · Toekomst · Vrij. 3 Leren in Toekomst, Geven in Vrij. 4 one pot called Buffer, target set by the household. 5 default 55 / 20 / 25 as a proposal; "derived from real fixed costs" is planned (step 3). 6 S0 and S1 were built first.
