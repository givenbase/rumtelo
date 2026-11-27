# The Coach, redesigned: your data first, one line after it

> **Note (2026-11-23):** This document was written when every household had six jars. A new household now starts with three pots (Basics 55 · Future 20 · Free 25) and refines them; existing households keep six. Read "six jars" below as "the household's pots" and the six-name lists as the old names. Current model: [split-system-proposal.md](./split-system-proposal.md).

**Date:** 2026-11-20 · **Owner:** ux-ui-designer · **Status:** design proposal, nothing built.
**Problem (Given):** The Coach shows up on almost every page as large cards and bars above the household's own data. It gets in the way and makes the board feel busy.
**Inputs:** `docs/product/coach-readiness.md`, `packages/contracts/src/public/platform/coach/coach-readiness.ts`, `docs/brand/positioning.md`, the clarity decisions (literal and positive labels, features stay in their product, your own entries first), and the application code on `dev` at `63c9aa40`.
**Mockups (390 px, brand tokens):** [`coach-redesign/home.svg`](./coach-redesign/home.svg) · [`coach-redesign/money-jars.svg`](./coach-redesign/money-jars.svg) · [`coach-redesign/fixed-costs.svg`](./coach-redesign/fixed-costs.svg). In the BEFORE panels, purple dashed frames and numbers mark the Coach surfaces.

