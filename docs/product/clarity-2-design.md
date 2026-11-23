# Clarity 2: design (CL-4, CL-5, CL-6, CL-8, CL-9)

> **Note (2026-11-23):** This document was written when every household had six jars. A new household now starts with three pots (Basics 55 · Future 20 · Free 25) and refines them; existing households keep six. Read "six jars" below as "the household's pots" and the six-name lists as the old names. Current model: [split-system-proposal.md](./split-system-proposal.md).

**Date:** 2026-11-17 · **Owner:** ux-ui-designer · **Status:** design ready for build. Nothing is built.
**Inputs:** [`clarity-2-stories.md`](./clarity-2-stories.md), including *Decisions on the open questions*, which are final here. Also [`clarity-audit.md`](./clarity-audit.md) §4, §6 and §7.
**Mockups (375 px, brand tokens):** [`clarity-2/week-check-stepper.svg`](./clarity-2/week-check-stepper.svg) · [`clarity-2/onboarding-income.svg`](./clarity-2/onboarding-income.svg) · [`clarity-2/more-sheet.svg`](./clarity-2/more-sheet.svg) · [`clarity-2/lock-card.svg`](./clarity-2/lock-card.svg). The split screen is still [`clarity-audit/onboarding-split.svg`](./clarity-audit/onboarding-split.svg), with three changes listed in §3.3.

