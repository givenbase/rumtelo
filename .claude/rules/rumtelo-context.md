# Rumtelo product context (always on)

Shared context for the main session and every agent. Stack and code conventions live in `workflow.md` and the path rules; this file covers the product, the people and the bar. Deeper: `docs/README.md` (index), `docs/product/*`, `docs/brand/positioning.md`, `HANDOFF.md` (may be stale — code wins).

## What Rumtelo is

**Stop wondering where it went.** Rumtelo — grip on life. Not a budget app: clear tools so a household sees where money, time and energy went and gets grip again, with The Coach tipping and the household choosing.

The loop: income lands and splits into **pots** the same second (three to start: Basics 55 · Future 20 · Free 25) → fixed costs draw from those pots → transactions land in an **Inbox** and get sorted (rule or hand) → a ten-minute **week check** each week (LOOK → REDIRECT → INTEND → DONE) → a **month score** closes the turn.

| Portal (NL) | Answers | Code | Launch |
| --- | --- | --- | --- |
| **Money** (Geld) | Where does this month go? | `money/*` — jar, income, fixed-cost, account, transaction, rule, goal, debt, month-score, week-check, dashboard | Production |
| **Planning** (Planning) | How do I move forward from here? | `growth/*` — goals, **Course** (NL *Koers*: Today/Week/Goals; Focus, Habit, Discipline, Check, Advice), income levers/milestones, assets | Production |
| **Energy** (Energie) | What am I running on? | `energy/*` | Staging only |
| **Mindset** (Mindset) | Why am I doing this? | **Learn** (code and route still `growth/learn`) + `soul/*` | Learn in production; the `soul/*` pages local dev only |

Names decided 2026-11-24: user-facing, Growth is **Planning** and Soul is **Mindset** (same word in EN and NL); Learn sits under the Mindset tab. Code keys, routes, folders, enums and tables keep `growth` and `soul`. Never write Growth/Groei or Soul/Ziel as a product name in copy; the ordinary word grow/growth is fine. Still open: Bedrijf/Business, Mensen/People, Administratie/Admin.

- **Rumtelo Pots** (NL *Rumtelo-potjes*; UI word "pot", code `jar`). Every household starts with three main pots, one per group (`JarGroup`): **Basics/Basis 55 %** (`NECESSITIES`, "what has to be paid"), **Future/Toekomst 20 %** (`LONG_TERM_SAVINGS`, "what you build"), **Free/Vrij 25 %** (`PLAY`, "what you choose"). It can refine a group by turning on optional pots — `DAILY` (Basics); `GOALS`, `FINANCIAL_FREEDOM` (Investing), `EDUCATION` (Learning) (Future); `GIVE` (Free) — each takes its share out of the group's main pot, so group totals never change. A household has 3–8 pots; existing ones keep six. Anything aimed at an absent pot lands in the group's main pot. Source: `jar.util.ts`; behaviour: `apps/backend/src/modules/public/product/money/README.md`. Built: the fixed-cost form asks "Moet dit, of kies je dit?" (picks the pot, stores nothing) and split settings show a "Basics fit" hint (a button that fills in the split). A pot's running balance is priced month by month from `money_jar_share`. Planned, not built: Buffer fills first, category tags, automatic Basics from real fixed costs (`docs/BACKLOG.md`). Pots hold money; goals hold decisions (focus/rank, then claim).
- **Launch gating:** `packages/contracts/src/backoffice/plan/launch-products.ts` defers Energy + Soul (Mindset's own pages) when `NODE_ENV=production` — staging included. The Mindset tab still shows there, with only Learn in it (`apps/application/app/_lib/nav.ts`). Coach surfaces are gated per row in `coach-readiness.ts` (`ship` / `preview` / `backlog`; see `docs/product/coach-readiness.md`).
- **The Coach** (`public/platform/coach`): rule-based tips, always with one CTA. Not AI advice, never replaces a human coach.
- Every new area is added in all four layers or not at all: backend module, contract, route, DB.

## Plans and pricing (source: `packages/contracts/src/backoffice/plan/plan.util.ts`)

- **Basic / Plus / Max** (`PlanKey`). Capabilities (`CAPABILITIES.*`) gate which features exist; `PLAN_LIMITS` caps seats, goals, bank links, learn entries. Retail and seat add-ons are constants there (`PLAN_RETAIL_CENTS`, `SEAT_ADDON_UNIT_CENTS`). Course is Plus and Max only.
- **Practice:** base + per staff seat + per MANAGE client (Plus retail − `PRACTICE_CLIENT_DISCOUNT_PCT`); VIEW clients are free. Read the constants — never hard-code prices in copy or code.
- Any change to prices, limits or grants is Given's call.

## People and what they may do

**Household** = better-auth organization (`auth.household`); a person can be in up to five and switches the active one.

| `HouseholdRole` | May do |
| --- | --- |
| OWNER | Everything: settings, members, billing, all portals |
| MEMBER | Day-to-day CRUD in portals; read settings; invite when the plan allows |
| VIEWER | Read only (limited portals) |

- `HouseholdRelation` (`FAMILY` / `CIRCLE` / `EXTERNAL`) says who someone is to the board — soft UX only, **never authz**. Invites never offer OWNER; defaults VIEWER + FAMILY.
- Role matrix: `packages/contracts/src/public/platform/household/role-permissions.ts`, enforced by `RolePermissionInterceptor`. Plan capability = *what exists*; role = *what this member may do*. Both apply.
- Person-attributed rows (`PersonalHouseholdEntity`) carry maker + visibility (`docs/engineering/household-visibility-plan.md`).

**Practice** (B2B, `public/platform/practice/*`, own control plane — never better-auth organization):

- Staff (`PracticeRole` OWNER / ADMIN / COACH) see clients only through a **`PracticeClientLink`** (access `VIEW` | `MANAGE` + control flags).
- **Dual consent:** every link starts `INVITED`; only the household OWNER's accept (`householdAcceptedAt`) makes it `ACTIVE`, and only then is data shared. Either side can end it (`REVOKED`).
- MANAGE ⇒ the practice sponsors Plus and meters a client seat, applied on accept, not on invite. VIEW = free look-along.
- Rumtelo never moves money and is not *bewindvoering*.

## Audience and market

People who are doing well, people who want change, people who want to be successful but lack a map — and the practices (budget coaches, debt-help/social work, advisors, life coaches) who help them. Start: the owner and friends, then subscription. NL/EU-first, EU-resident data. Copy EN first, NL second; `es`/`fr` generated.

## Principles (a feature that fights one loses)

1. **Split first, spend second** (*Eerst verdelen, dan uitgeven*) — money gets a job before it is spent.
2. **Ten minutes a week** — reward a short repeating routine, not constant vigilance.
3. **Energy carries money** — a tired head spends; a rested head decides.
4. **Information, never shame** — an over-the-line jar is a signal with one next move; overspent jars render as a full red meter, not empty; weak correlations stay hidden until there is enough data.

## Voice (`docs/brand/positioning.md`, lines in `docs/brand/quotes.md`)

Direct, punchy, product-clear; strong and calm. Name the problem (where it went), then one move. No shame, panic, hustle, luxury flex, crypto hype or soft abstraction ("clarity", "ambition"). **The Coach** = in-app; a coach/advisor = human via Practice. Weekly habit = **routine**, never "practice". The planner in Planning = **Course**, never "plan".

## Quality bar

Senior level on a money product used by families: correct to the cent, household-isolated, consent-respecting, tested and documented. Design as if there were 100× the households. Name any compromise and its consequence. Say when you see a better alternative or a risk.
