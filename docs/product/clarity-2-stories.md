# Clarity 2: stories for the first week (CL-4, CL-5, CL-6, CL-8, CL-9)

> **Note (2026-11-23):** This document was written when every household had six jars. A new household now starts with three pots (Basics 55 · Future 20 · Free 25) and refines them; existing households keep six. Read "six jars" below as "the household's pots" and the six-name lists as the old names. Current model: [split-system-proposal.md](./split-system-proposal.md).

**Date:** 2026-11-17 · **Owner:** product-manager · **Status:** ready for design and build, nothing built yet.
**Source:** [`clarity-audit.md`](./clarity-audit.md) §4, §6, §8. Given accepted decisions **D1–D11** as recommended. This release covers **CL-4, CL-5, CL-6, CL-8 and CL-9**.

**Not in this release:** CL-12 (event-based unlock ladder and "Show everything now"), CL-13 (Quick add by unlock), Course-lite for Basic (D7), the read-only debt list for Basic (D11), and Energy/Soul in production. When a story below needs a "not yet" condition, it uses a **plain data check** that already exists or comes from one small server field (S-5.1). It never uses a stored unlock state.

**Size scale (D9, `CLAUDE.md`):** S < 1 h · M 1–4 h · L 4 h–1 day of agent effort.

**Rules that apply to every story** (they are not repeated in each one):

- **Plan and role are both checked.** Plan capability (`CAPABILITIES.*`) decides *what exists*. `HouseholdRole` decides *what this person may do*. The server enforces both through `RequireCapability` and `RolePermissionInterceptor`; the UI only mirrors them. `HouseholdRelation` never changes what someone may do.
- **VIEWER** can open Home and Money only, and only to read. VIEWER has no Growth and no Coach, and never sees an upgrade CTA.
- **Practice preview** (a staff member viewing a client board through an `ACTIVE` `PracticeClientLink`) is read-only for both VIEW and MANAGE. In preview, `canMutate`, `showQuickAdd`, `showSettings` and `showHelpers` are all false (`practice-preview-capabilities.ts`). An `INVITED` or `REVOKED` link gives no board at all.
- **The Coach turned off** means two settings: the household setting `features.isCoachEnabled = false` and the personal helpers preference (`feature-helpers.ts`). Turning the Coach off never hides the week check or the next move.
- **Launch:** Energy and Soul stay deferred when `NODE_ENV=production` (`launch-products.ts`), and no production surface in this release links to them. Coach rows marked `preview` stay hidden in production.
- **Money:** integer minor units only, and every split goes through `allocateByPercentage` (`@rumtelo/utils`, re-exported by `money.util.ts`). The remainder goes to the largest share. The client never computes a split.
- **Copy:** EN first, NL second. Use the product nouns *week check / weekcheck*, *jars / potjes*, *Inbox*, *Course / Koers* and *The Coach / De Coach*. Copy never says "plan" for Course, and calls the weekly habit a *routine*.
- **Done means:** contracts first, a spec for every business rule that includes a cross-household sad path, EN and NL keys, and testing at 375 px and 1280 px.

---

## CL-4 · One week check, findable without the Coach

**Why:** principle 2 (*ten minutes a week*) is the habit the product sells. Today the week check has no menu entry, and its only door (`home-dashboard.tsx` Coach fallback) disappears when the Coach is off. Course has a second flow with the same name (`/product/growth/course/week-check`), and the Course schedule shows **two** checks every Sunday (`course-schedule.service.ts`: `GROWTH_WEEK_CHECK` and `MONEY_WEEK_CHECK`). D5 decided to fold them into **one routine with one name**, with the Money stages first.

**How the two checks line up today** (keep these rules, don't invent new ones):

| | Week key | On Sunday | Server |
| --- | --- | --- | --- |
| Money stages | `currentWeekKey(today)`: the ISO week that contains today | the week that **ends** today | `money.weekCheck.current/advance` (LOOK → REDIRECT → INTEND → DONE) |
| Course stages | `weekCheckWeekFor(today)`: on Sunday, the **next** week | look back on this week, plan the next one | `growth.weekCheck.current/complete` + `growth.course.period` + `growth.course.rhythm.suggestions` |

On Sunday, the planned check day, the two keys already line up: Money reviews week *W*, and Course looks back on *W* and plans *W+1*. The folded flow keeps both keys exactly as they are, and neither backend needs a migration.

### S-4.1 · The folded week check flow

**Story:** As a household **owner or member**, I want one ten-minute week check that covers my jars and, on Plus or Max, my Course for next week, so that I have one weekly routine instead of two.

**Acceptance criteria**

1. **Given** an OWNER or MEMBER on **Basic**, **when** they open `/product/money/week-check`, **then** the flow runs **Look → Redirect → Intend → Done**, as it does today. Redirect is skipped when `surplus = 0`, and there are no Course stages.
2. **Given** an OWNER or MEMBER on **Plus or Max** (has `growthCourse`), **when** they open the week check, **then** the flow runs **Look → Redirect → Intend → Course: last week's three → Routines → Next week's three → Done**. The header shows "Step x of n · about ten minutes".
3. **Given** the Money stages are finished, **when** the user reaches the first Course stage, **then** the Money check is saved at stage `INTEND` (intention stored), but **not** `DONE`.
4. **Given** the user is on any Course stage, **when** they choose **"Skip Course this week"**, **then** `money.weekCheck.advance(DONE)` is written and the flow shows Done. `growth.weekCheck.complete` is **not** called, and Course shows that week's check as open.
5. **Given** the user finishes the last Course stage, **when** they press Done, **then** the client calls `growth.weekCheck.complete({ week: weekCheckWeekFor(today) })` and then `money.weekCheck.advance({ stage: DONE, week: currentWeekKey(today) })`. One success toast appears, and Home, Money and the Course schedule show the check as done.
6. **Given** step 5 succeeds for Course but fails for Money (network or 5xx), **when** the user retries, **then** retrying only re-sends the Money `DONE` call. Both calls are idempotent: completing twice keeps the first `completedAt`. Today `advance(DONE)` overwrites `completedAt`, so fix that. The user never has to redo a stage.
7. **Given** a check was left at `INTEND` (Plus or Max), **when** the user reopens it that week, **then** it resumes at the first Course stage with the saved intention shown. **Given** it was left at `LOOK` or `REDIRECT`, **then** it resumes at that stage, as it does today.
8. **Given** this week's check is already `DONE`, **when** anyone opens the page, **then** they see the Done summary (allocations, intention and, on Plus or Max, next week's three). A "Look again" option re-runs **Look** read-only and doesn't change `completedAt`.
9. **Given** a **VIEWER**, **when** they open the URL directly, **then** they see a read-only summary: this week's status ("Done on {day}" or "Not done yet") and the Look recap per jar. There are no buttons and no Course stages, because VIEWER has no Growth.
10. **Given** a **Practice preview** on an `ACTIVE` link, **when** staff open the week check, **then** they see the same read-only summary as a VIEWER. The Course part shows only when the client's plan has `growthCourse` and the link may read Growth. No write procedure is called.
11. **Given** two writable members open the check in the same week, **when** one of them advances a stage, **then** the other sees the new stage after a refetch. It is one check per household per week, and the last write wins. The UI never shows a stage as done that the server hasn't confirmed.
12. **Given** a household that was **downgraded** from Plus to Basic mid-week, **when** they open the check, **then** the Course stages are gone and earlier Course data is kept. The server rejects `growth.weekCheck.complete` without `growthCourse` (S-4.3).
13. **Given** a jar is overspent, **when** Look shows it, **then** the jar shows as a full red meter with one next move ("Move from Play"). The copy never shames: no "failed" and no red text blocks (principle 4).
14. **Given** an API error on any stage, **when** the save fails, **then** the user stays on that stage with their input kept and sees an error toast with a Retry button.