**Contents:** [1 Inventory](#1-inventory-what-is-on-dev-today) · [2 Rule set](#2-the-rule-set) · [3 Coach line](#3-the-one-new-component-coachline) · [4 Flow](#4-flow) · [5 Screens](#5-screens) · [6 Copy and keys](#6-copy-and-i18n-keys) · [7 Readiness catalog](#7-readiness-catalog-changes) · [8 Build plan](#8-build-plan-one-frontend-engineer) · [9 Open questions](#9-open-questions-for-given)

---

## 1. Inventory: what is on `dev` today

"Position" is relative to the household's own data on a 390 px phone. If a tablet or desktop is different, the cell says so. "Always on" means it renders even when nothing needs doing. All paths are under `apps/application/app/`.

### 1.1 Surfaces

| # | Surface (file) | Where (route) | What it says or does | Size | Position vs your data | Readiness id |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | `WhyCaption` (`_components/features/helpers/why-caption.tsx`, `_lib/why-lines.ts`) | Shell, 11 production routes: `/`, transactions, debt, fixed costs, income, net worth, goals, learn, learn library, week check (plus deferred Energy and Soul routes) | A static "why this screen" sentence (`pages.why.routes.*`) plus a "The Coach" link. On Energy › My week it shows the top time tip instead | Bordered bar with a shadow, 1–2 lines | **Above everything**, above the Week check button and the page title. **Always on** | `why_caption` (+ `time_coach` preview) |
| S2 | `CoachVerdict` (`_components/features/home/coach-verdict.tsx`) | Home `/` | One feed tip (the next move's duplicates are already filtered out), wrapped in slider chrome: kind badge, Detail, Collapse, dots, prev/next, Share, CTA. Also has an "All tips (n)" link | Large card, headline in `lg`/`2xl` type | Phone: after the jars and the month score. **Desktop: top of the right column, level with the next move** | `inbox`, `money_tip_producers`, `growth_tip_producers` |
| S3 | `PortalHub` coach block (`features/home/portal-hub.tsx`, `_lib/portal-hubs.ts`, `_lib/portal-coach.ts`) | Money overview `/product/money` (also the Energy and Soul hubs, deferred) | The first feed tip, a Looking Ahead/Back narration, or a **fallback** ("START HERE · Start with income and fixed costs.") | Card with a tinted left border and a shadow | **Directly under the title, above the summary cards and jars. Always on** (fallback) | `money_tip_producers`, `period_travel` |
| S4 | `NecessitiesPressureCard` variant `jar` (`features/money/necessities-pressure-card.tsx`) | Money overview (embedded jars list) | "Necessities under pressure", 3 sentences, including "Do not raid Financial Freedom…", plus 2 buttons | Large warning-tone card | **Above the six jar rows** | `necessities_pressure` |
| S5 | `CoachTipCard` "Subscription check" (`fixed-costs-page.tsx`) | Money › Fixed costs | A static quarterly-review lecture: "…money you throw away monthly" | Card, 4 lines | Phone: after the active list. **≥ 640 px: right column beside the list, above the fold. Always on** | — (untracked) |
| S6 | `CoachTipCard` "Is this enough?" (`fixed-costs-page.tsx`) | Money › Fixed costs | Fixed costs as % of income vs 55%. **Same signal as S7** | Card, 3 lines | Same as S5. **Always on** when income > 0 | — (untracked) |
| S7 | `NecessitiesPressureCard` variant `plan`, compact | Money › Fixed costs | "Necessities under pressure", the same message as S4 with meta and 2 buttons | Compact warning card | After the list, the paused list and the arrears prompt | `necessities_pressure` |
| S8 | `BusinessHouseholdLeakCard` compact | Money › Fixed costs | "Business costs in your jars", plus 2 buttons | Compact warning card | Last on the page | — (untracked) |
| S9 | `CoachTipCard` business (`asset-detail-page.tsx`) | Money › Net worth › business holding | The same message as S8 | Warning card | After the holding's data | — (untracked) |
| S10 | `JarGuideCard` (`helpers/jar-guide-card.tsx`) | Money › Jar detail `/product/money/jars/[jarKey]` | "What can I use this for?": a note, "This may go to" chips, and on Give a `GivingFinder` (preview) | Large section with a gradient header and a Coach mark | After the jar's lists | `jar_guide` (+ `giving_finder`) |
| S11 | `DebtStrategyCoach` (`debt/_components/debt-strategy-coach.tsx`) | Money › Debts, Compare tab | Compares avalanche, snowball and minimum payments with real numbers | Section, Coach mark | Inside a tab the user chose. **Hidden when The Coach is off**, which leaves the Compare tab empty | `debt_strategy` |
| S12 | `IncomeSimulator` Coach mark (`features/growth/income-simulator.tsx`) | Money › Income | What-if simulator, Coach mark and accent ring | Card | After the income entries (correct already) | `income_simulator` (preview) |
| S13 | `CoachTipCard` "Got a raise or new job?" (`forms/income-form.tsx`) | Income edit form | Points to adding new income | Card inside the form | Inside the form, above the actions | — (untracked) |
| S14 | `CoachTipCard` "Bill list is tailored" (`forms/fixed-cost-form.tsx`) | Fixed-cost form | A **system notice**, not a tip: "some bill types are hidden by your household profile" | Card with 2 buttons | Inside the form | — (untracked) |
| S15 | `CoachTipCard` pledge tip + `GivingFinder` (`forms/goal-form.tsx`, `expense-form.tsx`, `fixed-cost-form.tsx`) | Give flows in forms | Explains pledges; shortlist of organisations | Card / finder | Inside the form | `giving_finder` (preview) |
| S16 | Goal advice "How to get there" (`goal-detail-page.tsx`) | Growth › Goal detail | Rule cards | Section of cards | After the goal data | `goal_advice` (preview) |
| S17 | `CoachTipCard` Education jar banner (`learn-page.tsx`) | Growth › Learn | Education-jar banner plus a CTA | Card | **Above the shelf**, under the title. Always on (shelf view) | — (untracked) |
| S18 | `CoachMark` on recommended titles (`learn-page.tsx`) | Growth › Learn | A mark per recommended item | Badge | Inline | `learn_recommended` (preview) |
| S19 | Split tips (`settings/_components/jars-settings.tsx`) | Settings › Jars | Every firing split tip (up to 11), each with "Got it". Uses `amber-500`, **not a token** | Stacked list | Under the sliders, where the decision is made | `split_coach` |
| S20 | Coach page (`product/coach/_components/coach-page.tsx`) | `/product/coach` (You menu) | A step card (smart-fill), a quiet `EmptyState`, a month-score strip and the full Insights list with Dismiss | Page | It is the Coach's own page | `inbox`, `session` |
| S21 | Quick add "Ask" (`_components/layout/quick-add.tsx`) | Global sheet | Next Coach step plus matching steps | Rows in a sheet | On demand | `session` |
| S22 | Period-travel score note (`_lib/period-travel-score-note.ts`) | Home month score | One muted sentence about a past or future month | Line inside a card | Inside the user's own score | `period_travel` |
| S23 | `CoachGuideSurface` (`helpers/helper-surface.tsx`) | — | Exported, **0 consumers** | — | — | `coach_guide_surface` (backlog) |

Not Coach, but in the same "too much above the data" pile: `PeriodTravelBanner` (shell, past or future month; warning-tone for past months), the Money layout's full-width **Week check** button (`h-12` on phones, above every Money page) and `StageNote` (shown once). They are outside this redesign, with one question in §9.

### 1.2 Count per page (production, Coach on, current month, every rule firing)

| Page | Before | Of which always on | After | Of which always on |
| --- | --- | --- | --- | --- |
| Home | 2 (S1, S2) | 1 | **1** line | 0 |
| Money overview (jars) | 2 (S3, S4) | 1 | **1** line | 0 |
| Money › Fixed costs | 5 (S1, S5, S6, S7, S8) | 3 | **1** line | 0 |
| Money › Jar detail | 1 large section (S10) | 1 | 1 **closed** disclosure | 0 (collapsed) |
| Money › Transactions | 1 (S1) | 1 | 0 | 0 |
| Money › Income (+ edit form) | 2 (S1, S13) | 1 | 0 | 0 |
| Money › Debts | 2 (S1, S11 in tab) | 1 | 1 tool (Compare tab, no Coach chrome) | 0 |
| Money › Net worth / holding | 1 + 1 (S1, S9) | 1 | 0 / ≤ 1 line | 0 |
| Money › Week check | 1 (S1) | 1 | 0 | 0 |
| Growth › Goals | 1 (S1) | 1 | 0 | 0 |
| Growth › Learn | 2 (S1, S17) | 2 | 0 | 0 |
| Settings › Jars | 1 block of n tips (S19) | 0 | ≤ 1 tip + "n more" | 0 |
| Forms (fixed cost, goal Give) | 2 cards (S14, S15) | 1 | 0 Coach cards (plain field hints) | 0 |
| **Total** | **26** | **15** | **≤ 8** | **0** |

---

## 2. The rule set

1. **Your entries first.** On every product page the order is: title and one total → toolbar → **the household's own list or numbers** → then The Coach. Nothing from The Coach sits above the first row of your data, on any breakpoint. A warning about your data lives **in** the data: an overspent jar is a full red meter with "Over by €…" in its row (principle 4). It is not a card above the row.
2. **One Coach line per page, only when there is a move.** At most one `CoachLine` per page: one sentence, one CTA, and a Hide button. It renders only when a rule fires **and** has a concrete next move. No evergreen advice, no why-bars, no fallback filler ("Start here"), no kind badges such as "Warning"/"Alert", no warning colours. The data carries the colour; The Coach stays calm.
3. **Home holds the next move; The Coach adds one line.** The next-move card is the only large call to action on Home. The Coach adds one line, and never repeats the next move. *Update (To do card): Home's top-left "To do" card holds the next move as its first item and the Coach's top tip as its last row (`useCoachLine`, same Hide/Undo); there is no separate Coach line below the jars.* "All tips (n)" opens the Coach page, which keeps the full list, dismissals and smart-fill steps.
4. **Help sits where you decide, small or closed.** Decision help stays inline at the decision: split tips under the sliders (top one only, "n more" expands), the jar guide as a closed "What is {jar} for?" disclosure, the debt compare as a tab. **Tools are not tips.** The debt compare and the income simulator drop the Coach mark and no longer disappear when The Coach is off. The Coach toggle hides tips, not tools.
5. **One source per signal, said in the house voice.** Each signal is said once, in one place. Example: "fixed costs vs the Necessities split" was in S4, S6, S7 and the feed (`money.necessities_share`). It becomes one rule with a feed-first, local-fallback source. System notices (household-profile filter) stop wearing Coach chrome and become plain field hints. The name stays **The Coach**; the voice stays one next move, positive and literal, with no "raid", "throw away" or "under pressure".

---

## 3. The one new component: `CoachLine`

**Why existing ones don't fit:** `CoachTipCard` is a titled card with free children, meta and several actions. That shape invited lectures and two-button cards. `CoachVerdict` is a slider. `CoachGuideSurface` is a wrapper with no consumers. Their replacement is a single, tightly typed line. It is app-level, not `@rumtelo/ui`, because it reads app hooks (`useHelpersEnabled`, `useBoardWriteAccess`, the dismiss API). It is built only from `@rumtelo/ui` primitives (`Typography`, `Icon`, `Button`/`Link`) and tokens.

**File:** `apps/application/app/_components/features/helpers/coach-line.tsx` (exported from `helpers/index.ts`).

```ts
type CoachLineCandidate = {
    /** Stable rule or feed id, e.g. `feed:<messageId>` or `fixed_costs.over_split`. */
    id: string;
    /** One sentence, already translated. */
    text: string;
    cta: { label: string; href: string } | { label: string; onClick: () => void };
    /** Feed tips dismiss on the server; local rules dismiss per device until `fingerprint` changes. */
    dismiss: { kind: 'feed'; messageId: string } | { kind: 'local'; fingerprint: string };
};

type CoachLineProps = {
    /** Ordered by priority; the first one not dismissed renders. Empty → renders nothing. */
    candidates: readonly CoachLineCandidate[];
    /** Optional trailing link (Home only: "All tips (n)"). */
    footer?: ReactNode;
    className?: string;
};
```

**Layout.**
- **Phone (360–430):** full width; `rounded-2xl border border-line bg-surface p-4`, no shadow, no tint, no `animate-rise`. Row 1: `✦ THE COACH` eyebrow (`text-accent`, mono 10 px) left, Hide button (`×` icon, 44×44) right. Row 2: the sentence (`text-sm text-fg text-pretty`, wraps freely, `wrap-anywhere` for bill names). Row 3: the CTA as an accent text link with `→`, `min-h-11`. The CTA sits on its own row so long NL text never squeezes it.
- **Tablet (~768):** the same stacked layout inside the page column.
- **Desktop (≥ lg):** one row: eyebrow · sentence (`flex-1 min-w-0`) · CTA (`shrink-0`) · Hide. It wraps back to the stacked layout when the sentence doesn't fit.

**States.**

| State | What renders |
| --- | --- |
| No candidate / all hidden (first run included) | Nothing: no empty state, no placeholder |
| Feed loading | Nothing. Local rules render when page data is ready. No skeleton, because the line sits after the data and a skeleton would only add movement |
| Feed error | Nothing from the feed; local rules still render. Retry lives on the Coach page |
| Success | One line |
| Hidden (×) | The line goes. Toast "Tip hidden." with **Undo** (recoverable). Feed tips use the existing `coach.dismiss`; local rules store the fingerprint per household and device and come back when the fingerprint changes (e.g. the ratio moves to a new 5-point band, or a new month starts) |
| VIEWER | Nothing (`useHelpersEnabled` is already false for VIEWER / `canSeeCoach`) |
| Practice look-along | Nothing (`capabilities.showHelpers` is false) |
| Closed or future month | Nothing (already in `useHelpersEnabled`) |
| Coach off in Settings | Nothing |
| CTA plan-locked (Basic) | The CTA keeps its label plus a lock `Icon` and the text "· Plus". The target route shows its `LockCard` / upgrade path, so it is never a dead end. Uses `capabilityKeyForPathname` like `PortalHub` does today |
| CTA in a deferred portal (Energy/Soul in production) | That candidate is skipped (`isProductEnabled`) |

**A11y.** `<aside aria-labelledby>` pointing at the eyebrow ("The Coach"). The Hide button has `aria-label` "Hide this tip" and a 44×44 target with a visible `outline-accent` focus ring. The CTA is a real `Link` (or `button` for `onClick`) whose name is the visible label. After hiding, focus moves to the page `h1` (`tabIndex={-1}`), never to `body`. Contrast: accent `#06656C` on white is about 7:1, `fg` on white well above 4.5:1, and the `×` glyph in `fg-muted` passes 3:1 as a graphic. The line contains no colour-only meaning. No drag interactions.

---

## 4. Flow

1. The household opens a page. The page renders its own data first (title, total, toolbar, list).
2. Once the page data is ready, the page builds its `CoachLine` candidates in priority order: page-scoped **feed** tip first (from `coach.feed`, matched by key prefix or `ctaHref` route), then **local rules** computed from the data already on screen.
3. `CoachLine` drops candidates that are hidden, that point into a deferred portal, or that repeat Home's next move (Home only). It renders the first one left, or nothing.
4. The person does one of three things:
   a. taps the CTA, which goes to the one move (a bill, a jar, the income form);
   b. taps ×, which hides the tip and shows a toast with Undo;
   c. ignores it. It stays at the bottom and asks nothing.
5. Every feed tip, including ones hidden on a page, can still be found on the Coach page (`/product/coach`, You menu) and through "All tips (n)" on Home. Local rules exist only on their page (see §9 Q2).

---

## 5. Screens

### 5.1 Home `/` (mockup: [`home.svg`](./coach-redesign/home.svg))

- **Remove:** the why-line (S1) and `CoachVerdict` (S2) with all its chrome: kind badge, Detail, Collapse, dots, prev/next, Share, and the 24 h collapse key in localStorage.
- **Keep:** the next-move card as the single large CTA, and the filter that drops feed tips which repeat the card (week check, `money.inbox_unsorted`, `money.due_bills`). The Practice-invite nudge remains a candidate. It is a consent action for OWNER, so it stays priority 1.
- **Phone order:** title → next move → week-1 checklist → jars hero → month score → **Coach line + "All tips (n)"** → Today → portals. Same as today's `order-6`.
- **Tablet:** same single column as the phone.
- **Desktop:** the Coach line moves out of the right column into the **left column after the month score**, so DOM order equals visual order on every width. The right column keeps checklist → Today → portals.
- **Candidates:** `[practicePending?, ...feedTips.filter(notNextMove)]`. "All tips (n)" shows only when n > 1 and the board is at the routine stage (today's rule).

### 5.2 Money overview: jars (mockup: [`money-jars.svg`](./coach-redesign/money-jars.svg))

- **Remove:** the `PortalHub` coach block (S3), including the "Start here" fallback and the Looking Ahead/Back narration. Period travel is already said by the `PeriodTravelBanner` and the hero. Also remove `NecessitiesPressureCard` above the jar rows (S4).
- **Keep:** the hub title, line and summary cards; the six jar rows with an overspent Necessities as a **full red meter**.
- **Add:** one `CoachLine` **after the jar rows and footer**, owned by `MoneyPage` (not by `JarsPageClient embed`, so it can never render twice).
- **Candidates:** (1) feed tip with key `money.necessities_share…`, (2) local rule `jars.necessities_over` from `necessitiesPressureFromJar`: "{jar} needs {amount} more than it gets this month." CTA "Open fixed costs".
- **Breakpoints:** phone single column; tablet cards `sm:grid-cols-2`; desktop unchanged. The line always comes after the jars.

### 5.3 Money › Fixed costs (mockup: [`fixed-costs.svg`](./coach-redesign/fixed-costs.svg))

- **Remove:** why-line (S1), "Subscription check" (S5), "Is this enough?" (S6), the compact pressure card (S7), the business card (S8), and the right-hand tip column. The list grid becomes **one column at every width**: `sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]` goes. Your bills get the full width.
- **Keep:** title, total, toolbar, the "Every month out" list, paused/ended, and the arrears prompt. The arrears prompt is a data action about your own bills ("turn arrears into a debt"), not a Coach tip. It keeps its place after the lists.
- **Add:** one `CoachLine` at the end.
- **Candidates in priority:**
  1. `fixed_costs.over_split` (from `evaluateNecessitiesPressure`, when active): "Fixed costs take {ratio}% of your income. Your {jar} jar gets {pct}%." CTA "Open {name}" → the **largest active bill on the Necessities jar** (`fixedDetailHref`). Variant when `shortfallCents > 0`: "{jar} bills come to {amount} a month more than the jar gets."
  2. `fixed_costs.business_costs` (from `evaluateBusinessHouseholdLeak`): "{amount} a month in business costs is paid from your household." CTA "See linked bills".
- **Fingerprint for Hide:** `${period}:${Math.floor(ratio / 5)}` and `${period}:${leakCents}`.
- **Empty / first run:** with no bills, the page's existing empty state shows and no rule can fire.

### 5.4 Money › Jar detail

- `JarGuideCard` becomes a **closed disclosure** after the jar's lists: a native `<details>` in a `Card`, with `<summary>` "What is {jar} for?" (min 44 px tall, chevron, focus ring, keyboard-operable by default). Open: the note, then "This may go to" chips, then the Give finder on Give (still preview-gated).
- No Coach mark, no gradient header. It is reference help, so it renders whether The Coach is on or off (rule 4).

### 5.5 Money › Debts

- The Compare tab (S11) stays, unchanged in content. Drop `CoachMark` and the `HelperGate`, so the tab works with The Coach off; today it renders empty.

### 5.6 Money › Income, Net worth, Transactions, Week check; Growth › Goals, Learn

- No line, because no rule with a move exists for these pages today (the why-lines go).
- Income simulator (preview): when it ships, ship it without the Coach mark (tool).
- Holding detail (S9): the business tip becomes a `CoachLine` with the same `business_costs` copy as Fixed costs (one message, one wording). CTA "See linked bills".
- Learn: remove the Education banner (S17). The `learn_recommended` mark stays preview. If it ships, the label becomes literal ("Recommended") instead of a Coach mark.
- Goal detail advice (S16): stays preview, already after the data.

### 5.7 Settings › Jars (split coach)

- Under the sliders: the **top tip only** (warn before info, then catalog order), one line plus "Got it". If more fire, a text button "{count} more tips" expands the rest in place (`aria-expanded`).
- Replace `amber-500` with `border-warning bg-warning/5` tokens.
- Stays under the Coach toggle (it is a tip, not a tool). VIEWER cannot open this tab.

### 5.8 Forms

- **Income form (edit):** remove the "Got a raise or new job?" card (S13). Adding income has its own button on the Income page.
- **Fixed-cost form:** the household-profile notice (S14) becomes a plain hint under the name field: "Some bill types are hidden by your household profile." plus a text button "Show all". No Coach mark, no card.
- **Goal form (Give):** the pledge card (S15) becomes a field hint (body only, no title, no mark). `GivingFinder` stays behind `CoachFeatureGate` (preview).

### 5.9 Coach page `/product/coach` and Quick add

- Unchanged in structure. This is where the full list lives.
- One copy fix: kind labels shown on this page lose their alarm words (§6.2).

### 5.10 Shell

- Remove `WhyCaption` and the `showWhyCaption` practice-preview capability.
- `PeriodTravelBanner`, the VIEWER look-along banner and `StageNote` stay as they are (not Coach).

---

## 6. Copy and i18n keys

EN source in `packages/i18n/translations/`. NL lines go to `overrides.ts` via the i18n specialist. **`pnpm i18n:gen` waits for Given.** Every `{jar}` is the jar's own name from the data, so a renamed jar reads right and NL never hard-codes the jar name.

### 6.1 Add

| Key | EN | NL pin (proposed) |
| --- | --- | --- |
| `features.coach.line.label` | The Coach | De Coach |
| `features.coach.line.hide` | Hide this tip | Verberg deze tip |
| `features.coach.line.hidden` | Tip hidden. | Tip verborgen. |
| `features.coach.line.undo` | Undo | Ongedaan maken |
| `features.coach.line.locked_suffix` | Plus | Plus |
| `features.money.fixed_costs.coach_line.over_split` | Fixed costs take {ratio}% of your income. Your {jar} jar gets {pct}%. | Vaste kosten zijn {ratio}% van je inkomen. Je potje {jar} krijgt {pct}%. |
| `features.money.fixed_costs.coach_line.short` | {jar} bills come to {amount} a month more than the jar gets. | Rekeningen uit {jar} zijn {amount} per maand meer dan het potje krijgt. |
| `features.money.fixed_costs.coach_line.open_bill` | Open {name} | Open {name} |
| `features.money.business_household_leak.line` | {amount} a month in business costs is paid from your household. | {amount} per maand aan zakelijke kosten betaal je vanuit je huishouden. |
| `features.money.jars.coach_line.necessities_over` | {jar} needs {amount} more than it gets this month. | {jar} heeft deze maand {amount} meer nodig dan het krijgt. |
| `features.money.jars.coach_line.open_fixed` | Open fixed costs | Open vaste kosten |
| `features.coach.jar_guide.summary` | What is {jar} for? | Waar is {jar} voor? |
| `pages.settings.jars.split_more` | {count, plural, =1 {1 more tip} other {# more tips}} | {count, plural, =1 {Nog 1 tip} other {Nog # tips}} |
| `features.money.household_profile.filter_hint` | Some bill types are hidden by your household profile. | Sommige soorten rekeningen zijn verborgen door je huishoudprofiel. |

Reused as is: `pages.dashboard.coach.all_tips`, `pages.dashboard.coach.practice_pending_*`, `features.money.business_household_leak.review_bills`, `features.money.household_profile.show_all`, `features.coach.got_it`, `features.coach.jar_guide.allowed|give_who|give_hint`. Confirm the exact parent of the Fixed costs and Settings › Jars namespaces before adding (`fixed-costs-page.tsx` and `jars-settings.tsx` `useTranslations` calls).

### 6.2 Rename (Coach page kind labels; no alarm words)

| Key | Now | New EN |
| --- | --- | --- |
| `features.coach.verdict.kind_nudge` | Attention | Next move |
| `features.coach.verdict.kind_warning` | Warning | Worth a look |
| `features.coach.verdict.kind_alert` | Alert | Act this week |

### 6.3 Drop (engineer greps each one before deleting; also remove the matching lines in `overrides.ts`)

- `pages.why.routes.*` (only `why-lines.ts` reads them) and `features.coach.helpers.why_aria`.
- `features.coach.verdict.eyebrow|share|open|detail|message_n|month_score_badge|month_score_slide|previous|next|collapse|expand|collapsed_clear|collapsed_attention|collapsed_waiting`. Keep the `kind_*` labels; the Coach page uses them via `coach-kind-label.ts`.
- `features.money.hub.fallback_coach_kind|fallback_coach_text|fallback_coach_cta` and the same three under `features.energy.hub` and `features.soul.hub`.
- `features.coach.period_travel.looking_back_*|looking_ahead_*|jar_highlight`, **only if** nothing but `period-travel-coach-copy.ts` reads them. `pace_needed` / `past_note` may feed the Home score note: check first.
- The Fixed costs keys `coach_subscription_*` and `coach_enough_*`.
- `features.money.necessities_pressure.*` (copy replaced by §6.1).
- `features.money.business_household_leak.title|body|body_named|meta|open_holding` (one `line` replaces them).
- `features.growth.net_worth.detail.coach_business_title|coach_business_body`.
- `features.growth.learn.jar_coach_title|jar_banner|jar_cta`.
- Income form `raise_tip_title|raise_tip_body|raise_tip_link`.
- `features.money.household_profile.filter_tip_title|filter_tip_body|open_settings` (if `open_settings` has no other reader).
- `features.growth.goals.form.pledge_tip_title` (the body stays as the hint).
- `features.coach.jar_guide.aria|heading|footer|turn_off` if unused after the disclosure.
- `features.coach.helpers.locked_cta` (emoji in copy; replaced by the Icon plus `locked_suffix`).

---

## 7. Readiness catalog changes

Edit `packages/contracts/src/public/platform/coach/coach-readiness.ts` and `docs/product/coach-readiness.md` together:

- **Add** `coach_line`: SHIP, "One Coach line per page, after your data", where "Home, Money overview, Fixed costs, holding detail".
- **Remove** `why_caption` (surface deleted) and `coach_guide_surface` (superseded by `coach_line`).
- **Update** `necessities_pressure` where → "Coach line on Money overview + Fixed costs", `jar_guide` → "Jar detail disclosure", `period_travel` → "Home month-score note", `split_coach_c` intent → "Weekly split tip as a feed producer (shows in the Home Coach line)".
- Add a "Placement rule" paragraph to `coach-readiness.md` that links to §2 of this doc, so new surfaces can't add a second line or a card above data.

---

## 8. Build plan (one frontend engineer)

**Overall:** Medium priority · **L** (≈ 5–8 h agent time, medium confidence; most of the time goes on deletions and the key cleanup). Ask Given before starting (L rule). One commit group per row is fine, in this order:

| ID | Task | Files (under `apps/application/app/` unless stated) | Size · estimate |
| --- | --- | --- | --- |
| C1 | `CoachLine` + local hide store | **New** `_components/features/helpers/coach-line.tsx`; **new** `_lib/coach-line-dismiss.ts` (localStorage via `storageKey('coach','line', …)` → fingerprint, same util as `coach-verdict.tsx`'s `COLLAPSED_KEY`); export from `helpers/index.ts`; keys §6.1 | M · 1.5–2 h |
| C2 | Remove the why-line | Delete `helpers/why-caption.tsx`, `_lib/why-lines.ts`; edit `_components/layout/household-shell.tsx` (drop the `WhyCaption` block) and `_lib/practice-preview-capabilities.ts` (drop `showWhyCaption`); drop keys | S · 0.5 h |
| C3 | Home | Edit `(routes)/[locale]/(app)/(household)/_components/home-dashboard.tsx` (replace `CoachVerdict` with `CoachLine`, move it into the left column after month score); delete `features/home/coach-verdict.tsx`; remove the "inside CoachVerdict" mode in `month-score-log.tsx` if unused | S · 0.5–1 h |
| C4 | Money overview | Edit `features/home/portal-hub.tsx` (drop the `coach` prop and block), `money-portal-hub.tsx`, `energy-portal-hub.tsx`, `soul-portal-hub.tsx`, `_lib/portal-hubs.ts` (drop `fallbackCoach`); delete `_lib/portal-coach.ts` and `_lib/period-travel-coach-copy.ts` if unused; edit `product/money/jars/_components/jars-page.tsx` (drop the pressure card); edit `product/money/page.tsx` (add `CoachLine` after `JarsPageClient`, candidates from the feed + `necessitiesPressureFromJar`) | M · 1–1.5 h |
| C5 | Fixed costs | Edit `product/money/fixed-costs/_components/fixed-costs-page.tsx`: remove S5–S8 and the two-column grid, add `CoachLine` at the end (rules §5.3); delete `features/money/necessities-pressure-card.tsx`; turn `business-household-leak-card.tsx` into a candidate builder (or build the candidate inline in both callers); edit `product/money/net-worth/_components/asset-detail-page.tsx` (S9 → `CoachLine`) | M · 1–1.5 h |
| C6 | Inline help and forms | `helpers/jar-guide-card.tsx` → disclosure; `product/money/debt/_components/debt-strategy-coach.tsx` (drop `CoachMark` + `HelperGate`); `settings/_components/jars-settings.tsx` (top tip + "n more", tokens); `forms/income-form.tsx` (remove S13); `forms/fixed-cost-form.tsx` (S14 → hint); `forms/goal-form.tsx` (S15 → hint); `product/growth/learn/_components/learn-page.tsx` (remove S17); `product/soul/giving/_components/giving-page.tsx` (its `CoachTipCard` → `CoachLine`; deferred portal); then delete `helpers/coach-tip-card.tsx` and `helpers/helper-surface.tsx` once no consumers remain | M · 1.5–2 h |
| C7 | Catalog, docs, keys | `packages/contracts/src/public/platform/coach/coach-readiness.ts`, `docs/product/coach-readiness.md` (§7); drop keys §6.3 in `packages/i18n/translations/` + `overrides.ts`; rename §6.2 | S · 0.5–1 h |

**Verification:** `pnpm --filter @rumtelo/contracts check-types`, `pnpm --filter @rumtelo/application check-types`, `pnpm lint:check`, `pnpm --filter @rumtelo/i18n test` (key parity), `pnpm --filter @rumtelo/application build`. Also run a grep for `CoachTipCard|WhyCaption|CoachVerdict|CoachGuideSurface|NecessitiesPressureCard`, which must return nothing. Staging (Given): 390 px and 768 px on Home, Money, Fixed costs, Jar detail, Settings › Jars, as OWNER, VIEWER and Practice look-along; a past month (no lines); a long NL session.

**Pending for Given after the build:** `pnpm i18n:gen` (NL pins in `overrides.ts`, es/fr regenerate).

**Out of scope:** new feed producers (e.g. a quarterly subscription tip), Coach page layout, `PeriodTravelBanner` styling, the Week check button size.

---

## 9. Open questions for Given

1. **Money doctrine: the one move when fixed costs go over the Necessities split.** I propose "Open {biggest Necessities bill}" on Fixed costs (simplify first) and drop the second button "+ Raise income". The doctrine says "simplify and/or raise income"; one CTA means picking one. OK, or should it be "Add income"?
2. **Local rules vs the feed.** Fixed-cost and business-cost rules run in the browser today, so hiding them is per device and they don't appear on the Coach page. Fine for now, or should the backend produce them as feed tips (household-wide hide, listed on the Coach page)? That is backend work in `MoneyCoachService`, roughly M.
3. **Drop the "Subscription check" entirely**, or bring it back later as a once-a-quarter feed tip with a move ("Review {count} subscriptions")? I recommend dropping now and adding a backlog line.
4. **Week check button above every Money page.** It is also above your data (full-width, 48 px on phones). Keep it there because it is the routine (principle 2), or move it into the Money toolbar row as a normal-size button? Not part of this build unless you say so.

---

## Decisions (Given, 20 Nov 2026)

1. **Fixed costs over the Necessities split:** the Coach line offers **two** actions, both positive. "Add income" is the primary action and "Open the biggest fixed cost" the secondary one. This is the one exception to "one action". In addition, the Fixed costs list **marks items you could cancel or lower**, such as subscriptions, food and drink deliveries and other optional recurring costs, with a neutral chip ("Could cancel?" / "Kun je opzeggen?"). The chip carries no warning colour and no shame (principle 4). Base the mark on the existing preset and merchant categories; never guess.
2. **Source of product-page tips:** the backend Coach feed. A dismissed tip is hidden for the whole household and stays listed on the Coach page.
3. **Subscription check:** removed from the page. It comes back later as a quarterly feed tip.
4. **Week check button:** a compact button in the page header, not a full-width bar above your data.
