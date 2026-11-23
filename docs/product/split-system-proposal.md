# Proposal — Rumtelo's own split system: Nodig · Later · Vrij

Status: **proposal, not decided.** Date: 2026-11-23. Money doctrine (which pots exist, default shares, the order) is Given's call. Sources are listed inline; where a figure is press- or vendor-sourced it says so. Companion: [market-research-2026-11.md](./market-research-2026-11.md).

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

## 11. Decisions for Given

1. Replace the six jars with Nodig · Later · Vrij — yes or no.
2. The system name (recommended: the three words) and the group labels.
3. Where Leren and Geven sit (proposed: Later and Vrij).
4. Buffer guidance: one buffer with a target the household sets, or separate buffers for repairs and for income loss.
5. Default shares, and whether Needs is derived from real fixed costs.
6. Start with S0 + S1 now, before the customer interviews, or after.