**Contents:** [0 Shared rules](#0-shared-rules) · [1 CL-4 Week check](#1-cl-4--one-week-check) · [2 CL-5 Home](#2-cl-5--home-in-week-1) · [3 CL-6 Onboarding](#3-cl-6--onboarding-in-two-screens) · [4 CL-8 Navigation](#4-cl-8--navigation) · [5 CL-9 Locks](#5-cl-9--locks-that-explain-the-gain) · [6 NL pins](#6-dutch-strings-to-pin) · [7 Open questions](#7-open-questions) · [8 Build split](#8-build-split-for-two-engineers)

---

## 0. Shared rules

These apply to every screen below and are not repeated.

| Topic | Rule |
| --- | --- |
| **Breakpoints** | Phone 360–430 px is primary. Tablet `sm`/`md` at about 768 px. Desktop `lg` and up. Content width comes from `PageContent` (`_components/layout/page-content.tsx`): `narrow` for flows (week check, onboarding), default for boards. |
| **Tokens** | Only `fg`, `fg-muted`, `fg-secondary`, `surface`, `raised`, `line`, `line-strong`, `accent`, `accent-soft`, `danger`. Success ticks use `accent`, never green-on-white text. |
| **Buttons** | `Button` from `@rumtelo/ui`. Size `md` is `h-10` (40 px), which is under 44 px. **On touch, every primary or secondary action in this release uses `size="lg"` (`h-12`) below `sm`, and `md` from `sm` up.** Text links that act as targets get `min-h-11` with `inline-flex items-center`. |
| **One primary** | Each screen has at most one `variant="primary"` button. Everything else is `secondary`, `ghost` or a text link. |
| **Focus** | Use the visible `focus-visible:outline-accent` that already ships with `Button`. Custom rows (`Link` styled as a row) copy that ring: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`. When a step or screen changes, focus moves to its `h1` or `h2` (`tabIndex={-1}`, the pattern in `onboarding-flow.tsx`). |
| **Toasts** | `showToast` from `useHouseholdShell` for success. Save errors stay **inline** with Retry, plus a toast. A toast alone is never the only error signal. |
| **Loading** | Skeletons sized like the final content (no layout shift). Use `BrandLoader` only for full-route waits, as `CapabilityGate` does today. |
| **Overspent** | Show a full `danger` meter via `JarProgressBar` (`_components/features/money/jar-progress-bar.tsx`), the amount in `fg`, a short "Over by {amount}" line in `fg-muted`, and one move. There are no red text blocks and no red backgrounds. |
| **Roles** | Writers are OWNER and MEMBER. Read-only is VIEWER or Practice preview (`useBoardWriteAccess().canMutate === false`, `usePracticePreview().capabilities.active`). Read-only screens show **no** buttons that would fail and **no** upgrade CTAs. |
| **Coach off** | Covers `features.isCoachEnabled = false` and the helpers preference off (`useHelpersEnabled`). Only Coach tips disappear. Product state (next move, week check, checklist, locks) always shows. |
| **Launch** | Nothing in this release links to Energy or Soul in production. Check with `isProductEnabled` (`_lib/launch-products.ts`). |
| **Copy** | All strings use `useTranslations`. Placeholders are instructions, not sample data. Money is formatted with `useHouseholdCurrency().formatMoney`. Plan prices go through `planPriceLabel` (always EUR). |

---

## 1. CL-4 · One week check

### 1.1 Flow

1. **Entry.** The user arrives from one of four doors: the **Week check** button in the Money header (S-4.2), the Home next-move card row 4 (S-5.2), the single Sunday entry in the Course schedule, or the old Course URL. The old URL gets a 308 to `/product/money/week-check?from=course`.
2. **Resolve the week (decision 2).** From Monday to Saturday, if **last** week's Money check is not `DONE` and **this** week's check has no row yet (or is still at `LOOK` with no allocations), open last week's check. Otherwise open this week's check. The header always names the week (§1.3), so the user can see which one they are closing.
3. **Resolve the role.** The backend pass adds `courseApplies` to the `money.weekCheck.current` output (plan has `growthCourse` **and** the caller is a writable seat, not a preview). The client uses that field and never infers Course from the plan alone.
   - VIEWER or Practice preview: show the read-only summary (§1.6) and stop.
   - Writer on Basic: run the Money stages only.
   - Writer with `growthCourse`: run the Money stages, then the Course stages.
4. **Resolve the start stage.**
   - `DONE`: show the Done summary.
   - `LOOK` or `REDIRECT`: resume at that stage.
   - `INTEND` on Plus or Max: resume at the first Course stage and show the saved intention in a recap line.
   - `from=course` and stage ≥ `INTEND`: open the first Course stage. Otherwise start at Look.
5. **Look** shows the jar recap per jar, with read-only meters. Overspent jars show a full red meter and one move. Next writes `LOOK`. When `surplus = 0`, it also writes `REDIRECT`, as it does today.
6. **Redirect** (only when `surplus > 0`). Pick one jar for the surplus. Next writes `REDIRECT` with the allocation.
7. **Intend.** One sentence.
   - Basic: **Finish** writes `DONE` with the intention, then go to step 11.
   - Plus or Max: **Next** writes `INTEND` with the intention (not `DONE`), then go to step 8.
8. **Course · Last week's three.** Mark each item. This reuses `CourseItemCard` actions.
9. **Course · Routines.** Keep, shrink or pause each one. This reuses `RhythmSuggestions isEmbedded`.
10. **Course · Next week's three.** Set up to three. This reuses the empty-slot buttons and `CourseItemDialog`. **Finish** calls `growth.weekCheck.complete({ week: courseWeek })`, then `money.weekCheck.advance({ stage: DONE, week: moneyWeek })`. If the Money call fails, Retry only re-sends that call (§1.5 error).
    - On any Course stage, **Skip Course this week** writes Money `DONE` only, then goes to step 11.
11. **Done.** Show one success toast and the Done summary: allocations, the intention and next week's three. Options are "Look again" and "Back home".

### 1.2 Stage list (pure helper)

New pure module **`apps/application/app/(routes)/[locale]/(app)/(household)/product/money/week-check/_utils/week-check-steps.ts`**, with a `node:test` spec next to it:

```ts
type StepKey = 'LOOK' | 'REDIRECT' | 'INTEND' | 'COURSE_BACK' | 'COURSE_ROUTINES' | 'COURSE_AHEAD';
buildWeekCheckSteps({ hasSurplus, hasCourse }): readonly { key: StepKey; group: 'money' | 'course' }[]
resumeIndex({ steps, moneyStage, fromCourse }): number   // rules from §1.1 step 4
resolveMoneyWeek({ today, lastWeek, thisWeek }): WeekKey // decision 2 grace rule
```

The step count `n` is 2 to 6. The header text "Step x of n" counts these steps. Done is not a step.

### 1.3 Screen: the folded stepper

**Route:** `/product/money/week-check` (existing `page.tsx`). It renders a new `WeekCheckFlow` client island instead of `WeekCheckPageClient`.

**Layout, phone (360–430):**

```
┌ PageContent narrow ────────────────────────┐
│ Eyebrow  TEN MINUTES A WEEK                │
│ h1       Week check                        │
│ p        Week 46 · 10–16 Nov               │  ← the Money week; names the grace week
│ ┌ stepper ───────────────────────────────┐ │
│ │ Step 4 of 6 · about ten minutes         │ │
│ │ MONEY ▬▬▬ ▬▬▬ ▬▬▬  COURSE ▬▬▬ ░░░ ░░░  │ │  segmented bar, groups labelled
│ │ Course · last week's three             │ │  current stage name
│ └────────────────────────────────────────┘ │
│ ┌ stage card (surface, rounded-2xl) ─────┐ │
│ │ h2 + lead + stage content              │ │
│ └────────────────────────────────────────┘ │
│ Skip Course this week   (text link, Course │
│                          stages only)      │
├ sticky action bar ─────────────────────────┤
│ [ Back ]                      [ Next  → ]  │  h-12, sits above the bottom tabs
└────────────────────────────────────────────┘
```

- **Sticky action bar:** `sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0`, with `bg-surface/95 backdrop-blur border-t border-line`. The Course "next three" stage can be taller than the viewport, and Next must stay in reach of a thumb.
- **Segmented bar:** one segment per step, `h-1.5 rounded-full`. Done steps are `bg-accent`, the current step is `bg-accent` with a 2 px `ring-accent/30`, and steps to come are `bg-line`. The group labels "Money" and "Course" are `font-mono text-[10px] uppercase text-fg-muted`, and there is a 12 px gap between the groups.

**Tablet/desktop (`sm`+):** the segmented bar becomes an ordered list of chips, grouped:
`MONEY · WEEK 46  [1 Look] [2 Redirect] [3 Intend]   COURSE · WEEK 47  [4 Last week] [5 Routines] [6 Next three]`. The week numbers in the group labels make it clear that Money looks back on week W while Course plans W+1. The action bar is inline under the card, Back on the left and Next on the right, `size="md"`.

**Components:**

| Need | Reuse |
| --- | --- |
| Page frame | `PageContent width="narrow"`, `Eyebrow`, `Typography` |
| Money stages | Split `_components/features/week-check/week-check-wizard.tsx` into stage bodies (`LookStage`, `RedirectStage`, `IntendStage`). Keep the Intend `useForm` + `createWeekCheckIntendSchema`. |
| Look rows | `JarProgressBar` plus the row layout from `JarSummaryRow` (`_components/features/money/jar-summary-row.tsx`). Replace today's coloured amount text (`text-danger`/`text-success`) with the meter. |
| Redirect | Today's "Send here" buttons, wrapped as a **radio group** (`role="radiogroup"`, each option a `<button role="radio" aria-checked>`). The label stays "Send here", or "Selected" when chosen. |
| Course stages | Move the bodies of `product/growth/course/_components/week-check-page.tsx` into `CourseBackStage`, `CourseRoutinesStage` and `CourseAheadStage`. They reuse `CourseItemCard`, `RhythmSuggestions`, `CourseItemDialog`, `focusSlotsOf`, `useCourseActions` and `useRhythmActions` from the course route. Then delete the old page component (S-4.3 #7). |
| Done | Today's done card from the wizard, extended (§1.5) |

**Stepper rules:**

- Chips and segments for done steps are buttons that go **back** to that step. Steps to come are `disabled` (`aria-disabled`): the user cannot skip ahead of what the server has confirmed. Today the wizard lets every chip jump anywhere; that changes.
- **Back** never writes anything. **Next** writes the stage and moves on only after the server confirms (story #11).

**Look stage, overspent jar** (principle 4):

```
Play                         €-42.10
██████████████████████████  (full danger meter)
Over by €42.10 · Move money →          ← Link to /product/money/jars/move?to=PLAY
```

Writers get the link. Read-only users get the line without the link. The move route (`product/money/jars/move`) already exists; pass the target jar as a query param. A zero-income month replaces the jar list with an `EmptyState variant="compact"`: "No income this month yet." plus the link "Add income" to `/product/money/income` (the path after CL-8; the old path redirects).

### 1.4 Copy (EN) and keys

Namespace `features.money.week_check` (existing; new keys are marked **new**). Course stage copy stays in `features.growth.course.week_check.*` and is reused as is: `back_title`, `back_lead`, `back_empty`, `rhythm_title`, `rhythm_lead`, `rhythm_empty`, `ahead_title`, `ahead_lead`. The page-level Course keys (`title`, `lead`, `steps_aria`, `done_title`, `done_lead`, `open_today`, `open_week`, `already_done`, `finish`) are removed once the old page is deleted.

| Key | EN |
| --- | --- |
| `page_title` *(change)* | Week check |
| `page_lead` *(change, shorter)* | Ten minutes. See where it went, give the rest a job, set one intention. |
| `week_label` **new** | Week {week} · {range} |
| `grace_note` **new** | Last week's check is still open. Close it first — this week's opens after. |
| `progress` **new** | Step {current} of {total} · about ten minutes |
| `group_money` **new** | Money · week {week} |
| `group_course` **new** | Course · week {week} |
| `steps_aria` **new** | Steps of the week check |
| `step_course_back` **new** | Last week's three |
| `step_course_routines` **new** | Routines |
| `step_course_ahead` **new** | Next week's three |
| `look_over_by` **new** | Over by {amount} |
| `look_move` **new** | Move money |
| `look_no_income` **new** | No income this month yet. |
| `look_add_income` **new** | Add income |
| `intend_saved` **new** | Your intention: {intention} |
| `skip_course` **new** | Skip Course this week |
| `skip_course_toast` **new** | Week check done. Course stays open for this week. |
| `finish` **new** | Finish week check |
| `toast_done` *(change)* | Week check done. See you next week. |
| `done_title` *(change)* | Done for week {week}. |
| `done_lead` *(change)* | One look, one move, one intention. |
| `done_allocations_label` **new** | Moved this week |
| `done_next_three_label` **new** | Next week's three |
| `done_course_open` **new** | Course for next week is still open. |
| `done_course_open_cta` **new** | Set next week's three |
| `look_again` **new** | Look again |
| `look_again_note` **new** | Read only — this doesn't change your check. |
| `save_failed` **new** | Not saved. Your answers are still here. |
| (retry) | reuse `ui.button.try_again` (Try again) |
| `error_no_jars` **new** | We couldn't load your jars. Try again. |
| `summary_status_done` **new** | Done on {day} |
| `summary_status_open` **new** | Not done yet |
| `summary_read_only` **new** | Read only. The household does the week check. |
| `entry` **new** | Week check |
| `entry_done` **new** | Week check |
| `entry_done_sr` **new** | done this week |
| `entry_view` **new** | View week check |

The ✓ in "Week check ✓" is an `Icon name="check"` with `aria-hidden`, with `entry_done_sr` in an `sr-only` span. Screen readers then hear "Week check, done this week" instead of "check mark".

Existing labels keep their words: `look_label` (Look), `direct_label` (Direct), `intend_label` (Intend). The story says "Redirect" for the stage, but the UI keeps "Direct". Renaming it is not part of this release.

### 1.5 States

| State | What shows |
| --- | --- |
| **Loading** | Header text renders at once. The stepper and stage card are skeletons: a bar plus six `h-14` rows, matching Look. Course queries load in parallel (`growth.course.period` ×2, `rhythm.suggestions`, `growth.weekCheck.current`) **only when** `growthCourse` is held and the role can see Growth. |
| **Error on load** | Money check or jars fail: an inline card in place of the stepper with `error_no_jars` and a Retry button that refetches. The wizard never renders empty. Course queries fail: the Money stages still run. The Course stages then show an inline error with Retry plus the Skip Course link, so the routine is never blocked. |
| **Error on save** | The user stays on the stage. Input is kept (form state is not reset). The inline text `save_failed` sits above the action bar, Next becomes **Retry**, and an error toast shows. If Finish fails after Course completed, Retry re-sends only `money.weekCheck.advance(DONE)`. A local `courseCompleted` flag in the flow state drives this. |
| **Empty** | No jars: `error_no_jars` (corrupt board). Zero income: `look_no_income` + `look_add_income`. Course with nothing last week: `back_empty`. Course with no routine proposals: `rhythm_empty`. |
| **Success** | One toast (`toast_done`). The Done summary replaces the stepper. On Plus with Course skipped, the summary adds `done_course_open` with a **secondary** button `done_course_open_cta`, which reopens the three Course stages (`?from=course`; Money is already `DONE`). See open question Q1. |
| **Done summary** | A card with `done_title` (h2), `done_lead`, then three blocks: `done_allocations_label` (jar + amount, or nothing when there was no surplus), the intention, and `done_next_three_label` (Plus/Max; titles of the three items). Actions: **Back home** (primary, existing `done_home`) and **Look again** (ghost). Look again opens Look read-only with `look_again_note`; there is no Next, only "Back to summary". |
| **VIEWER** | Read-only summary (§1.6). |
| **Practice preview** | Same as VIEWER. Course recap only when the client's plan has `growthCourse` and the link may read Growth. No write is ever called (`canMutate === false`). |
| **Plan-locked (Basic)** | No Course stages, no Course group label, no upsell inside the routine. The routine is not the place to sell (principle 2). The way to Plus is in More (§5). |
| **Downgraded mid-week** | The steps rebuild without Course. A check left at `INTEND` resumes on Intend with Finish (Basic behaviour). |
| **Coach off** | No change. The flow and every entry point stay. |
| **Deferred portals** | Not touched. No Energy step. |
| **Household switch mid-flow** | Key the flow on `householdId` (`<WeekCheckFlow key={householdId} />`). Local state resets and no write goes to the old board. |

### 1.6 Read-only summary (VIEWER, Practice preview)

```
Eyebrow  TEN MINUTES A WEEK
h1       Week check
p        Week 46 · 10–16 Nov
[status pill]  Done on Sunday  |  Not done yet
p        Read only. The household does the week check.
Look recap: six JarProgressBar rows (no links)
Intention (if done)
Next week's three (Practice preview with Growth read only)
```

The status pill is a `Badge`: `accent-soft` with an `accent` tick when done, `raised` with `fg-muted` when open.

### 1.7 Entry point: the Money header button (S-4.2)

**Component:** a new `WeekCheckEntry` client island, rendered by a new **`product/money/layout.tsx`** above every Money page. It hides itself on `/product/money/week-check`.

| Viewport | Layout |
| --- | --- |
| Phone | Full-width row under the shell header: status text on the left ("This week: not done yet" / "Done on Sunday"), `Button size="lg"` on the right (h-12). With long NL text the row wraps to two lines. The button never shrinks below 44 px. |
| `sm`+ | Right-aligned `Button size="md"` in a row above the page `h1`, with the status text on its left in `fg-muted`. |

| Who / state | Label | Style |
| --- | --- | --- |
| Writer, due and not done (S-5.2 due rule) | Week check | `primary` |
| Writer, not due, not done | Week check | `secondary` |
| Writer, done | Week check + ✓ icon (sr: done this week) | `secondary` |
| VIEWER / Practice preview | View week check | `secondary` |

The button reads `progress.weekCheckDoneThisWeek` from `money.dashboard.get` (S-5.1), using the same query key Home uses so the cache is shared. The due rule comes from the shared helper in §2.2. While it loads, the button renders `secondary` with no tick, so the layout doesn't shift.

When a Money page already has a primary action (for example "Add fixed cost"), the button is `secondary` even when the check is due. The Home card carries the due nudge, and one screen keeps one primary.

### 1.8 a11y

- Stepper: `<ol aria-label={steps_aria}>`. The current item has `aria-current="step"`. Done steps are buttons ("Go back to Look"). Future steps are plain list items, not buttons, so they are out of the tab order and are never a disabled control without a reason.
- On stage change, focus moves to the stage `h2`, and the polite live region announces `progress`.
- Redirect is a radio group operated with arrow keys. The selection is not conveyed by colour alone; the "Selected" text label carries it.
- Meters: `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and `aria-valuetext` ("Play, over by €42.10"), as `JarProgressBar` exposes today. If it doesn't, add this in that component.
- The sticky bar never covers focused content: add `scroll-padding-bottom: 8rem` on the page via the `scroll-pb-32` utility on the scroll container.
- Skip Course is a real `<button>` with the text label; it is not icon-only.

### 1.9 Open notes

- The **Course week key on grace days** (decision 2) needs the same rule: on Monday, Course's `weekCheckWeekFor` must point at *this* week, not the next. Otherwise Money closes W-1 and Course plans W+1, skipping W. `resolveMoneyWeek` must return the pair `{ moneyWeek, courseWeek }`. The backend agent should confirm.

---

## 2. CL-5 · Home in week 1

### 2.1 Flow

1. Home loads `money.dashboard.get` (it now includes `progress`).
2. `resolveNextMove(dashboard, today, reminderDay)` picks the first matching row (S-5.2 table).
3. The card renders with one primary button for writers, or text only for read-only users.
4. Under the card comes the week-1 checklist (S-6.5) when it applies.
5. The six jars and the hero total always show. The month score, levels, stat row, Coach tip, Today card and Growth widget each show only when their data rule holds (S-5.3).
6. When the user acts and comes back, the dashboard is refetched (existing invalidations) and the card moves on to the next row.

### 2.2 Pure helper

New **`apps/application/app/_lib/next-move.ts`** with a spec (`next-move.test.ts`):

```ts
type NextMove =
  | { kind: 'CLOSE_PRIOR'; month: PeriodKey }
  | { kind: 'NO_TRANSACTIONS'; zeroIncome: boolean }
  | { kind: 'INBOX'; count: number; minutes: number }     // minutes = max(1, ceil(n/6))
  | { kind: 'WEEK_CHECK' }
  | { kind: 'CLOSE_MONTH'; month: PeriodKey; daysLeft: number }
  | { kind: 'CALM'; nextCheckDay: Weekday };
resolveNextMove(input): NextMove
isWeekCheckDue(today: IsoDate, reminderDay: Weekday | null): boolean   // Fri–Sun, or ≥ reminderDay
```

`isWeekCheckDue` is also used by `WeekCheckEntry` (§1.7). It is the one place that defines "due". With decision 2, a check left open from last week counts as **due** from Monday onward.

### 2.3 Screen: Home

**Order, phone (one column):**

1. Header (existing): period eyebrow, `h1`, dream line (CL-7, unchanged).
2. **Next-move card** (new).
3. **Week-1 checklist** (S-6.5, new; §3.6).
4. `HeroKluis` + `JarDrilldownTable`: always shown. `stats` is passed as `[]` until `progress.hasTransactions`. Check that `HeroKluis` hides the stat row when it gets an empty array; it maps `stats` today.
5. `MonthScoreLog` (standalone, not inside the Coach slider) when the S-5.3 #1 rule holds. Levels only when `hasClosedMonth`. Do not render the `dashboard.levels.unlocks` line.
6. **One Coach tip** (`CoachVerdict` gets `messages={[firstRemaining]}` and no `scoreSlide`) plus the link "All tips ({n})" to `/product/coach`. Hidden when the Coach is off or the role can't see the Coach.
7. `TodayCard`, when `growthCourse` and `hasCompletedWeekCheck`.
8. Growth `PortalWidget`, when the role has Growth and `hasCompletedWeekCheck`.

**Tablet:** same order. The jar table shows two columns, as it does today.
**Desktop (`lg`):** a two-column grid `lg:grid-cols-[minmax(0,1fr)_22rem]`. The left column holds the header, next-move card, jars and month score. The right column holds the checklist, Coach tip, Today card and Growth widget. The next-move card is always the first thing in reading order.

Moving `MonthScoreLog` out of the `CoachVerdict` slider also fixes the "helpers off" duplicate branch in `home-dashboard.tsx`. There is one render path and one rule.

### 2.4 Component: `NextMoveCard`

New **`apps/application/app/_components/features/home/next-move-card.tsx`**. It is not `CoachVerdict`, because it must survive the Coach being off and is product state, not a tip.

```ts
type NextMoveCardProps = {
  move: NextMove;
  canAct: boolean;                    // writer && !preview
  canImport: boolean;                 // has CAPABILITIES.moneyImport
  formatMonth: (p: PeriodKey) => string;
  onCloseMonth: (p: PeriodKey) => void;   // opens existing CloseMonthDialog
};
```

Layout: `Card`, `rounded-2xl border-line bg-surface p-5 sm:p-6`. Eyebrow "NEXT MOVE" (`accent`), then the title as `h2` (`text-lg font-semibold`), then an optional body in `fg-muted text-sm`, then actions. On phones the primary button is `w-full size="lg"` and the secondary sits below it as a text link (`min-h-11`). From `sm` up, the buttons sit inline and left-aligned.

The calm state (row 6) has no button, just a text link "See your jars" that scrolls to the jars (`#jars`).

**Close month** (rows 1 and 5) opens the existing `CloseMonthDialog` (`_components/features/home/close-month-dialog.tsx`) with the same mutation `home-dashboard.tsx` uses today. A MEMBER may close.

### 2.5 Copy (EN) and keys

Namespace `pages.dashboard.next_move` (new), next to `pages.dashboard.coach`.

| Row | Key | EN |
| --- | --- | --- |
| — | `eyebrow` | Next move |
| 1, 5 | `close_month.title` | Close {month}: see your score and carry what's left. |
| 1, 5 | `close_month.cta` | Close month |
| 2 | `no_transactions.title` | Your jars are filled. Now see where it goes. |
| 2 | `no_transactions.body` | Add this week's spending — by hand or import a bank statement. Next week, your first week check takes ten minutes. |
| 2 | `no_transactions.body_basic` | Add this week's spending as it happens. Next week, your first week check takes ten minutes. |
| 2 | `no_transactions.cta` | Add a transaction |
| 2 | `no_transactions.import` | Import a statement |
| 2, zero | `zero_income.title` | No income yet? Add it when it lands — your jars split it the same second. |
| 2, zero | `zero_income.cta` | Add income |
| 3 | `inbox.title` | `{count, plural, one {# line in your Inbox — about {minutes} minute.} other {# lines in your Inbox — about {minutes} minutes.}}` |
| 3 | `inbox.cta` | Sort the Inbox |
| 4 | `week_check.title` | Inbox clear. Your week check is ready — ten minutes. |
| 4 | `week_check.cta` | Start week check |
| 6 | `calm.title` | Every euro has a job. Next week check: {weekday}. |
| 6 | `calm.title_other_currency` | Every amount has a job. Next week check: {weekday}. |
| 6 | `calm.link` | See your jars |
| read-only 1 | `viewer.close_prior` | {month} is ready to close. |
| read-only 2 | `viewer.no_transactions` | No spending added yet. |
| read-only 3 | `viewer.inbox` | `{count, plural, one {# line waiting in the Inbox.} other {# lines waiting in the Inbox.}}` |
| read-only 4 | `viewer.week_check` | This week's check is still open. |
| read-only 5 | `viewer.close_month` | {month} closes in `{days, plural, one {# day} other {# days}}`. |
| error | `error` | Couldn't load your next move. |
| error | (retry) | reuse `ui.button.try_again` |
| coach | `pages.dashboard.coach.all_tips` | `All tips ({count})` |

Remove `pages.dashboard.coach.all_sorted` from Home. It may stay in the file until nothing references it.

The inbox minutes inside the ICU plural are `{minutes}` because `minutes` is a separate number. The NL agent should use a nested plural there.

"Every euro" is wrong for USD and GBP households, so `calm.title_other_currency` is used when the household currency is not EUR. NL: *Elk bedrag heeft een taak* already works for every currency, so NL may use the same text for both keys.

### 2.6 States

| State | What shows |
| --- | --- |
| **Loading** | A card skeleton (eyebrow bar, two text bars, one `h-12` button bar), then the jar skeleton. The checklist doesn't render until data arrives, so it doesn't flash. |
| **Error** | The card area shows `error` with a `secondary` **Try again** button that refetches `money.dashboard.get`. It never guesses a row. The jars area keeps its own existing error handling. |
| **Empty / first run** | Row 2 (or its zero-income variant), the checklist and the jars at 0 or at their split. No score, no levels, no stat row, no Coach tip that repeats the card. |
| **Success** | The card moves to the next row after a refetch. There is no toast from Home itself. |
| **VIEWER** | The card shows `viewer.*` text with no buttons. Row 6 calm text still shows with the "See your jars" link (navigation is fine). No checklist, no Coach tip, no "All tips". |
| **Practice preview** | Same as VIEWER. |
| **Plan-locked** | Basic sees no Import secondary and uses `no_transactions.body_basic`, which doesn't mention import. There is no lock on Home. |
| **Coach off** | The card and checklist stay. The Coach tip and "All tips" link are hidden. The Coach page is still reachable from More, so it can be turned back on. |
| **Deferred portals** | Energy and Soul widgets stay behind `isProductEnabled`. The calm state links only to the jars, never to Soul. |
| **Period travel** | The card always describes **now** (S-5.2 #5). When travelling, add `pages.dashboard.next_move.travel_note` **new**: "About today, not {period}." in `fg-muted` under the eyebrow, so the user isn't confused. |

### 2.7 a11y

- The card is a `<section aria-labelledby>` pointing at its `h2`. When the row changes after a refetch, don't move focus. A polite live region on the card title announces the new move only after a user action on this page.
- The "All tips ({n})" link text is self-describing.
- On phones the card's single button is `h-12`. The secondary text link has `min-h-11`.

---

## 3. CL-6 · Onboarding in two screens

### 3.1 Flow

1. A signed-in person with no writable household reaches `/onboarding` (or `/onboarding/create` for VIEWER-only people). A pending invite still redirects first (unchanged).
2. **Screen 1 · Your income**: currency and net monthly income. Next validates the income and parses it by locale.
3. On Next, the client calls `household.previewSplit({ currency, monthlyNetIncome })` once and pushes `?step=split` (history entry, so browser Back returns to screen 1 with the input kept).
4. **Screen 2 · Here's where your {amount} goes**: six jars in euros (or the chosen currency) from the server.
5. **"Looks right — open my board"** calls `household.onboard` once (the server creates the jars, the "Main account" per decision 1, settings, income, and `jar_bank_setup_done = true`). Then `setActiveHousehold`, then `refreshSession`, then `router.replace('/')`.
6. Home shows the next-move card row 2 and the week-1 checklist.

Removed: the welcome step, the household name field, the jars step, the why step, the "Start a practice instead" link, `JarBankSetupFlow` on this page, the `updateSettings` follow-up call and the `offer-tour` flag hand-off.

### 3.2 Screen 1 · Your income

**Layout:** the existing `onboarding/layout.tsx` (form column plus `AuthAside` on `lg`). The card keeps today's shell: the progress chip on the top right and a footer action bar.

```
[1 of 2]                                  ← chip, existing style
h2  Your income                           ← focus target
p   Type what lands in your account each month. Next you'll see it split into six jars.

CURRENCY                                  ← radiogroup, 3 options, each ≥ 44 px tall
[ EUR € ] [ USD $ ] [ GBP £ ]

Net monthly income
┌──────────────────────────────┐
│ €  │ 2.850                    │          ← Input inputMode="decimal", prefix shows symbol
└──────────────────────────────┘
After tax — what lands in your account.  ← hint (Field hint)
That's €2,850.00 a month.                 ← live echo (aria-live=polite), only when the parse succeeds

──────────────────────────────────────────
                         [ Next → ]       ← primary, w-full on phones (size lg)
```

Mockup: [`clarity-2/onboarding-income.svg`](./clarity-2/onboarding-income.svg).

**Components:** `Form`, `FormField`, `Field`, `Input`, `FormMessage`, `Button`, `Typography` (all already used in `steps/income-step.tsx`). The currency buttons become a real radio group (`role="radiogroup"` with `role="radio" aria-checked`). Today they are `aria-pressed` toggles in a `group`, which reads wrong for a one-of-three choice. Remove the household name `FormField`.

**Parsing (fixes the €1.23 bug).** Add a new pure function to **`apps/application/app/_lib/money-input.ts`** and leave the existing `parseAmountToMinorUnits` alone in this release:

```ts
parseLocaleAmount(raw: string, locale: 'en' | 'nl' | string):
  | { ok: true; minor: number }
  | { ok: false; reason: 'empty' | 'not_a_number' | 'negative' | 'too_many_decimals' | 'too_large' }
```

Rules (the spec must cover every row below):

1. Strip spaces, NBSP and currency symbols (`€ $ £`). A leading `-` gives `negative`.
2. Only digits, `.` and `,` are allowed after stripping; anything else gives `not_a_number`.
3. Both `.` and `,` present: the **last** separator is the decimal mark and the others are group marks.
4. Only one kind present:
   - It appears more than once: group marks.
   - It appears once with exactly 3 digits after it: ambiguous, so the locale decides. NL `.` is a group mark and `,` is decimal. EN `,` is a group mark and `.` is decimal.
   - Otherwise: the decimal mark.
5. Split into integer and fraction **strings**. More than 2 fraction digits gives `too_many_decimals`. `minor = int * 100 + pad(frac, 2)`, computed on integers with no float multiply.
6. More than `100_000_000` minor units gives `too_large`.

| Input | `nl` | `en` |
| --- | --- | --- |
| `1.234,56` | 123456 | 123456 (rule 3) |
| `1,234.56` | 123456 (rule 3) | 123456 |
| `1234,56` | 123456 | 123456 |
| `1.234` | 123400 | too_many_decimals |
| `1,234` | too_many_decimals (rule 4: NL reads `,` as decimal) | 123400 |
| `2850` | 285000 | 285000 |
| `€ 2.850` | 285000 | too_many_decimals |
| `0` | 0 | 0 |
| `-5` / `abc` / `` | negative / not_a_number / empty | same |

For `1,234` in NL, rule 4 says the locale decides: `,` is the decimal mark, so three decimals give `too_many_decimals`. The visible error tells the user to fix it, and that is safer than a silent guess. The live echo makes every successful parse visible before Next (S-6.2 #3).

The Zod schema in `onboarding-shared.ts` keeps `monthlyIncome: z.string()`. A `superRefine` calls `parseLocaleAmount` with `useLocale()`, which gives inline field errors rather than only a toast (S-6.3 #5).

**Copy** (`pages.onboarding`, new keys unless marked):

| Key | EN |
| --- | --- |
| `step_of` *(existing)* | Step {current} of {total} → render as "1 of 2"; change EN to `{current} of {total}` |
| `income` *(existing title)* | Your income |
| `income_lead` **new** | Type what lands in your account each month. Next you'll see it split into six jars. |
| `currency` *(existing)* | Currency |
| `net_income_label` *(change)* | Net monthly income |
| `net_income_hint` *(change)* | After tax — what lands in your account. |
| `net_income_placeholder` **new** | Amount per month |
| `income_echo` **new** | That's {amount} a month. |
| `income_error_empty` **new** | Type your monthly income. Zero is fine. |
| `income_error_nan` **new** | Use numbers only, like you'd write an amount. |
| `income_error_negative` **new** | Income can't be below zero. |
| `income_error_decimals` **new** | Use at most two decimals. |
| `income_error_large` **new** | That's above what Rumtelo handles per month. Check the amount. |
| `next` *(existing)* | Next |

`income_error_nan` doesn't show an example amount, because examples count as sample data.

### 3.3 Screen 2 · Here's where it goes

The base is the audit mockup [`onboarding-split.svg`](./clarity-audit/onboarding-split.svg) with three changes:

1. A **split bar** at the top: one `h-2 rounded-full` row of six segments, widths from the server `percentage`, coloured with `jarChrome(key)`. It is decoration (`aria-hidden`); the list carries the meaning.
2. A **main-account line** (decision 1) above the note.
3. A **Back** secondary button next to the CTA.

```
[2 of 2]
h2  Here's where your €2,850.00 goes.          ← focus target; amount from server echo
p   Each jar has one job. Change the percentages any time — the habit matters more than the numbers.
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ (split bar)
<ul aria-label="Your split">
  ◉ Necessities         55%   €1,567.50
    rent, bills, groceries
  ◉ Financial Freedom   10%     €285.00
    money that works for you — never spent
  … six rows
</ul>
ⓘ All six jars sit on one main account for now. Add your bank when it suits you.
ⓘ Rumtelo never moves money. Savings pots at your bank? Move it there yourself — we show the split.
  Change the percentages any time in Money › Jars.
──────────────────────────────────────────
[ Back ]          [ Looks right — open my board ]
```

**Row layout (360 px):** a two-line row. Line 1: jar icon (`size-10`, `jarIcon`) + name (`font-semibold`, `min-w-0 truncate` only on `sm`+; on phones it wraps) + percentage (`font-mono text-xs fg-muted`) + amount (right, `font-mono tabular-nums`, `shrink-0`). Line 2: the job line in `fg-muted text-sm`. At the 1,000,000.00 cap the amount is "€550,000.00" (11 characters). At `text-sm` mono that is about 92 px, which fits next to a 120 px name at 360 px. The percentage moves to line 2 below 380 px if needed (`max-[380px]:` variant).

**Components:** `Typography`, `Button`, `jarIcon`/`jarChrome` (`_lib/jar-meta.ts`), and `JAR_NAME_KEYS` / `useJarCatalog` for names (existing `displayJars` logic, minus `pct`, which now comes from the server). For the error box, use `FormErrorBox` from `@rumtelo/ui`.

**Copy** (`pages.onboarding`, new):

| Key | EN |
| --- | --- |
| `split_title` | Here's where your {amount} goes. |
| `split_lead` | Each jar has one job. Change the percentages any time — the habit matters more than the numbers. |
| `split_list_aria` | Your split |
| `split_row_aria` | {jar}, {percent} percent, {amount} |
| `split_jobs.NECESSITIES` | rent, bills, groceries |
| `split_jobs.FINANCIAL_FREEDOM` | money that works for you — never spent |
| `split_jobs.EDUCATION` | courses, books, a new skill |
| `split_jobs.LONG_TERM_SAVINGS` | big buys and a safety buffer |
| `split_jobs.PLAY` | fun without guilt — spend it all |
| `split_jobs.GIVE` | gifts and causes you care about |
| `split_main_account` | All six jars sit on one main account for now. Add your bank when it suits you. |
| `split_note` | Rumtelo never moves money. Savings pots at your bank? Move it there yourself — we show the split. |
| `split_change_later` | Change the percentages any time in Money › Jars. |
| `split_zero` | No income yet? Your jars wait — they split it the second it lands. |
| `split_cta` | Looks right — open my board |
| `split_cta_pending` | Opening your board… |
| `split_error` | We couldn't load the jars — try again. |
| `onboard_error` | Your board wasn't created. Nothing was saved twice — try again. |
| (retry) | reuse `ui.button.try_again` |
| `household_default_named` | {name}'s household |
| `household_default` *(existing)* | My household |
| `main_account_name` | Main account |

`onboard_error` only promises "nothing was saved twice" if S-6.2 #6 is fixed in the backend pass. If it is not, use "Your board wasn't created yet. Try again." See Q4.

`main_account_name` is for the server's default account name, which follows the creator locale (NL *Hoofdrekening*). If the server owns that string, the key is only needed when the client sends the name. The backend agent decides.

### 3.4 States

| State | Screen 1 | Screen 2 |
| --- | --- | --- |
| **Loading** | — | The title renders with the client-parsed amount (the same value sent). Six skeleton rows (`h-16`). The CTA is disabled until the preview arrives. |
| **Error** | Inline field errors (§3.2). | Preview fails: `FormErrorBox` with `split_error` and a Retry button, and no numbers at all (S-6.3 #6). Back still works. Onboard fails: `FormErrorBox` with `onboard_error` + Retry above the action bar, plus a toast. The CTA re-enables. |
| **Empty / zero** | `0` is valid. | Percentages show, every amount reads €0.00, and `split_zero` sits under the list. The CTA is unchanged. |
| **Pending** | — | The CTA shows `split_cta_pending`, `disabled`, `aria-busy` (double-click safe). Back is disabled too. |
| **Success** | — | `router.replace('/')`. Keep `celebrateFireworks`, but shorten it to 1200 ms and skip it when `prefers-reduced-motion` is set (check that `Celebrate` already respects it). |
| **VIEWER soft-upgrade** (`/onboarding/create`) | The same two screens. | The same two screens. |
| **Invitee with pending invite** | Never sees these screens (unchanged redirect). | — |
| **Plan / Coach / Practice / deferred** | Not applicable. Onboarding is BASIC and pre-board. There is no Practice link (S-6.3 #8). | — |

### 3.5 a11y

- Each screen's `h2` gets focus on mount (existing `titleRef` pattern).
- The progress chip text "1 of 2" is visible. The dot strip stays `aria-hidden`.
- The live echo `income_echo` is in `aria-live="polite"` and only updates after 400 ms idle (debounced display only; it calls no API).
- Each list item has `aria-label={split_row_aria}` so a screen reader hears "Necessities, 55 percent, €1,567.50", followed by the job line as a description (`aria-describedby`).
- On phones the footer bar is `sticky bottom-0` inside the card, with buttons at `h-12`.

### 3.6 Week-1 checklist (S-6.5, on Home)

**Component:** a new `apps/application/app/_components/features/home/week1-checklist.tsx`.

```
┌ Card (raised, border-line) ─────────────────────────┐
│ SETTING UP · 1 OF 3 DONE                [Hide]       │ ← Hide: OWNER only, ghost, min-h-11
│ h3  Three small things, when it suits you.           │
│ ○ Add your bank to your main account        ›        │ ← Link rows, min-h-12
│ ● Write down your dream                Done          │
│ ○ Invite your partner                       ›        │
└──────────────────────────────────────────────────────┘
```

Items and their done rules (decision 1 changes the first item):

| Item key | EN | Done when | Who | Opens |
| --- | --- | --- | --- | --- |
| `bank` | Add your bank to your main account | some account has a `bankId` | OWNER, MEMBER | `/settings/product/money/bank/setup` |
| `dream` | Write down your dream | `settings.why` set | OWNER | `/settings/general/household` (dream field; anchor `#why`) |
| `invite` | Invite your partner | members > 1 or a pending invite | OWNER, MEMBER; hidden when `!withinLimit('maxMembers', n)` | `/settings/general/household#members` |

**Keys:** `pages.dashboard.checklist.{eyebrow, title, hide, hide_aria, done, items.bank, items.dream, items.invite}`.

- `eyebrow`: `Setting up · {done} of {total} done`
- `title`: Three small things, when it suits you.
  - When fewer items are visible, use `title_some`: `{count, plural, one {One small thing, when it suits you.} other {# small things, when it suits you.}}`. This is the safer default; prefer it over the fixed "Three".
- `hide`: Hide
- `hide_aria`: Hide the setup list for everyone in this household
- `done`: Done

**States:**

- Loading: render nothing.
- Error: render nothing. The checklist is optional and never blocks Home.
- All done or dismissed: render nothing.
- VIEWER or Practice preview: never rendered.
- Coach off: still shown.

A done row is not a link: an `accent` filled circle (`aria-hidden`) and the `done` text, so done is not shown by colour alone. Open rows are `Link`s with `aria-label` equal to the item text.

---

## 4. CL-8 · Navigation

### 4.1 Flow

1. The shell computes `buildNav(ctx)` once per render from role, plan capabilities, Practice preview, practice-staff state and launch flags.
2. **Phone:** four bottom tabs (Home · Money · Growth · More; three for VIEWER, which has no Growth). The Money portal shows a one-row tab strip under the header. More opens a bottom `Sheet`.
3. **Desktop:** centred pills Home · Money · Growth · More. More is a `DropdownMenu` with the same rows. Money shows the sub-pill row.
4. Route gating no longer comes from the visible nav (S-8.1): `CapabilityGate` and `ViewerPortalRouteGuard` read `ROUTE_CAPABILITIES`.

### 4.2 Prerequisite S-8.1: separate gating from nav

New **`apps/application/app/_lib/route-capabilities.ts`** (pure, with a spec):

```ts
export const ROUTE_CAPABILITIES: readonly {
  prefix: string;                       // '/product/money/debt'
  capabilityKey: CapabilityKey;
  section: HouseholdPermissionSection;  // MONEY | GROWTH | COACH | HOME | …
}[] = [ /* every route under /product/* — see table */ ];
export function routeAccessForPath(pathname): { capabilityKey; section } | null  // longest prefix
```

| Prefix | Capability | Section |
| --- | --- | --- |
| `/` | `homeOverview` | HOME |
| `/product/coach` | `homeCoach` | COACH |
| `/product/why` | `homeWhy` | HOME |
| `/product/money` | `moneyOverview` | MONEY |
| `/product/money/jars` | `moneyJars` | MONEY |
| `/product/money/transactions` | `moneySpending` | MONEY |
| `/product/money/transactions/import` | `moneyImport` | MONEY |
| `/product/money/fixed-costs` | `moneyFixedCosts` | MONEY |
| `/product/money/income` | `growthIncome` | **see Q5** |
| `/product/money/week-check` | `moneyOverview` | MONEY |
| `/product/money/debt` | `moneyDebt` | MONEY |
| `/product/money/net-worth` | `growthNetWorth` | MONEY |
| `/product/growth` | `growthOverview` | GROWTH |
| `/product/growth/course` | `growthCourse` | GROWTH |
| `/product/growth/goals` | `growthGoals` | GROWTH |
| `/product/growth/learn` | `growthLearn` | GROWTH |
| `/product/growth/net-worth` | `growthNetWorth` | GROWTH |
| `/product/growth/income` | `growthIncome` | GROWTH (redirects; kept so an old link is still gated) |
| `/product/energy…`, `/product/soul…` | existing keys | ENERGY / SOUL |

Changes:

- `capability-access.ts`: `capabilityKeyForPathname` uses `routeAccessForPath` instead of `resolveNavChildForPath`. Delete `CAPABILITY_PATH_ALIASES`.
- `viewer-portal-route-guard.tsx`: `sectionFromPath` uses `routeAccessForPath(path)?.section`.
- **Test (S-8.1 #4):** a spec that globs `app/(routes)/[locale]/(app)/(household)/product/**/page.tsx`, converts each to a URL (drops route groups, `@modal`, `[param]` becomes `x`), and asserts that `routeAccessForPath` returns non-null.

`/product/money/transactions/import` is gated by `moneyImport` here. Today it inherits `moneySpending`. Check whether the import page already gates itself in-page; if it does, keep the row anyway so the rule lives in one table.

**This lands and ships before any nav item moves.**

### 4.3 `nav.ts`: change plan

The file keeps its role (labels, hrefs, path matching) but no longer drives gating.

| Today | After |
| --- | --- |
| `ALL_NAV_GROUPS` with 3–6 children each | `PRIMARY_TABS`: `home` (no children), `money` (children: Jars, Inbox, Fixed costs, Income), `growth` (no shell children). `energy`/`soul` move to `PREVIEW_ROWS` (staging only). |
| `NAV_GROUPS`, `navGroupsForRole`, `BOTTOM_TABS` | Replaced by **`buildNav(ctx: NavContext): ShellNav`** (pure, tested). |
| `resolveNavChildForPath` used for gating | Kept only for **active-state** highlighting. It no longer imports `CAPABILITIES`. |
| `TOP_PILL_LABEL_KEYS` | Kept, plus `more`. |
| — | `MORE_ROWS` (ordered, each with a `visible(ctx)` predicate) |

```ts
type NavContext = {
  role: HouseholdRole;
  has: (cap: CapabilityKey) => boolean;   // usePlanCapabilities().hasCapability
  preview: PracticePreviewCapabilities;   // usePracticePreview().capabilities
  isPracticeStaff: boolean;               // practice.list non-empty
  plan: PlanKey;
};
type ShellNav = {
  tabs: { key: 'home'|'money'|'growth'|'more'; href: string|null; labelKey: string; icon: IconName }[];
  moneySubnav: { key: 'jars'|'inbox'|'fixed_costs'|'income'; href: string; labelKey: string; badge?: 'inbox' }[];
  moreRows: MoreRow[];                    // already filtered and ordered
  searchable: { href: string; labelKey: string; lockedPlan?: PlanKey }[]; // for Quick add
};
type MoreRow =
  | { kind: 'link'; key: string; href: string; labelKey: string; icon: IconName; badgeKey?: 'preview' }
  | { kind: 'plan_gains'; plan: PlanKey.PLUS | PlanKey.MAX }  // opens PlanGainsSheet (§5.4)
  | { kind: 'help' }                                          // opens existing Help sheet
  | { kind: 'exit_preview' };                                 // "Back to practice"
```

**Growth tab href:** `has(growthCourse)` gives `/product/growth/course`; otherwise `/product/growth/goals`. Linking straight to the target avoids a client-redirect flash. `/product/growth/page.tsx` still redirects (client `router.replace`, using the same rule as `goals-entry.tsx`) for typed or old URLs.

**More rows** (S-8.2 order). The predicates are written once in `MORE_ROWS`:

| Row | Visible when |
| --- | --- |
| Back to practice (`exit_preview`, top) | `preview.active` |
| Debt | `has(moneyDebt)` and role sees MONEY |
| Net worth | `has(growthNetWorth)` |
| Learn | `has(growthLearn)` and role sees GROWTH |
| More with Plus | plan BASIC and writer and not preview |
| More with Max | plan PLUS and writer and not preview |
| The Coach | role sees COACH (shown even when the Coach is off) and `preview.showCoachNav` |
| Why Rumtelo | always, except preview with `!showCoachNav` (today's rule) |
| Settings | `preview.showSettings` |
| Help | `preview.showPageHelp` and role sees COACH (today's rule for `PageHelpButton`) |
| Go to practice | `isPracticeStaff` and not preview |
| Energy · Soul (Preview) | `isProductEnabled('energy'/'soul')`, so staging only |

**Active tab:** the longest prefix wins across the tabs, money children and More rows. A path owned by a More row (Debt, Net worth, Learn, Coach, Why, Settings) highlights **More**. Inside More, that row shows `aria-current="page"` and an `accent-soft` background. See Q3.

**Inbox badge:** `moneySubnav.inbox` shows `inboxCount` from `money.dashboard.get`. It uses the same query options as Home, so the cache is shared. The dashboard query runs on every shell render; check with the performance agent that the dashboard query isn't too heavy. If it is, add a small `money.inbox.count` procedure later.

**Inbox target:** `/product/money/transactions`. It already opens on the INBOX tab for writers (`transactions-page.tsx:132`). When the count is 0, add `?tab=out`, which needs a one-line change to read `searchParams.get('tab')` in that page.

### 4.4 `household-shell.tsx`: change plan

Split the 819-line file so each piece has one owner, and the shell composes them. New files go in **`apps/application/app/_components/layout/shell-nav/`**:

| New file | Replaces (lines in today's `household-shell.tsx`) | Built from |
| --- | --- | --- |
| `portal-pills.tsx` | desktop pill bar (404–428) + More menu | `Link` pills (existing classes), plus `DropdownMenu` from `@rumtelo/ui` for More |
| `more-rows.tsx` | — | Renders `MoreRow[]` as `Link`/`button` rows. Shared by the menu and the sheet. |
| `more-sheet.tsx` | mobile portal dropdown (328–402) is **deleted** | `Sheet side="bottom"`, `SheetHeader`/`SheetTitle`, `more-rows` |
| `bottom-tabs.tsx` | bottom nav (781–811) | `<nav>` with 4 (or 3) cells. The More cell is a `<button aria-haspopup="dialog" aria-expanded>` that opens `MoreSheet`. |
| `money-subnav.tsx` | subnav strip + mobile subnav dropdown (619–716) | Desktop: pills. Phone: one `role="tablist"`-free row of `Link`s (nav links, not tabs), `aria-current="page"` on the active one. |
| `avatar-menu.tsx` | avatar menu (430–616) + `PracticeMenuLink` (95–150) | Same markup, trimmed |
| `header-tools.tsx` | period selector + Help + Settings (718–739) | `PeriodSelector`, `PageHelpButton`. The Settings link is removed (it is in More). |

**Header after the change:**

| | Phone (< `md`) | Desktop (`md`+) |
| --- | --- | --- |
| Left | Wordmark. Below 380 px use `RumteloLogo variant="icon"` to free space. | Wordmark |
| Centre | — | Pills: Home · Money · Growth · More |
| Right | `PeriodSelector` (compact) · Help (icon button, 44 × 44) · avatar (44 × 44; today `size-9` = 36 px, so raise it to `size-11`) | `PeriodSelector` · Help · avatar |
| Row 2 | Money only: `money-subnav` | Money only: sub-pills |

The period selector and Help move from the subnav row into the header row. Home, Growth and the More pages no longer have a subnav row, and the period selector must stay reachable on Home.

**Avatar menu after (S-8.4 #6):** user row; Language; Appearance; **My plan** (hidden for VIEWER and in preview, today's rule); **Go to practice** (only when `isPracticeStaff`; `PracticeMenuLink` loses `offerStart`); Sign out. Removed: Settings (now in More), "Start a practice" and the VIEWER "Start something of my own". The VIEWER banner in `<main>` keeps that door (`pages.shell.viewer.start_own_cta`).

**"Start a practice"** lives at `/settings/general/practice` for OWNERs. That page already exists; check that it offers the start link when there is no practice, and add it there if missing.

**Phone bottom tabs:**

```
┌──────────┬──────────┬──────────┬──────────┐
│   ◇      │   ◈      │   ↗      │   ≡      │
│  Home    │  Money   │  Growth  │  More    │   min-h-14, label text-xs, icon aria-hidden
└──────────┴──────────┴──────────┴──────────┘
```

- `grid-cols-4`, or `grid-cols-3` for VIEWER. The active cell uses `text-accent` plus a 2 px top bar `bg-accent`, so the state isn't colour alone.
- The Quick add FAB (`QuickAddFab`) stays, anchored above the tabs. It is hidden in preview and for read-only users (today's rule).

**More sheet (phone):** mockup [`clarity-2/more-sheet.svg`](./clarity-2/more-sheet.svg).

```
──── (drag handle, aria-hidden)
h2  More                                   [×]  ← SheetTitle; close button aria-label
┌ Back to practice ────────────────────── ›┐    ← preview only, accent-soft row
Debt                                        ›   min-h-12 rows, icon + label
Net worth                                   ›
Learn                                       ›
┌ More with Plus · €9/month ──────────── ›┐    ← accent-soft card row (Basic writer)
│ Course, debt-free date, statement import │
└──────────────────────────────────────────┘
The Coach                                   ›
Why Rumtelo                                 ›
Settings                                    ›
Help                                        ›
Go to practice                              ›
Energy  [PREVIEW]                           ›   ← staging only
```

The sheet is at most `max-h-[85dvh]` with `overflow-y-auto` and `pb-[env(safe-area-inset-bottom)]`. Tapping a row closes the sheet, then navigates. Escape closes it. Swipe down closes it if the `Sheet` primitive supports drag; if it doesn't, the close button and overlay tap are enough, and swipe is a follow-up for `packages/ui` (Q6).

**Desktop More menu:** a `DropdownMenu` anchored to the More pill, `align="end"`, `w-72`, with the same `more-rows`. The plan-gains row opens `PlanGainsSheet` as `Sheet side="right"`.

### 4.5 Copy (EN) and keys

`pages.nav` (existing namespace):

| Key | EN |
| --- | --- |
| `pills.more` **new** | More |
| `children.jars` *(exists)* | Jars |
| `children.inbox` **new** | Inbox |
| `children.fixed_costs` *(exists)* | Fixed costs |
| `children.income` *(exists)* | Income |
| `children.debt`, `net_worth`, `learn`, `coach`, `why` *(exist)* | Debt · Net worth · Learn · The Coach · Why Rumtelo |
| `more.title` **new** | More |
| `more.close` **new** | Close |
| `more.settings` **new** | Settings |
| `more.help` **new** | Help |
| `more.go_to_practice` **new** | Go to practice |
| `more.back_to_practice` **new** | Back to practice |
| `more.preview_badge` **new** | Preview |
| `more.with_plan` **new** | More with {plan} |
| `more.with_plan_price` **new** | {plan} · {price}/month |
| `more.with_plus_line` **new** | Course, your debt-free date, statement import |
| `more.with_max_line` **new** | Net worth and room for more people |
| `inbox_badge_sr` **new** | `{count, plural, one {# to sort} other {# to sort}}` |
| `aria.mobile_tabs` **new** | Main |
| `aria.money_sections` **new** | Money sections |

Change `children.why` from "Why Rumtelo?" to "Why Rumtelo". Remove `children.home_overview`, `money_overview`, `transactions`, `growth_overview` once nothing references them (`quick-add.tsx` searches labels; update it in the same change).

### 4.6 States

| State | Behaviour |
| --- | --- |
| **Loading** (`!planReady`) | Tabs render Home · Money · More right away. Growth and plan-dependent More rows appear when the plan is known; reserve the cell width so there is no layout shift (render the Growth cell as a skeleton label). The Inbox badge is hidden until the count arrives. |
| **Error** | If the plan or role fails to load, `CapabilityGate` keeps its `BrandLoader` (today's behaviour). The nav fails closed: Home and Money only, with no upgrade rows. |
| **Empty** | Not applicable. |
| **VIEWER** | 3 tabs. More: Debt (if the plan has it), Net worth (Max), Why, Settings (account section), Help. No upgrade rows, no Coach. |
| **Practice preview** | Tabs follow the client's plan and link sections. More has **Back to practice** on top, and hides Settings, Help and upgrade rows. The preview ring and banner stay. |
| **Plan-locked** | Basic shows no faded rows. One "More with Plus" row (§5.4). Plus shows "More with Max". Max shows none. |
| **Coach off** | The Coach row stays in More, so the Coach can be turned back on. |
| **Deferred portals** | Production: no Energy or Soul anywhere (tabs, More, Quick add search). Staging: two More rows with the `Preview` badge. |

### 4.7 a11y

- Desktop pills and bottom tabs: `<nav aria-label>`; the active link has `aria-current="page"` (not `aria-pressed`). More is a `<button>` with `aria-haspopup` and `aria-expanded`, never a link.
- Sheet: Radix Dialog semantics from `Sheet`, so focus is trapped, returns to the More tab on close, and Escape closes. The first focusable element is the first row, not the close button. `SheetTitle` is visible.
- Money sub-tabs on phones: 4 links in one row. `flex-1 min-w-0 text-center` with `text-[13px]` fits at 375 px in EN. In NL, "Vaste lasten" is the longest label; if the row overflows below 375 px, it scrolls horizontally inside itself (`overflow-x-auto snap-x`, no page scroll), and the active link scrolls into view on mount. Each link has `min-h-11`.
- The Inbox badge is visible text in a pill plus an `sr-only` `inbox_badge_sr`. It is not `aria-hidden` and not colour-only.
- Every row in More has a text label. Icons are `aria-hidden`.

---

## 5. CL-9 · Locks that explain the gain

### 5.1 Flow

1. The user opens a gated route, either directly or from search. `CapabilityGate` (now fed by `ROUTE_CAPABILITIES`) renders `LockedGate`.
2. `LockedGate` picks the audience: OWNER, MEMBER, VIEWER or Practice preview.
3. **OWNER:** reads the gain and price, sees the Example preview, then:
   - **Switch to {plan}** opens `/settings/general/plan` (existing plan settings + `PlanChangeDialog`), or
   - **Not now** goes `router.back()` when in-app history exists, otherwise to the portal root.
4. **MEMBER:** the same card, but with "Ask {owner} to switch to {plan}." as text and **Not now**.
5. **VIEWER and preview:** today's copy and buttons, with **Back** instead of "Not now". No price.

### 5.2 Component: `LockCard`

New **`apps/application/app/_components/features/shell/lock-card.tsx`**. It is used by `LockedGate` (page variant), the Basic Growth landing (compact variant) and, through its parts, `PlanGainsSheet`.

```ts
type LockCardProps = {
  capabilityKey: CapabilityKey;
  requiredPlan: PlanKey.PLUS | PlanKey.MAX;
  variant: 'page' | 'compact';
  onNotNow?: () => void;          // compact: hide for session; page: default back()
};
```

Why not extend `EmptyState` or `AccentCard`? A lock needs a price title, a role-dependent action row, an Example region and a not-colour lock marker. `EmptyState` has one action and no audience logic, and `AccentCard` is only a tinted frame. `LockCard` composes `Card`, `Badge`, `Typography` and `Button` instead of re-skinning them.

**Page variant layout (phone):** mockup [`clarity-2/lock-card.svg`](./clarity-2/lock-card.svg).

```
PageContent narrow, centred column, py-10
[🔒 Locked · in Plus]                          ← Badge: icon aria-hidden + visible text
h1  Debt is in Plus · €9/month                 ← focus target
p   See the date you're debt-free and what one extra payment changes.
    Everything you've entered stays yours on every plan.
┌ Example ───────────────────────────────────┐ ← LockPreview, aria-hidden except caption
│ EXAMPLE                                     │
│ Debt-free  ▬▬▬▬▬▬▬▬▬▬▬▬░░░░  Mar 2028       │
│ +€50 a month → 7 months sooner              │
└─────────────────────────────────────────────┘
[ Switch to Plus ]                             ← primary, w-full on phone
[ Not now ]                                    ← secondary, w-full on phone
```

**Tablet/desktop:** two columns at `md`, text and actions on the left and the Example on the right. Buttons are inline, `size="md"`.

**Compact variant** (Basic Growth landing, at the top of `/product/growth/goals`): a `Card` with `accent-soft` tint. It holds the Badge, then the title as `h2 text-base`, the gain line, and the actions "Switch to Plus" (primary, `size="md"`; `lg` on phones) and "Not now" (ghost). There is no Example, to keep it short. "Not now" sets `sessionStorage['rumtelo.coursePreview.hidden'] = '1'` and the card collapses (S-9.2 #5). MEMBER sees the ask line instead of the button.

**`LockPreview`** (`lock-preview.tsx`, same folder): static shapes and **numbers only**, rendered with `Intl` from code constants in the component file. There are no sample words in i18n; labels are product nouns. One preview per capability (Debt, Course, Import, Learn, Net worth), plus a generic fallback (three neutral bars). The preview is `aria-hidden="true"`. The visible caption "Example" is outside the hidden part, so a screen reader hears "Example" and then moves on.

### 5.3 Copy (EN) and keys

`pages.shell.gates.lock` (new block inside the existing `gates`):

| Key | EN |
| --- | --- |
| `badge` | Locked · in {plan} |
| `badge_sr` | Locked: in {plan} |
| `title` | {feature} is in {plan} · {price}/month |
| `body_tail` | Everything you've entered stays yours on every plan. |
| `example` | Example |
| `switch_cta` | Switch to {plan} |
| `not_now` | Not now |
| `back` | Back |
| `ask_owner` | Ask {owner} to switch to {plan}. |
| `ask_owner_unknown` | Ask the owner of this household to switch to {plan}. |
| `region_aria` | Locked: {feature} is in {plan} |

Gain lines go in `features.capabilities.{key}.gain` (new leaf next to `name`/`description`, with `description` as the fallback):

| Capability | `gain` EN |
| --- | --- |
| `money-debt` | See the date you're debt-free and what one extra payment changes. |
| `growth-course` | Plan your week around the three things that move your goals. |
| `money-import` | Bring in a bank statement instead of typing every amount. |
| `growth-learn` | Pick one skill a quarter and keep track of what you learn. *(copywriter check)* |
| `growth-net-worth` | See what you own minus what you owe, in one number, every month. *(copywriter check)* |

`title` uses `features.capabilities.{key}.name`. Check those names: `growth-course` must read "Course", never "Plan", and `money-spending` reads "Transactions". Lock titles never use the latter, because the Inbox isn't gated.

Retire `locked_plan_title`, `locked_plan_aria` and `upgrade_cta` once `LockedGate` no longer uses them. Keep the `_practice` and `_viewer` keys.

**Price:** `planPriceLabel(plan)` must read `PLAN_RETAIL_CENTS[plan].month` (S-9.3). The title passes the formatted amount only (for example "€9"); "/month" lives in the copy so NL can say "/maand".

### 5.4 Component: `PlanGainsSheet` ("More with Plus" / "More with Max")

New `apps/application/app/_components/features/shell/plan-gains-sheet.tsx`. It is a `Sheet` (`side="bottom"` below `md`, `side="right"` from `md` up).

```
h2  More with Plus
p   Plus · €9/month
─────────────────────────────
Course
  Plan your week around the three things that move your goals.
Debt
  See the date you're debt-free and what one extra payment changes.
Import
  Bring in a bank statement instead of typing every amount.
Learn
  Pick one skill a quarter and keep track of what you learn.
─────────────────────────────
Everything you've entered stays yours on every plan.
[ Switch to Plus ]            (OWNER)   |   Ask {owner} to switch to Plus.  (MEMBER, text)
[ Not now ]
```

**Max sheet:** Net worth, followed by limit rows rendered from `PLAN_LIMITS` with `memberLimitLabel` and friends in `_lib/plan.ts`, never hard-coded:

- `pages.shell.plan_gains.members`: `Up to {count} people on the board`
- `pages.shell.plan_gains.goals_unlimited`: `As many goals as you need`
- `pages.shell.plan_gains.goals`: `Up to {count} goals`
- `pages.shell.plan_gains.bank_links`: `{count, plural, one {# bank link} other {# bank links}}`

The other `pages.shell.plan_gains` keys are `title` ("More with {plan}"), `price` ("{plan} · {price}/month") and `close`.

### 5.5 States

| Audience / state | Page lock | Compact card | Gains sheet |
| --- | --- | --- | --- |
| **Loading** (plan or membership not ready) | `BrandLoader` (today's behaviour). Fail closed: no CTA until `membershipRole` is known (keep the `showHouseholdUpgrade` guard). | Not rendered until the plan is ready. | The row isn't rendered until the plan is ready. |
| **OWNER** | Switch to {plan} + Not now | Switch + Not now | Switch + Not now |
| **MEMBER** | `ask_owner` text + Not now | `ask_owner` + Not now | `ask_owner` + Not now |
| **Owner name unknown** (members query failed) | `ask_owner_unknown` | same | same |
| **VIEWER** | Today's viewer title and body, **Back**, no price | never shown (no Growth) | never shown |
| **Practice preview** | Today's practice copy; MANAGE: Practice billing; VIEW: back to clients. No price. | never shown | never shown |
| **Plus on a Max page** | Max price and Max gain | — | "More with Max" |
| **Coach off** | Not applicable | Not applicable | Not applicable |
| **Deferred portals** | Energy and Soul routes stay launch-gated (`isCapabilityEnabledAtLaunch`). They show the launch block, never a price lock. | — | Never lists Energy or Soul. |
| **Error** | No data fetch except members (for the owner name). On failure, use the fallback copy. | same | same |

### 5.6 a11y

- The page lock is a `<section role="region" aria-labelledby={h1}>`. The visible `Badge` text "Locked · in Plus" is announced. 🔒 stays `aria-hidden`.
- Focus goes to the `h1` on mount, so a keyboard user lands on the explanation, not on the CTA.
- "Not now" is a `<button>` (it calls `back()`), not a link with `href="#"`.
- The search-result lock marker (S-9.2 #3) is a `Badge` with visible text "Plus" and `sr-only` `badge_sr`.

---

## 6. Dutch strings to pin

The NL agent pins these in `translations/overrides.ts`. Machine output often gets these terms or lengths wrong.

| Key | NL (proposed) | Why pin |
| --- | --- | --- |
| `features.money.week_check.page_title` / `entry` | Weekcheck | One word, product noun |
| `features.money.week_check.skip_course` | Koers deze week overslaan | *Koers*, never *cursus* |
| `features.money.week_check.group_course` | Koers · week {week} | same |
| `features.money.week_check.step_course_ahead` | De drie voor volgende week | length |
| `features.money.week_check.grace_note` | De weekcheck van vorige week staat nog open. Rond die eerst af — deze week volgt daarna. | tone |
| `pages.dashboard.next_move.*` | from audit §6 (NL column) | already written |
| `pages.dashboard.next_move.calm.title` | Elk bedrag heeft een taak. Volgende weekcheck: {weekday}. | story text |
| `pages.dashboard.checklist.items.bank` | Voeg je bank toe aan je hoofdrekening | *hoofdrekening* (decision 1) |
| `pages.onboarding.split_cta` | Klopt — open mijn overzicht | audit §6 |
| `pages.onboarding.split_jobs.*` | NECESSITIES: huur, vaste lasten, boodschappen; the others are new | *potjes* vocabulary |
| `pages.onboarding.household_default_named` | Huishouden van {name} | word order (not "{name}'s huishouden") |
| `pages.onboarding.main_account_name` | Hoofdrekening | decision 1 |
| `pages.onboarding.net_income_hint` | Na belasting — wat er op je rekening binnenkomt. | *je* form |
| `pages.nav.pills.more` | Meer | short tab |
| `pages.nav.children.inbox` | Inbox | keep the English product noun |
| `pages.nav.children.fixed_costs` | Vaste lasten | longest sub-tab; check at 360 px |
| `pages.nav.more.with_plan` | Meer met {plan} | — |
| `pages.shell.gates.lock.title` | {feature} zit in {plan} · {price}/maand | audit §6 |
| `pages.shell.gates.lock.switch_cta` | Overstappen naar {plan} | **not** "Probeer" (no trial, decision 3) |
| `pages.shell.gates.lock.not_now` | Nu niet | — |
| `pages.shell.gates.lock.body_tail` | Alles wat je invult blijft van jou, op elk abonnement. | audit §6 |
| `features.capabilities.*.gain` | debt, course and import from audit §6; learn and net worth new | — |

**Long-string watch (NL is about 30 % longer):** the Money header row text plus button (§1.7) wraps by design. The next-move card titles wrap (no truncation anywhere). In the lock title, `{feature} zit in {plan} · €9/maand` wraps to two lines at 360 px, which is fine at `text-xl`. The bottom tab "Meer" is short. In the stepper, `Stap 4 van 6 · ongeveer tien minuten` fits on one line at 360 px with `text-xs`.

---

## 7. Open questions

| # | Question | Design default until answered |
| --- | --- | --- |
| Q1 | After **Skip Course this week**, where does a Plus user finish Course for that week? The Course route is retired (S-4.3) and story #8 shows only the Done summary. | The Done summary shows `done_course_open` + "Set next week's three", which reopens the Course stages only. It needs PM sign-off, because it is a second entry into a "done" check. |
| Q2 | Decision 2 (grace week) for the **Course** key: on Monday, should Course plan *this* week? | Yes (§1.9). The backend confirms. |
| Q3 | On Debt, Net worth or Learn pages, is the active tab **More** or **Money/Growth**? | More (the place the user came from). Each page keeps its own `h1`. |
| Q4 | S-6.2 #6 (no second organization on retry): is it fixed in the backend pass? | The copy `onboard_error` depends on it (§3.3). |
| Q5 | Decision 5 says "keep today's access unchanged (VIEWER = read-only)", but today a VIEWER can't see Income at all (Growth = NONE). Does `/product/money/income` take the MONEY section (VIEWER reads) or keep GROWTH (VIEWER blocked, and the sub-tab hidden for VIEWER)? | I read "VIEWER = read-only" as **MONEY section, read-only**, which matches the S-8.2 table. The security reviewer confirms. If it is GROWTH, `buildNav` hides Income for VIEWER and the Money sub-row has 3 items. |
| Q6 | Does `Sheet` support swipe-down to close? | If not, the close button and overlay are enough for this release. Swipe is a `packages/ui` follow-up. |
| Q7 | MEMBER "Ask {owner}": should it become a button that notifies the owner? | No: there is no notify channel, and a button with no effect is a dead end. It stays text. |

---

## 8. Build split for two engineers

Run the backend pass first (stories "Recommended order" step 1: `previewSplit`, onboard in one call with the "Main account", `dashboard.progress`, week-check idempotency and gating, the single Sunday entry, `boardReady`, and the S-9.3 price fix). The two frontend tracks below then run **in parallel with no shared files**. Each track owns its own translation modules.

### Engineer A: the routine and the first week (CL-4, CL-5, CL-6 UI)

| Area | Files (create **C**, edit **E**, delete **D**) |
| --- | --- |
| Week check flow | **E** `app/(routes)/[locale]/(app)/(household)/product/money/week-check/page.tsx` · **C** `…/money/week-check/_components/week-check-flow.tsx`, `week-check-stepper.tsx`, `money-stages.tsx`, `course-stages.tsx`, `week-check-done.tsx`, `week-check-summary.tsx` · **D** `…/money/week-check/_components/week-check-page.tsx` · **C** `…/money/week-check/_utils/week-check-steps.ts` (+ `.test.ts`) |
| Old wizard | **D** `app/_components/features/week-check/week-check-wizard.tsx`, after its parts move to `money-stages.tsx` |
| Course retire | **E** `…/product/growth/course/week-check/page.tsx` (becomes `permanentRedirect` to `/{locale}/product/money/week-check?from=course`) · **D** `…/growth/course/_components/week-check-page.tsx` · **E** `…/growth/course/_components/course-page.tsx` (header link, line 133) |
| Money entry | **C** `…/product/money/layout.tsx` · **C** `…/product/money/_components/week-check-entry.tsx` |
| Home | **E** `app/(routes)/[locale]/(app)/(household)/_components/home-dashboard.tsx` · **C** `app/_components/features/home/next-move-card.tsx`, `week1-checklist.tsx` · **C** `app/_lib/next-move.ts` (+ `.test.ts`) · **E** `app/_components/features/home/hero-kluis.tsx` (only if an empty `stats` array needs handling) · **E** `app/_components/features/home/coach-verdict.tsx` (only if "All tips" needs a slot) |
| Overspent meter | **E** `app/_components/features/money/jar-progress-bar.tsx` (only if `role="meter"` is missing) |
| Onboarding | **E** `app/(routes)/[locale]/onboarding/page.tsx`, `_components/onboarding-flow.tsx`, `_components/onboarding-shared.tsx`, `_components/steps/income-step.tsx` · **C** `_components/steps/split-step.tsx` · **D** `_components/steps/welcome-step.tsx`, `why-step.tsx`, `jars-step.tsx` · **E** `app/_lib/money-input.ts` (add `parseLocaleAmount` + `money-input.test.ts`) |
| Bank setup move | **C** `app/(routes)/[locale]/(app)/(household)/settings/product/money/bank/setup/page.tsx` (hosts the moved `JarBankSetupFlow`) · **E/move** `app/(routes)/[locale]/onboarding/_components/jar-bank-setup-flow.tsx` → `settings/product/money/bank/setup/_components/` |
| Inbox tab param | **E** `…/product/money/transactions/_components/transactions-page.tsx` (read `?tab=`) |
| i18n | **E** `packages/i18n/translations/features/money.ts`, `features/growth.ts` (remove page-level week-check keys), `pages/dashboard.ts`, `pages/onboarding.ts` |

### Engineer B: the chrome and the locks (CL-8, CL-9 UI)

| Area | Files |
| --- | --- |
| S-8.1 gating (ship first) | **C** `app/_lib/route-capabilities.ts` (+ `.test.ts` with the page glob) · **E** `app/_lib/capability-access.ts` · **E** `app/_components/features/shell/viewer-portal-route-guard.tsx` |
| Nav model | **E** `app/_lib/nav.ts` (+ **C** `nav.test.ts` for `buildNav`) |
| Shell | **E** `app/_components/layout/household-shell.tsx` · **C** `app/_components/layout/shell-nav/portal-pills.tsx`, `more-rows.tsx`, `more-sheet.tsx`, `bottom-tabs.tsx`, `money-subnav.tsx`, `avatar-menu.tsx`, `header-tools.tsx` · **E** `app/_components/layout/quick-add.tsx` (search `buildNav().searchable`) |
| Growth landing | **E** `…/product/growth/page.tsx` (client redirect by plan) · **E** `…/product/growth/goals/page.tsx` or its `_components/goals-entry.tsx` (compact `LockCard` on Basic) |
| Income move (S-8.3) | **C** `…/product/money/income/**` (re-export the existing income pages) · **E** `…/product/growth/income/**/page.tsx` (`permanentRedirect`) · **E** the `@modal` intercepts under `fixed-costs` and `net-worth` that point to `growth/income` |
| Practice entry | **E** `…/settings/general/practice/page.tsx` (only if it lacks "Start a practice") |
| Locks | **E** `app/_components/features/shell/locked-gate.tsx` · **C** `app/_components/features/shell/lock-card.tsx`, `lock-preview.tsx`, `plan-gains-sheet.tsx` · **E** `app/_lib/plan.ts` (`lockCopyFor` adds `gain`; `planPriceLabel` is the backend-pass fix, but if not done there, B owns it) |
| i18n | **E** `packages/i18n/translations/pages/nav.ts`, `pages/shell.ts`, `features/capabilities.ts` |

**Hand-off points (imports only, no shared edits):**

- B's `money-subnav.tsx` doesn't render the week-check button. A's `product/money/layout.tsx` renders it under the shell, so neither touches the other's file.
- A's `next-move.ts` exports `isWeekCheckDue`. B doesn't need it.
- Both read `apiQuery.money.dashboard.get` with the **same** `queryOptions` input (`{ householdId, period: currentPeriodKey }`), so the cache is shared. Agree on this one-liner before starting: Home uses the *selected* period today, while the badge needs *now*. `progress` and `inboxCount` are "as of now", so B can pass the selected period and still get the same count.
- `/product/money/income` exists only after B's S-8.3. A's links (`look_add_income`, the zero-income CTA) point there. The old path 308s, so the merge order doesn't matter.
- Merge order: B's S-8.1 first (smallest). Then A and B in any order.

**Pending for Given:** `pnpm i18n:gen` after both tracks land (it needs `DEEPL_API_KEY`). The NL pins in §6 go into `overrides.ts` first.

---

## Orchestrator answers to §7 (17 Nov 2026)

1. **VIEWER and Income:** "unchanged" means unchanged. If VIEWER cannot see Income today, it still cannot after Income moves under Money. Do not widen access.
2. **Monday grace:** the Course week key follows the same rule as the Money check, so the week is not skipped.
3. **After "Skip Course this week":** accept the proposal. The Done summary offers "Plan Course anyway" for that week.
4. **Shell split:** split `household-shell.tsx` only as far as the nav change needs. No large refactor for its own sake.