**Edge cases:**

- Zero income: every jar is 0, and Look shows "No income this month yet" with a link to Income.
- No jars (corrupted board): show an error state, never an empty wizard.
- Non-EUR household currency: amounts use the household currency.
- The active household changes mid-flow: the flow re-keys to the new household, and nothing is written to the old one.
- A check opened Monday to Saturday uses the existing week keys (see open question Q2).

**Out of scope:** new stages, changes to the Course "day" or "quarter" layers, a per-member week check, reminders (`weekCheck.reminderDay` stays as it is), and Energy or Soul week checks.

**MoSCoW:** Must · **Size:** L · **Priority:** 1 in CL-4.

### S-4.2 · Entry points that don't depend on the Coach

**Story:** As a household **owner or member**, I want the week check in the same place every week, so that I don't need a Coach tip to find my routine.

**Acceptance criteria**

1. **Given** an OWNER or MEMBER on any plan, **when** they are on any Money page, **then** the Money header shows a **Week check** button. It is the primary style when this week's check is due and not done (rule in S-5.2), and the secondary style otherwise. When the check is done, the label reads "Week check ✓".
2. **Given** the Coach is turned off (household setting and helpers), **when** the user is on Money or Home, **then** the button and the Home next-move card (S-5.2) still show.
3. **Given** a VIEWER, **when** they are on Money, **then** the button reads "View week check" and opens the read-only summary (S-4.1 #9).
4. **Given** a Practice preview, **when** staff are on the client's Money page, **then** the same "View week check" button shows.
5. **Given** the Course schedule (Today and Week views) and the ICS export, **when** they list Sunday entries, **then** there is **one** "Week check" entry per Sunday, linking to `/product/money/week-check`:
   - Plus and Max: the separate `GROWTH_WEEK_CHECK` entry is no longer emitted.
   - The entry counts as done when the Money check for that week is `DONE`.
6. **Given** the Coach rule-based week-check tip (`CoachKind.WEEK_CHECK`) still fires, **when** the next-move card already shows "Start week check", **then** Home doesn't show the Coach tip as well (S-5.3 #3).

**Edge cases:** the user opens the week check from the Course schedule on a Sunday that has already passed: they get this week's check, not the old one (Q2). There may be several Sundays in the export range, each with one entry.

**Out of scope:** a nav item named "Week check" (it is a button in Money, not a destination; CL-8), and reminders.

**MoSCoW:** Must · **Size:** M · **Priority:** 2 in CL-4.

### S-4.3 · Retire the Course week check route and gate its procedures

**Story:** As a **Plus household member** with an old link or calendar event, I want `/product/growth/course/week-check` to bring me to the one week check, so that nothing breaks.

**Acceptance criteria**

1. **Given** any user, **when** they open `/[locale]/product/growth/course/week-check` (with or without a query string), **then** the server redirects them (permanent, 308) to `/[locale]/product/money/week-check?from=course`. The locale is kept.
2. **Given** `from=course` on Plus or Max, **when** the Money stages are already at `INTEND` or later this week, **then** the flow opens at the first Course stage. Otherwise it starts at Look. Plus and Max never skip the Money stages.
3. **Given** `from=course` on Basic or for a VIEWER, **when** the page loads, **then** the parameter is ignored (Basic: Money stages only; VIEWER: the read-only summary).
4. **Given** the Course page header link (`course-page.tsx:133`, `growthPath('course','week-check')`), **when** it renders, **then** it links straight to `/product/money/week-check?from=course`.
5. **Given** `growth.weekCheck.current` and `growth.weekCheck.complete`, **when** a household without `growthCourse` calls them, **then** the server rejects them with the plan-locked error. They are ungated today, which breaks the rule that Course is Plus or Max only.
6. **Given** a VIEWER calls `growth.weekCheck.current` (VIEWER has no Growth), **then** it is rejected by role, as it is today. Reading must never lazily create a row for a role that cannot write.
7. **Given** the old `course/_components/week-check-page.tsx`, **when** this ships, **then** its Course stages are reused inside the folded flow and the standalone page component is deleted. There is no second copy.

**Edge cases:** a bookmarked URL without a locale goes through the locale middleware first, then the redirect. Translation keys `features.growth.course.week_check.*` are reused by the stages, and the page-level keys are removed.

**Out of scope:** removing the `growth.week_check` table or procedures. They still record that the Course part was completed.

**MoSCoW:** Must · **Size:** S · **Priority:** 3 in CL-4.

**Principles:** 2 is strengthened (one routine and one door). 1 is unchanged (Redirect gives spare money a job). 4: overspent jars show as a full red meter with one move. 3 is not touched (Energy is deferred).

---

## CL-5 · Home in week 1: one next move, driven by state

**Why:** Home has about 20 tappable targets and 3 competing primary actions. It shows a month score and levels on day 1, and its empty state ("All sorted — time for intention.") praises doing nothing and points to Soul. D4 decided to hold the month score until there is a week to score, and to show levels only after the first close.

### S-5.1 · Server facts for first-run Home (contract addition)

**Story:** As a household **member**, I want Home to know whether I've added spending, done a week check or closed a month, so that it shows me only what fits where I am.

**Contract:** add to the `money.dashboard.get` output (`dashboard.schema.ts`):

```ts
/** Plain data facts for Home's first-run layout. Not an unlock system (CL-12 is separate). */
progress: z.object({
    hasTransactions: z.boolean(),        // any non-deleted transaction on the board, all time
    hasCompletedWeekCheck: z.boolean(),  // any money week check with completedAt, all time
    weekCheckDoneThisWeek: z.boolean(),  // money check for currentWeekKey(today) is DONE
    hasClosedMonth: z.boolean(),         // any closed month score, all time
}),
```

The dashboard service gets these facts from the transaction, week-check and month-score **services**, never from their tables. Each fact is an `EXISTS`/`LIMIT 1` query, not a count. `inboxCount`, `monthScore.daysLeft`, `monthScore.isClosed` and `monthScore.priorOpenPeriod` already exist.

**Acceptance criteria**

1. **Given** household A has transactions and household B has none, **when** B requests the dashboard, **then** `hasTransactions = false`. The facts are scoped through `HouseholdScopedRepository`, with a spec covering the cross-household case.
2. **Given** a Practice preview on an `ACTIVE` link, **when** the dashboard is read, **then** the facts come from the client's household. An `INVITED` or `REVOKED` link returns no dashboard.
3. **Given** period travel (looking at a past or future month), **then** `progress` is always "as of now" and does not depend on the selected period.

**MoSCoW:** Must · **Size:** S · **Priority:** 1 in CL-5.

### S-5.2 · The next-move card

**Story:** As a household **owner or member**, I want Home to show exactly one next move, so that I always know what to do and nothing competes with it.

**State rules.** The first matching row wins:

| # | When (data) | Card (EN; NL from audit §6) | Primary CTA |
| --- | --- | --- | --- |
| 1 | `monthScore.priorOpenPeriod` is set | "Close {month}: see your score and carry what's left." | Close month |
| 2 | `!progress.hasTransactions` | "Your jars are filled. Now see where it goes." … | Add a transaction (Plus/Max: secondary "Import a statement") |
| 3 | `inboxCount > 0` | "{n} lines in your Inbox — about {m} minutes." (m = ceil(n/6), at least 1) | Sort the Inbox |
| 4 | `!weekCheckDoneThisWeek` and the week check is **due** | "Inbox clear. Your week check is ready — ten minutes." | Start week check |
| 5 | `daysLeft ≤ 6` and `!monthScore.isClosed` | "Close {month}: see your score and carry what's left." | Close month |
| 6 | otherwise | **New calm state:** "Every euro has a job. Next week check: {weekday}." / "Elk bedrag heeft een taak. Volgende weekcheck: {weekday}." | none (link "See your jars") |

**The week check is due** on Friday, Saturday or Sunday, or from `weekCheck.reminderDay` onward when the household has set one. That gives the check a weekend window without a new setting.

**Acceptance criteria**

1. **Given** a row in the table, **when** its condition is the first true one, **then** Home shows exactly that card with **one** primary button. No other primary button shows on Home.
2. **Given** a VIEWER, **when** Home renders, **then** the card shows the state text without action buttons for rows 1–5 (for example "{n} lines waiting in the Inbox").
3. **Given** a Practice preview, **then** it behaves like a VIEWER (read-only text, no CTA).
4. **Given** the Coach is turned off, **then** the card still shows. It is product state, not a Coach tip.
5. **Given** the user is travelling to another period, **then** the card describes the current period and its CTAs act on the current period. Rows 1 and 5 name the month they close.
6. **Given** zero income and row 2, **then** the copy reads "No income yet? Add it when it lands — your jars split it the same second." and the CTA is "Add income". This state is information, never shame.
7. **Given** the dashboard query fails, **then** the card area shows an inline error with Retry. It never falls back to a guessed state.
8. **Given** row 1 or 5 and a MEMBER, **then** Close month works as it does today (MEMBER has day-to-day Money rights), reusing the existing close dialog with bill dispositions.

**Edge cases:**

- The Inbox is cleared while Home is open: after the refetch, the card moves on to the next matching row.
- A household opens on a Friday with no transactions: row 2 wins over row 4, because there is nothing to check yet.
- A month ends with no transactions: row 2 still comes before row 5 (row order handles this).
- `periodStartDay ≠ 1`: `daysLeft` already follows the household's period.

**Out of scope:** Course "Set your 3" as a next move (it needs CL-12 triggers), and push or e-mail.

**MoSCoW:** Must · **Size:** M · **Priority:** 2 in CL-5.

### S-5.3 · Quiet Home in week 1: hold the score, one Coach tip

**Story:** As a **new household**, I want Home to hide what doesn't apply to me yet, so that I'm not scored or shown levels before I've lived one week with my jars.

**Acceptance criteria**

1. **The month score block** (`MonthScoreLog`) shows only when `progress.hasCompletedWeekCheck` **or** `daysLeft ≤ 6` **or** `priorOpenPeriod` **or** `progress.hasClosedMonth`. Otherwise it isn't rendered, whether the Coach is on or off.
2. **Levels** (Beginner…Compass) show only when `progress.hasClosedMonth`. The "unlocks" line (`dashboard.levels.unlocks`) is **not rendered at all** (D4: the fake unlocks are removed from the UI). Removing `MonthScoreUnlockKey` from the server belongs to CL-12.
3. **One Coach tip:** when the Coach is on, Home shows at most **one** Coach message. It is the first one left after filtering out any message that repeats the next-move card (inbox, week check, month close). A link "All tips ({n})" opens the Coach page, but only for roles that can see the Coach (not VIEWER).
4. **The stat row** (average left / safe per day / Play left) shows only when `progress.hasTransactions`.
5. **The Growth widget** shows only for roles with Growth **and** when `progress.hasCompletedWeekCheck`. **The Today card** (Course) keeps its own `growthCourse` gate and also shows only when `progress.hasCompletedWeekCheck`.
6. **The empty state is replaced.** `dashboard.coach.all_sorted` ("All sorted — time for intention.") is removed from Home. The calm state of S-5.2 row 6 takes its place, with no link to Soul or Energy.
7. **The dream line** stays on Home (CL-7 shipped) wherever the household has a `why`.
8. **The jars always show.** The six jar meters and the hero total ("Distributed {amount}") show from day 1, for every role.
9. **The week-1 checklist** (S-6.5) sits below the next-move card, with links only and no primary button.

**Edge cases:**

- An existing household with closed months sees everything as before.
- A household with a closed month but no week check yet sees the score (rule 1, through `hasClosedMonth`).
- Helpers off: `MonthScoreLog` renders outside the slider today, and the same hold rules apply there.

**Out of scope:** removing level names (D4 keeps them), the CL-12 ladder and "Show everything now", and the Quick add kinds (CL-13).

**MoSCoW:** Must (1, 2, 3, 6, 8) · Should (4, 5) · **Size:** M · **Priority:** 3 in CL-5.

**Principles:** 4 (a score only once there is something to score, and no praise for doing nothing). 2 (Home points to the routine). 1 (the jars and the split always show). 3 is not touched.

---

## CL-6 · Onboarding in two screens: income, then the split in euros

**Why:** onboarding has six screens and about ten decisions, with no value moment. It shows percentages instead of euros, and asks for bank, IBAN and jar mapping before the board. D6 decided to move mapping out, default to one main account, and show the default split (55/10/10/10/10/5) in euros, changeable later.

### What onboarding creates today (code facts)

`household.onboard` (`household.service.ts`, `onboardInternal`) creates, in this order:

1. the better-auth organization, then sets it active;
2. **six jars** from the active jar templates with the given percentages (the split total is checked at 100 ± 0.01);
3. **household settings**: plan **BASIC**, currency, `why`, income stability, payoff strategy;
4. the creator's **account settings**: locale, spending style, the onboarded mark;
5. **one income source** "My income" (SALARY) with an amount period, **only if** income > 0.

It creates **no bank account**.

After that, the **client** makes a second call: `household.updateSettings` with `jar_experience = NEW` and `jar_bank_setup_done = false`. This keeps the OWNER in `JarBankSetupFlow` until it is finished or skipped: accounts with a required `bankId` and an optional IBAN, then a jar-to-account map, then linking unlinked income to the first account. `onboarding/page.tsx` shows that flow whenever the key is **not** `true`, even when it is missing. `account.boardReady` is false while it is `false`.

### What is safe to default, and what is not

| Item | Default | Safe? |
| --- | --- | --- |
| Household name | "{first name}'s household" (fallback "My household"), editable in Settings | Yes. It is free text, and the OWNER can rename it |
| Currency | `EUR`; USD and GBP can be picked on screen 1 | Yes. The user picks it on screen 1 |
| Split | `DEFAULT_JAR_SPLIT` (= the jar template percentages) | Yes (D6). It can be changed later in Money › Jars |
| Income stability / payoff strategy / spending style | `STABLE` / `AVALANCHE` / `UNKNOWN` | Yes. These are already the defaults today |
| `why` (dream) | `null`; it moves to the checklist | Yes |
| **Main bank account** | **Not created at onboarding** (see S-6.4 and Q1) | **No, it can't be faked.** `Account.bankId` is required, and the bank catalog has no "Other" row. A placeholder bank would break the import guard (`ImportPreview.accountMismatch`) and CSV dialect sniffing |

### S-6.1 · Server split preview procedure

**Story:** As a **person setting up a household**, I want to see my own income split into six jars in my currency before anything is created, so that I understand the product in one screen.

**Contract:** in `packages/contracts/src/public/platform/household/`, leaf `household`, **READ** section, next to `onboard`.

```ts
// household.schema.ts
export const JarSplitShare = z.object({
    key: z.enum(JarKey),
    /** Percent with at most 2 decimals (e.g. 55, 12.5). */
    percentage: z.number().min(0).max(100).multipleOf(0.01),
});

export const OnboardingSplitPreviewInput = z.object({
    currency: z.enum(Currency),
    /** Net monthly income in integer minor units. 0 is allowed (no income yet). */
    monthlyNetIncome: z.int().min(0).max(100_000_000), // ≤ 1,000,000.00 a month
    /** Optional custom split: every JarKey exactly once, total exactly 100. Omitted = jar template defaults. */
    split: z.array(JarSplitShare).length(6).optional(),
});

export const OnboardingSplitPreview = z.object({
    currency: z.enum(Currency),
    monthlyNetIncome: Money,
    /** In jar template `sortOrder`. The sum of `amount` always equals `monthlyNetIncome`. */
    jars: z
        .array(z.object({ key: z.enum(JarKey), percentage: z.number(), amount: Money }))
        .length(6),
});

// household.contract.ts (READ)
/** Split preview for onboarding: no household needed, nothing written. */
export const householdPreviewSplit = oc
    .input(OnboardingSplitPreviewInput)
    .output(OnboardingSplitPreview);
// mounted as contract.household.previewSplit
```

**Server rules**

- **What it does:** `auth/household` `HouseholdService.previewSplit` reads the active jar templates through the jar template **service** (order = `sortOrder`, default percentage from the template). It applies `split` when one is given, returns `splitByPercentage(monthlyNetIncome, shares)` from `money.util.ts`, and writes nothing.
- **Validation:**
  - Each `JarKey` must appear exactly once; otherwise return the new error key `jar_split_keys`.
  - The total must be exactly 100.00, compared in basis points (`Math.round(pct * 100)` summed must equal 10000). Otherwise return the existing `jar_split_total`.
- **Remainder:** it goes to the largest percentage. On a tie, it goes to the first jar in `sortOrder`, so the result is deterministic. Required tests:
  - 100 minor units at the default split: NECESSITIES 55, the others 10/10/10/10/5, sum 100.
  - 1 minor unit: NECESSITIES 1, all others 0.
  - Income 0: every jar 0.
- **Float safety:** multiply in basis points (`total * bp / 10000`, floored), not with float percentages, so a value like 12.34 % can't floor one unit too low. If `allocateByPercentage` keeps float maths, harden it here and add a spec. **Onboard must use the same function**, so the preview and the board always match.
- **Auth:** a signed-in session is required; membership of a household is **not**. This is the same exemption `household/onboard` already has in `HouseholdScopeInterceptor` and `role-permissions.ts`, so add `/household/previewsplit` there. The procedure never reads or returns another household's data. The call is pure, so rate limiting is not a concern, but the client calls it only when the step changes, never on every keystroke.

**Acceptance criteria**

1. **Given** a signed-in user with no household, **when** they call `previewSplit({ currency: EUR, monthlyNetIncome: 250_000 })`, **then** they get six jars of 137_500 / 25_000 / 25_000 / 25_000 / 25_000 / 12_500 (in template order) that sum to 250_000.
2. **Given** `monthlyNetIncome: 250_001`, **then** NECESSITIES gets the remainder, and the sum is 250_001.
3. **Given** a custom split that sums to 99.99 or 100.01, **then** the server answers `jar_split_total` (400). **Given** a duplicate or missing key, **then** it answers `jar_split_keys`.
4. **Given** a signed-out request, **then** the server answers 401.
5. **Given** a member of an existing household calls it with an `x-household-id` header for another household, **then** the response doesn't depend on that header and leaks nothing.
6. **Given** the jar template catalog is empty, **then** the server returns the same `BadRequest` as onboard, and the UI shows "We couldn't load the jars — try again."

**Out of scope:** reusing the preview for split editing in Money › Jars (possible later with the same procedure), and rounding for currencies with other than 2 decimals (EUR, USD and GBP all use 2).

**MoSCoW:** Must · **Size:** M · **Priority:** 1 in CL-6.

### S-6.2 · Onboard writes everything in one call

**Story:** As a **new owner**, I want my household to be ready in one step when I press "Looks right", so that I land on my board and not in a half-made setup.

**Acceptance criteria**

1. **Given** the two-screen flow, **when** the user confirms, **then** the client calls `household.onboard` **once**. The server creates the organization, the six jars, the settings (plan BASIC), the account settings and, when income > 0, the income source. **In the same flush** it also writes `answers.jar_experience = NEW` and `answers.jar_bank_setup_done = true` (kept for compatibility). The client's follow-up `updateSettings` call is removed.
2. **Given** `householdName` is omitted or blank, **then** the server uses the default the client sends, "{first name}'s household" (localized by the client). If none arrives, the server falls back to "My household" / "Mijn huishouden", based on the creator's `locale`. `OnboardingInput.householdName` becomes optional, still with a 120-character maximum.
3. **Given** income typed as "1.234,56" (NL) or "1,234.56" (EN), **then** the client parses it by locale to 123_456 minor units. Screen 2 shows the parsed amount ("Here's where your €1,234.56 goes"), so a wrong parse is visible before anything is created. **Bug today:** `parseFloat(...replace(',', '.'))` turns "1.234,56" into €1.23.
4. **Given** income 0, **then** onboard creates no income source (as today), and Home shows the zero-income variant of S-5.2.
5. **Given** a person who already has a writable seat, **then** onboard still answers `already_household_member`. **Given** a person with only VIEWER seats (soft upgrade, `/onboarding/create`), **then** onboard is allowed and uses the same two screens.
6. **Given** onboard fails after the better-auth organization was created (for example a DB flush error), **then** the user sees an error with Retry. Retrying must not create a second organization: either the server reuses the user's empty, unonboarded organization, or it cleans up the failed one. This risk exists today, and a one-call flow makes it more visible. Name it in the PR; if it isn't fixed here, open a backlog item.
7. **Given** a split was sent, **then** it is validated exactly as in S-6.1, and the board's jar percentages equal what screen 2 showed.

**MoSCoW:** Must · **Size:** M · **Priority:** 2 in CL-6.

### S-6.3 · Two screens: "Your income" → "Here's where it goes"

**Story:** As a **person new to Rumtelo**, I want to type my net income and immediately see it split into six jars in euros, so that I understand what Rumtelo does before I do anything else.

**Acceptance criteria**

1. **Given** a signed-in person without a household, **when** they reach `/onboarding`, **then** they see **Screen 1 · Your income**: currency (EUR by default; USD, GBP) and net monthly income, with the hint "after tax, what lands in your account". There is no household name field, no "Start a practice instead" link and no welcome screen. Progress reads "1 of 2".
2. **Given** a valid income, **when** they press Next, **then** the client calls `previewSplit` and shows **Screen 2 · Here's where your {amount} goes**:
   - the six jars in template order, each with its name, percentage, **amount in the chosen currency** and a one-line job (copy from audit §6);
   - the note "Rumtelo never moves money…";
   - the CTA **"Looks right — open my board"** and a secondary **Back**.
3. **Given** the user wants different percentages, **then** screen 2 says "Change the percentages any time in Money › Jars." Onboarding has no split editor (D6).
4. **Given** screen 2 is confirmed, **when** onboard succeeds, **then** the user lands on Home (`/`) with the household active and the session refreshed. There is no tour offer here; the next-move card does that job.
5. **Given** income that is blank, negative or not a number, **then** Next is blocked with an inline field error, not only a toast. **Given** income 0, **then** Next works, and screen 2 shows the percentages with every amount at 0 and the line "No income yet? Your jars wait — they split it the second it lands."
6. **Given** `previewSplit` fails, **then** screen 2 shows an inline error with Retry and never shows numbers computed on the client.
7. **Given** an invitee with a pending invite, **then** the current redirect to the invite still wins, and they never see these screens.
8. **Given** the `why` step and the welcome step, **then** both are removed from onboarding. The dream moves to the checklist (S-6.5), and the "Start a practice instead" link is removed (the Practice entry moves to Settings, S-8.4).
9. **Given** a keyboard or screen-reader user, **then** focus moves to each screen's title, and the six amounts are read as a list ("Necessities, 55 percent, €1,375"). At 375 px all six jars fit without horizontal scrolling.

**Edge cases:**

- A very large income, up to the 1,000,000.00 cap, must not overflow the layout.
- A non-EUR currency: every amount uses that currency. Plan prices elsewhere stay in EUR.
- Browser Back from screen 2 keeps the typed income.
- Double-clicking the CTA: the button is disabled while the request is pending.

**Out of scope:** variable-income questions, debt at onboarding, the "Plan your year" Course intake, and analytics (Could: `onboarding_split_previewed` and `onboarding_completed` events, without amounts).

**MoSCoW:** Must · **Size:** M · **Priority:** 3 in CL-6.

### S-6.4 · Bank mapping leaves onboarding; the first account becomes the main one

**Story:** As a **new owner or member**, I want to name my bank account when I'm ready, with all jars on it by default, so that bookkeeping never stands between me and my board.

**Acceptance criteria**

1. **Given** the onboarding page, **then** it never renders `JarBankSetupFlow` again. `account.boardReady` no longer checks `jar_bank_setup_done` (`account-settings.service.ts:192`), so households stuck today at `false` reach their board on the next load.
2. **Given** the mapping flow, **then** it moves to **`/settings/product/money/bank/setup`**, next to the existing Bank settings. It reuses the existing accounts and map screens, and "Skip" returns the user to where they came from.
3. **Given** a household with **no bank account yet**, **when** the **first** account is created (from the checklist, from Settings › Bank, or from the import dialog), **then** the server does the following in the same request:
   - sets `isPrimary = true`;
   - places every jar whose `defaultAccountId` is null on that account (one main account, D6);
   - links every income source without an `accountId` to it.

   The bank-account service does this through the jar and income **services**, not their tables.
4. **Given** a household that already has one or more accounts, **when** another account is created, **then** nothing is re-placed automatically.
5. **Given** a **VIEWER** or a **Practice preview**, **then** the setup route is read-only or blocked: Money writes need MEMBER or higher, and preview has `canMutate = false`. **Given** a MEMBER, **then** they may create accounts and map jars (day-to-day Money rights).
6. **Given** a Basic household, **then** manual accounts are allowed. `maxBankLinks = 0` limits only Open Banking links.
7. **Given** a Plus household opens **Import a statement** with no account yet, **then** the import dialog first asks "Which bank is this statement from?" and creates that account under rule #3. Import needs an `accountId`.

**Edge cases:**

- Two members create the "first" account at the same moment. Only one may become primary and run the auto-placement (lock on the household, or check inside the transaction); this needs a spec.
- An IBAN already linked on another board gets the existing `iban_already_linked` error.
- Deleting the only account: jars keep today's `defaultAccountId` handling.

**Out of scope:** a placeholder "Other bank" catalog row (Q1), Open Banking linking, and making `bankId` nullable.

**MoSCoW:** Must · **Size:** M · **Priority:** 4 in CL-6.

### S-6.5 · Week-1 checklist on Home

**Story:** As a **new owner**, I want a short, optional checklist of what onboarding no longer asks, so that I can finish setup when it suits me.

**Items** (each one counts as done through a plain data check; no progress is stored):

| Item | Done when | Who sees it | Opens |
| --- | --- | --- | --- |
| Name your bank account | the household has ≥ 1 bank account | OWNER, MEMBER | `/settings/product/money/bank/setup` |
| Write down your dream | `settings.why` is set | OWNER (only the OWNER can write household settings) | the existing household settings field (an inline dialog is a Could) |
| Invite your partner | more than 1 member, **or** an invite is pending | OWNER, MEMBER (both may invite) | the invite dialog. **Hidden** when `withinLimit(maxMembers)` is false |

**Acceptance criteria**

1. **Given** at least one visible item is not done, **then** Home shows the checklist below the next-move card, with links only and no primary buttons.
2. **Given** every visible item is done, **then** the checklist disappears for good, because the data stays done.
3. **Given** an OWNER presses **Hide**, **then** `answers.week1_checklist_dismissed = true` is written, and the checklist is hidden for every member. This is a new `HouseholdAnswerKey`; it needs no migration because `HouseholdAnswers` is extensible.
4. **Given** a VIEWER or a Practice preview, **then** the checklist doesn't show.
5. **Given** the Coach is turned off, **then** the checklist still shows. It is setup, not a tip.
6. **Given** a Basic household with 2 of 2 seats used, **then** the invite item is hidden, not shown as locked. A checklist doesn't carry upgrade nudges.

**Out of scope:** date-based triggers ("day 5"), and Course or "Plan your year" items (they need CL-12 or the Course intake).

**MoSCoW:** Should · **Size:** M · **Priority:** 5 in CL-6.

**Principles:** 1 is the core: the first thing a user does is give every euro a job, in euros. 4: zero income gets a calm line, not an error. 2: less bookkeeping in week 1. 3 is not touched.

---

## CL-8 · New navigation: Home · Money · Growth · More

**Why:** production has 16 nav destinations. On mobile the portal list appears twice. Income sits under Growth, Jars has no nav item, the nav says "Transactions" where The Coach says "Inbox", and "Start a practice" is in every owner's avatar menu. D1: keep the **Growth** label; Growth opens on Course.

### S-8.1 · Decouple route gating from visible nav (prerequisite)

**Story:** As a **household on any plan**, I want locked pages to stay locked when they leave the nav bar, so that moving items into More never opens a paid page by accident.

**Why this comes first:** `resolveNavChildForPath` (`nav.ts`) drives **plan gating** for routes: it finds the capability through the longest matching nav href. If `money/debt`, `money/net-worth` or `growth/learn` leave `NAV_GROUPS`, the shell stops gating their pages.

**Acceptance criteria**

1. **Given** a new `ROUTE_CAPABILITIES` table (route prefix → `CapabilityKey` + `HouseholdPermissionSection`) that covers every current nav child **and** the More items, **when** the shell resolves gating, **then** it uses this table, not the visible nav.
2. **Given** a Basic household opens `/product/money/debt` directly, **then** it gets the lock page (S-9.1), both before and after CL-8.
3. **Given** a VIEWER opens `/product/growth/course` directly, **then** they get the existing role block.
4. **Given** the unit tests, **then** one asserts that every `page.tsx` route under `/product/*` resolves to a capability, so no route can be left ungated without a failing test.

**MoSCoW:** Must · **Size:** M · **Priority:** 1 in CL-8.

### S-8.2 · The nav tree after

**Story:** As a household **member**, I want four tabs with at most four items each, so that I find my jars, my Inbox and my Course without learning a map.

**Exact tree (production):**

| Tab | Route (tab target) | Sub-nav (label → route) | Plan / role |
| --- | --- | --- | --- |
| **Home** | `/` | none | everyone |
| **Money** | `/product/money` | **Jars** → `/product/money`<br>**Inbox** (badge = `inboxCount`) → `/product/money/transactions`, opening on the Inbox tab when the count is > 0<br>**Fixed costs** → `/product/money/fixed-costs`<br>**Income** → `/product/money/income` | every plan; VIEWER read-only. The header has the **Week check** button (S-4.2) |
| **Growth** | `/product/growth`, which redirects | **Plus/Max:** no shell sub-nav. `/product/growth` redirects to `/product/growth/course`, which has its own tabs **Today · Week · Goals**.<br>**Basic:** `/product/growth` redirects to `/product/growth/goals` (the 1-goal list, `maxGoals = 1`), with a **Course preview card** on top (S-9.2 #5) | OWNER, MEMBER. **Hidden for VIEWER** (no Growth) |
| **More** | a menu on desktop, a sheet on mobile | see below | everyone (filtered) |

**More contents**, in this order (each row is filtered by role, plan and launch):

| Row | Route | Shows for |
| --- | --- | --- |
| Debt | `/product/money/debt` | Plus/Max; every role with Money (VIEWER read-only) |
| Net worth | `/product/money/net-worth` | Max (`growthNetWorth`): OWNER, MEMBER, VIEWER. On Plus it appears inside "More with Max" |
| Learn | `/product/growth/learn` | Plus/Max: OWNER, MEMBER |
| **More with Plus** (one row) | opens the plan compare sheet (S-9.2) | Basic: OWNER and MEMBER only. Replaces the faded Debt, Learn, Course and Import rows |
| **More with Max** (one row) | the same sheet, Max column | Plus: OWNER and MEMBER only |
| The Coach | `/product/coach` | OWNER, MEMBER (VIEWER has no Coach). Shown even when the Coach is off, so it can be turned back on |
| Why Rumtelo | `/product/why` | everyone |
| Settings | `/settings` | everyone (VIEWER sees what the role matrix already allows). Hidden in Practice preview |
| Help | the Help sheet | everyone. Hidden in Practice preview |
| Go to practice | `/practice` | only when the person is staff of at least one practice (`practice.list` is not empty) |
| *Preview: Energy, Soul* | `/product/energy`, `/product/soul` | **staging only** (`isProductEnabled`), labelled "Preview". **Never in production** |

**Removed from the nav:**

- **Home:** Overview, Coach and Why sub-items (Coach and Why move to More).
- **Money:** Overview (it becomes "Jars"), Transactions (it becomes "Inbox"), Debt and Net worth (they move to More).
- **Growth:** the Overview hub; Income (moves to Money); Goals (moves to Course › Goals, and the existing `goals-entry.tsx` redirect stays for Plus/Max); Learn (moves to More).

**Acceptance criteria**

1. **Given** an OWNER or MEMBER on Plus, **then** the tabs are Home · Money · Growth · More. Money has 4 sub-items, Growth opens on Course Today, and More shows Debt, Learn, More with Max, The Coach, Why, Settings and Help.
2. **Given** an OWNER or MEMBER on Basic, **then** More shows More with Plus, The Coach, Why, Settings and Help, and **no** faded lock rows appear anywhere in the nav.
3. **Given** a VIEWER on any plan, **then** the tabs are Home · Money · More. More shows Debt (read-only, if the plan has it), Net worth (Max), Why, Settings and Help, and no upgrade rows.
4. **Given** a Practice preview, **then** the tabs follow the **client's** plan and the sections the link allows. More hides Settings, Help and the upgrade rows, and shows **"Back to practice"** (exit preview) at the top.
5. **Given** `NODE_ENV=production`, **then** no Energy or Soul entry exists in the tabs, More, search or Quick add.
6. **Given** Quick add search (`quick-add.tsx`, which searches nav children today), **then** it also searches the More rows and the Course tabs, filtered by the same rules.
7. **Given** a Basic household opens `/product/growth/course`, **then** they get the Course lock page (S-9.1), not a 404.
8. **Given** a Plus OWNER in production, **then** the count is Home 1 + Money 4 + Course 3 = **8 destinations in tabs and sub-nav (at most 4 per level)**, plus 7 More rows (Settings, Help and More with Max included). Before, there were 16 tab and sub-nav destinations. The audit target of 12 excluded Settings, Help and the upgrade row.

**MoSCoW:** Must · **Size:** L · **Priority:** 2 in CL-8.

### S-8.3 · Move Income to Money

**Story:** As a household **member**, I want Income under Money, so that the thing that drives my split sits next to my jars.

**Acceptance criteria**

1. **Given** `/product/money/income` (with `create`, `update/[id]` and the modal routes), **then** it renders the existing income pages. The capability stays `growthIncome`, which Basic has; renaming the key is out of scope.
2. **Given** `/product/growth/income/*`, **then** it redirects (308) to the same sub-path under `/product/money/income`.
3. **Given** the intercepting modal routes under fixed costs and net worth (`(..)(..)growth/income/create`, …), **then** they point to the new path and still open as modals.
4. **Given** a VIEWER, **then** Income shows read-only under Money. Today a VIEWER can't see it at all (Growth is NONE for VIEWER). **This is a visibility change:** income is board money that a VIEWER already sees as jar totals. The security-reviewer must confirm that this route's role section becomes MONEY (see Q5).

**MoSCoW:** Must · **Size:** S · **Priority:** 3 in CL-8.

### S-8.4 · Mobile shell and avatar menu

**Story:** As a **phone user**, I want one row of tabs and one place for everything else, so that the same list doesn't appear twice.

**Acceptance criteria**

1. **Given** a screen narrower than `sm`, **then** there are 4 bottom tabs (3 for VIEWER) plus the Quick add button (hidden in Practice preview), and **the header portal dropdown is gone**.
2. **Given** a tap on **More**, **then** a bottom sheet opens with the More rows. Targets are at least 44 px, focus is trapped, and the sheet closes on Escape or a swipe down.
3. **Given** a portal with a sub-nav (Money), **then** the sub-nav is one horizontal row of tabs (4 fit at 375 px), not a dropdown. Growth on Plus or Max uses Course's own Today · Week · Goals tabs.
4. **Given** the period selector and Help, **then** they stay in the header. Settings is reachable through More (today it is hidden below `sm`).
5. **Given** the desktop layout, **then** the pills read Home · Money · Growth · More, and More is a menu button with the same rows.
6. **Given** the avatar menu, **then** it shows only Language · Appearance · My plan · Sign out, plus "Go to practice" for practice staff. **"Start a practice" is removed** from the menu (`PracticeMenuLink offerStart`) and from onboarding. It now lives in **Settings › General › Practice** (`/settings/general/practice`) for OWNERs.
7. **Given** a screen reader, **then** every tab and More row has a text label, and the active tab sets `aria-current="page"`.

**MoSCoW:** Must · **Size:** M · **Priority:** 4 in CL-8.

**Principles:** 2: the routine has one door, and the nav no longer competes with it. 1: Jars is the first Money item. 4: no faded lock rows. 3: Energy stays out of production.

---

## CL-9 · Locks that explain the gain

**Why:** a locked page today shows 🔒, "Available in the {plan} plan" and an upgrade button. It shows no price, no outcome and no preview, and has no way back. Nav locks are a faded 🔒 marked `aria-hidden`. **Bug:** `planPriceLabel` (`_lib/plan.ts`) hard-codes €9 and €19 (`toMinorUnits(9)` / `toMinorUnits(19)`) instead of reading `PLAN_RETAIL_CENTS`.

### S-9.1 · The lock page

**Story:** As an **owner on Basic**, I want a locked page to say what I'd gain, what it costs and how to go back, so that I can decide calmly.

**Acceptance criteria**

1. **Given** an OWNER on a plan without the capability, **then** `LockedGate` shows:
   - the title "{feature} is in {plan} · {price}/month", with the price from `PLAN_RETAIL_CENTS[plan].month` through `formatPlanPrice` (always EUR);
   - the body "{gain}. Everything you've entered stays yours on every plan.";
   - a **static preview**: an illustration with sample numbers, labelled "Example", with no data fetch;
   - two actions: **"{CTA} {plan}"**, which opens `/settings/general/plan`, and **"Not now"**, which goes back in history (fallback: the portal root).
2. **Gain copy** per capability: Debt, Course and Import come from audit §6 (EN, with an NL twin required). Two new lines are added:
   - **Learn:** "Pick one skill a quarter and keep track of what you learn."
   - **Net worth:** "See what you own minus what you owe, in one number, every month."

   Other capabilities fall back to `features.capabilities.{key}.description`. The brand-copywriter checks the Learn and Net worth lines before merge.
3. **Given** a **MEMBER**, **then** the page has no upgrade button, because billing is OWNER-only in the role matrix. It shows "Ask {owner name} to switch to {plan}." and "Not now". Today a MEMBER sees an upgrade button that lands on a page they can't use.
4. **Given** a **VIEWER**, **then** the current look-along copy stays, with no price and no CTA. "Not now" becomes "Back".
5. **Given** a **Practice preview**, **then** the current practice copy and buttons stay (MANAGE: practice billing; VIEW: back to clients). No household price is shown.
6. **Given** a Plus household on a Max-only page (Net worth), **then** the same layout shows the Max price.
7. **Given** a price changes in `PLAN_RETAIL_CENTS`, **then** every lock shows the new price with no copy change. A test asserts that `planPriceLabel` reads the constant.
8. **Given** a screen reader, **then** the 🔒 stays `aria-hidden`, and the region has a visible title plus text that states the lock ("Locked: in Plus").

**MoSCoW:** Must · **Size:** M · **Priority:** 2 in CL-9.

### S-9.2 · Nav locks and "More with Plus"

**Story:** As an **owner on Basic**, I want one clear "More with Plus" entry instead of four faded rows, so that the nav shows what I have and one place shows what I could add.

**Acceptance criteria**

1. **Given** a Basic OWNER or MEMBER, **then** More has one row, **"More with Plus"**. It opens a sheet that lists the gains (Course, Debt, Import, Learn), each with its one-line gain and the Plus price, and one CTA: "{CTA} Plus" for the OWNER, "Ask {owner name}" for a MEMBER.
2. **Given** a Plus household, **then** the row reads **"More with Max"**. It lists Net worth and the higher limits from `PLAN_LIMITS` (for example members and goals), rendered from the constants.
3. **Given** a remaining in-page lock marker (for example a Course tab for Basic in search results), **then** the icon has visible text "Plus" next to it, not a bare 🔒, and a screen-reader label "Locked: in Plus".
4. **Given** a VIEWER or a Practice preview, **then** no upgrade rows or sheets appear.
5. **Given** the Basic Growth landing (S-8.2), **then** the compact Course preview card uses the same component: the title "Course is in Plus · {price}/month", the Course gain line, then "{CTA} Plus · Not now". "Not now" hides the card for that session only.

**MoSCoW:** Should · **Size:** M · **Priority:** 3 in CL-9.

### S-9.3 · Price from the constant (bug fix)

**Story:** As **Given**, I want every in-app price to come from `PLAN_RETAIL_CENTS`, so that changing a price takes one edit.

**Acceptance criteria**

1. **Given** `planPriceLabel(PLUS)`, **then** it renders `PLAN_RETAIL_CENTS[PLUS].month`. The same holds for MAX, and BASIC stays "Free".
2. **Given** a hard-coded plan amount in `_lib/plan.ts`, **then** a spec fails.

**MoSCoW:** Must · **Size:** S · **Priority:** 1 in CL-9 (ship first; it doesn't depend on anything).

**Principles:** 4: a lock is information with one move and a way back, never a wall. 1 and 2 are not touched. Prices stay in the constants.

---

## Dependencies and recommended build order

```
S-9.3 price fix                       (independent, ship first)
S-6.1 previewSplit ─► S-6.2 onboard in one call ─► S-6.3 two screens
                                 └─► S-6.4 mapping out + auto-place ─► S-6.5 checklist ─┐
S-5.1 dashboard.progress ─► S-5.2 next-move card ─► S-5.3 quiet Home ◄─────────────────┘
S-4.1 folded flow ─► S-4.2 entry points (Home row 4 needs S-5.2) ─► S-4.3 redirect + gate
S-8.1 route gating table ─► S-8.2 nav tree ─► S-8.3 Income move ─► S-8.4 mobile + avatar
S-9.1 lock page ─► S-9.2 "More with Plus" (needs the More menu from S-8.2)
```

- **S-8.1 must land before S-8.2.** Otherwise Debt, Learn and Net worth lose their plan gate.
- **S-6.4 #1 (boardReady stops reading the key) ships in the same release as S-6.3.** Otherwise new households get trapped in the old bank wizard, because `onboarding/page.tsx` shows it whenever the key is not `true`.
- **S-4.2 #5 (one Sunday entry)** changes the Course schedule and the ICS export on the backend. Do it in one backend pass with S-4.3 #5 (capability gate).
- **S-5.2 row 4** reads `weekCheckDoneThisWeek` from S-5.1 and opens the flow from S-4.1.

**Recommended order:**

1. **Backend pass:** S-9.3, S-6.1, S-6.2, S-5.1, S-4.3 #5–6, S-4.2 #5, S-6.4 #1 and #3.
2. **CL-4 UI:** S-4.1, S-4.2, S-4.3.
3. **CL-6 UI:** S-6.3, S-6.4, S-6.5.
4. **CL-5 UI:** S-5.2, S-5.3.
5. **CL-8:** S-8.1, then S-8.2 to S-8.4.
6. **CL-9 UI:** S-9.1, S-9.2.

Steps 2 and 3 can run in parallel. The week check (the habit) and the onboarding split (the value moment) are the two biggest wins. The nav comes after them because it renames and moves things around them.

## Open questions for Given (only what D1–D11 leave open)

1. **The default main account (D6) needs a bank.** `Account.bankId` is required, the catalog has no "Other" bank, and a placeholder bank would break the import guard. **Recommendation:** create no account at onboarding. The **first** account the user creates becomes the main one, and all jars and income are placed on it automatically (S-6.4). The alternative is an optional "Your bank" picker on screen 1, which adds a third decision.
2. **A missed Sunday.** The Money check keys on the ISO week that contains today. A check done on Monday therefore counts for the **new** week, and last week's check can never be done. **Recommendation:** a grace day, so Monday still opens last week's check. It is small, but it changes the week-key rule.
3. **CTA wording on locks.** The audit says "Try Plus", which promises a trial. Is there a trial in Stripe? If not, the CTA should read "Switch to Plus" *(pricing)*.
4. **Basic's Growth tab until Course-lite (D7, later).** **Recommendation:** open on the 1-goal Goals list with a compact Course preview card (S-8.2), not on a full lock wall, so a first tap on a tab never hits a wall.
5. **A VIEWER sees Income (S-8.3).** Moving Income under Money makes income sources readable to look-along viewers, who can't see them today *(privacy)*. **Recommendation:** allow it. Viewers already see the jar totals that this income produces.

---

## Decisions on the open questions (Given, 17 Nov 2026)

1. **Main account:** onboarding creates one account named "Main account" / "Hoofdrekening" with no bank and no IBAN, and puts all six jars on it. Bank and IBAN are filled in later from the week-1 checklist or Settings. This overrides the CL-6 note "no account at onboarding".
2. **Missed week check:** Monday (and later days of that week) still open last week's week check until it is done or a new week's check starts. *(orchestrator default)*
3. **Trial:** there is none (Stripe only mirrors `trialing` status). The lock button says "Switch to {plan}", not "Try". *(verified in code)*
4. **Basic Growth tab:** opens on Goals with a Course preview card at the top (what Course does + Plus price). Course-lite (D7) is a later release.
5. **VIEWER and Income:** keep today's access unchanged when Income moves under Money (VIEWER = read-only). *(orchestrator default)*

**Bugs found while writing stories (fix in this release):** `planPriceLabel` hard-codes €9/€19 instead of `PLAN_RETAIL_CENTS`; onboarding parses "1.234,56" as €1.23.
