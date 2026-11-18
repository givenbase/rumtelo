# Clarity 3: design, app side (CL-12, CL-13, G-1, G-2, D4)

**Date:** 2026-11-17 · **Owner:** ux-ui-designer · **Status:** design ready for build. Nothing is built.
**Inputs:** [`clarity-3-stories.md`](./clarity-3-stories.md), including *Decisions on the open questions*, which are final. Shared rules, `NextMoveCard`, `LockCard`, `PlanGainsSheet`, `Week1Checklist` and the shell split come from [`clarity-2-design.md`](./clarity-2-design.md) §0 and are not repeated here.
**Mockups (375 px, brand tokens):** [`clarity-3/coming-up.svg`](./clarity-3/coming-up.svg) (More at SPLIT + Coming up sheet) · [`clarity-3/close-month.svg`](./clarity-3/close-month.svg) (close flow: prior month first, then bills).
**Website (CL-11):** the stories fix the order, copy and pricing rules of `/practices` completely. No extra layout here; the website engineer follows S-11.1/S-11.2 and the Clarity 1 landing components.

**Contents:** [0 Design decisions](#0-design-decisions-that-shape-everything-below) · [1 CL-12 Ladder](#1-cl-12--the-ladder-in-the-ui) · [2 CL-13 Quick add](#2-cl-13--quick-add-by-stage) · [3 G-1 Close month](#3-g-1--close-month-from-the-home-next-move) · [4 G-2 Checklist invite](#4-g-2--checklist-invite-from-seat-counts) · [5 D4 Levels](#5-d4--levels-without-fake-unlocks) · [6 NL pins](#6-dutch-strings-to-pin) · [7 Open questions](#7-open-questions) · [8 Build plan](#8-build-plan-one-frontend-engineer) · [9 Backend contract needs](#9-what-the-app-needs-from-the-backend)

---

## 0. Design decisions that shape everything below

These follow from reading the stories against the code. Each one is flagged again in §7 where it needs a yes.

1. **Decision 2 makes the ladder a Basic-only experience in practice.** "Whoever pays sees what they pay for" means a Plus or Max board's stage is the one that shows everything its plan has. Debt and Learn sit at `MONTH`, so that stage is `MONTH`. Plus/Max boards therefore never see Coming up or a stage note. Everything below is written **diff-based** (the UI asks "what does the next stage add for this plan and role?"), so it is correct for either reading of decision 2 (`MONTH` or "at least `ROUTINE`") without a code change. The server applies the plan rule inside `stage` (§9), so the client never mixes plan into stage.
2. **SORTING adds nothing visible.** In the stage table, the SPLIT and SORTING columns are identical (nav, More, Home, Quick add). The UI never names SORTING; Coming up and the stage note jump to the **first higher stage that adds something** on this plan and role. The stage stays in the contract (cheap, useful for analytics and future surfaces). The "Sort {n} more lines or wait {d} days" copy is designed and keyed but only renders if a future surface is placed at SORTING.
3. **"More with Plus" is never announced.** It appears at `ROUTINE` (decision 3), but it is not listed in Coming up and not in the stage note. Announcing an upgrade row as a reward would make week 1 an upsell countdown.
4. **Levels follow data, not stage.** The level name shows when `hasClosedMonth` is true (today's rule), not when the stage is `MONTH`. With the backfill floor, show-all and paid plans, a board can be at `MONTH` with no closed month, and a level with nothing scored breaks principle 4 ("no score before there is something to score").
5. **"Fail open" without a flash.** S-12.3 #2 says loading or error = `MONTH`. Rendering `MONTH` while loading would show a new Basic board Growth and The Coach for half a second, then take them away. Instead: **error = `MONTH`**, **loading = reserved space** (the Growth cell is a neutral placeholder; More rows render when More is opened, which is after the read in practice). Nothing paid is ever hidden by a failed read, and nothing appears then vanishes.
6. **"Show everything now" lives on the Account tab, not Preferences.** The story says "Settings › Account › Preferences" and says a VIEWER may change it, but a VIEWER can only open the `account` and `security` tabs (`VIEWER_ALLOWED_SETTINGS_TABS`). The Account tab (`/settings`) is the one place every role reaches, and the setting is personal like the profile there. A second door sits inside the Coming up sheet.

---

## 1. CL-12 · The ladder in the UI

### 1.1 Flow

1. The shell resolves the **effective stage** once per render (`useShellNav`):
   - Practice preview active → `MONTH`, no request.
   - `account.settings.showAllSurfaces === true` → `MONTH` (the progress read still runs; Home's next move doesn't need it, but the stage note bookkeeping does).
   - Otherwise `money.progress.get` → `stage`. While pending → `stageReady = false` (see §0.5). On error → `MONTH`.
2. `buildNav({ …, stage })` filters tabs, Money sub-nav, More rows and search by stage on top of plan, role, preview and launch (S-12.3 #1). It also returns, for writers below `MONTH`, one `coming_up` More row pointing at the next stage that adds something.
3. The person uses the board. The routine (Money header **Week check**, next-move card, Inbox, jars, fixed costs, income) is never deferred.
4. A trigger happens (first week check `DONE`, first month closed). The mutation invalidates `money.progress.get`; the stage rises.
5. The shell compares the stage with the last stage this browser saw for this household (`localStorage`). If it rose and the rise adds something, a **stage note** shows once under the header (§1.5).
6. At any time the person can open **More › Coming up** to see the next trigger and what it adds, or turn on **Show everything now** (sheet or Settings › Account).
7. Deferred pages still open from URL, Coach CTAs, Course schedule and Quick add search (S-12.4 #1, #2). Route gating never reads the stage.

### 1.2 Pure helpers

New **`apps/application/app/_lib/board-stage.ts`** with `board-stage.test.ts` (`node:test`, like `next-move.test.ts`):

```ts
export const BOARD_STAGE_ORDER: readonly BoardStage[];        // SPLIT, SORTING, ROUTINE, MONTH
export function stageAtLeast(stage: BoardStage, min: BoardStage): boolean;

/** The stage the UI uses for this person right now. */
export function effectiveStage(input: {
  previewActive: boolean;
  showAll: boolean;
  server: { status: 'pending' | 'error' | 'success'; stage?: BoardStage };
}): { stage: BoardStage; ready: boolean };   // pending → { stage: MONTH, ready: false }; error → { MONTH, ready: true }

/** What `to` shows that `from` doesn't, for this plan and role. Excludes plan_gains rows. */
export function stageAdditions(ctx: NavContext, from: BoardStage, to: BoardStage): StageItem[];

/** First stage above `stage` whose additions are non-empty, or null. */
export function nextVisibleStage(ctx: NavContext): { stage: BoardStage; items: StageItem[] } | null;

export type StageItem =
  | { kind: 'nav'; key: 'course' | 'goals' | 'coach' | 'debt' | 'net_worth' | 'learn' }
  | { kind: 'levels' };     // Basic ROUTINE → MONTH: the only addition is the month score level
```

`stageAdditions` calls `buildNav` twice and diffs tabs and More `link` rows, so the Coming up list and the stage note can never disagree with the menu. `levels` is added when `to === MONTH` and the board has no closed month yet (it is what a first close brings, §0.4).

**Stage per surface** (production, on top of plan + role + preview + launch; matches the story table):

| Surface | Shown from | Read in |
| --- | --- | --- |
| Tabs Home · Money, Money sub-nav (Jars, Inbox, Fixed costs, Income), Money **Week check** button | always | `buildNav`, Money layout |
| Growth tab | `ROUTINE` | `buildNav` |
| More: The Coach, More with Plus / More with Max | `ROUTINE` | `buildNav` |
| More: Debt, Net worth, Learn | `MONTH` | `buildNav` |
| More: Energy, Soul (Preview, staging only) | `MONTH` | `buildNav` |
| More: Why, Settings, Help, Go to practice, Back to practice | always | `buildNav` |
| More: Coming up | writer, below `MONTH`, `nextVisibleStage` not null | `buildNav` |
| Home: Growth widget, Today card, "All tips ({n})" link | `ROUTINE` | `home-dashboard.tsx` |
| Home: next move, checklist, jars, month score block | data rules (Clarity 2) | unchanged |
| Home: level name in the month score | `hasClosedMonth` (§0.4) | unchanged |
| Quick add kinds | §2 | `quick-add.tsx` |

### 1.3 Screens: tabs and More per stage

**Phone (360–430 px)**, bottom tabs, More = bottom `Sheet` (existing `MoreSheet`):

| Basic OWNER/MEMBER | Tabs | More sheet rows (order) |
| --- | --- | --- |
| SPLIT, SORTING | Home · Money · More (`grid-cols-3`) | Why Rumtelo · Settings · Help · (Go to practice) · **Coming up** |
| ROUTINE | Home · Money · Growth · More | More with Plus · The Coach · Why · Settings · Help · (Go to practice) · **Coming up** |
| MONTH | same | More with Plus · The Coach · Why · Settings · Help · (Go to practice) |

Plus/Max boards are at `MONTH` from day 1 (§0.1): Clarity 2's full More (Debt, Net worth, Learn, More with Max, The Coach, …). VIEWER: 3 tabs at every stage, More gains Debt/Net worth at `MONTH` when the plan has them; never Coming up (S-12.3 #5).

The tab bar goes from 3 to 4 cells when Growth arrives. That is a one-time change at the moment of the stage note (§1.5), which names it, so it doesn't feel like the UI moved by itself.

**Tablet (~768 px) and desktop:** the same rows in the desktop More `DropdownMenu` (`portal-pills.tsx`, `w-72`). Pills are Home · Money · More at SPLIT, Home · Money · Growth · More from ROUTINE. The Coming up row in the menu is a `DropdownMenuItem` button that opens the Coming up sheet as a right-side panel (same class recipe as `PlanGainsSheet`).

**Loading (`!stageReady`):** phone tabs render Home · Money · [placeholder] · More with `grid-cols-4`; the placeholder is an empty, `aria-hidden`, non-interactive cell. Desktop pills reserve nothing (pills are centred, a late pill doesn't shift content). If the stage resolves below `ROUTINE`, the grid drops to 3 once, early, before any interaction.

### 1.4 The Coming up row and sheet (S-12.4 #3)

**Row** (new `MoreRow` kind `{ kind: 'coming_up'; stage: BoardStage }`, rendered by `more-rows.tsx`): last row in More, above staging-only Energy/Soul. Two lines, plain like any other row: no lock icon, no fade, no badge.

```
Coming up                                  ›     ← text-sm font-semibold text-fg
After your first week check                      ← text-xs text-fg-muted
```

It is a `<button aria-haspopup="dialog">` with `aria-label` = `pages.nav.coming_up.row_aria` ("Coming up: after your first week check"). `min-h-14` in the sheet (two lines), `min-h-11` in the menu. Icon: `calendar-clock` in the same `RowIcon` tile as the other rows.

**Sheet** (new `apps/application/app/_components/layout/shell-nav/coming-up-sheet.tsx`). `Sheet side="bottom"` below `md` (`max-h-[85dvh]`, `pb-[env(safe-area-inset-bottom)]`), right panel `md:max-w-md` from `md` up. Mockup: [`clarity-3/coming-up.svg`](./clarity-3/coming-up.svg).

```
h2  Coming up                                        [×]
p   Rumtelo starts with your jars, Inbox and week check.
    More joins your menu as your board fills in.
NEXT                                                 ← eyebrow, accent
h3  Do your first week check — ten minutes.          ← trigger line
[ Start week check ]                                 ← the sheet's one primary; h-12 on phones
THEN YOUR MENU SHOWS                                 ← eyebrow, fg-muted
↗ Goals                                              ← stageAdditions, icon aria-hidden
✦ The Coach
───────────────────────────────────────────
Show everything now                        [  ○]     ← Toggle (@rumtelo/ui)
Skip the step-by-step start. You can switch back any time.
───────────────────────────────────────────
Every page is already open: search for it in Quick add.
```

Trigger block by next visible stage:

| Next visible stage | `h3` | Action |
| --- | --- | --- |
| `ROUTINE` | `trigger.week_check` | Primary **Start week check** → `/product/money/week-check` (closes the sheet first) |
| `MONTH` | `trigger.month_close` | Under it, `fg-muted`: reuse `pages.dashboard.next_move.viewer.close_month` ("{month} closes in {n} days.") from the current month score. No button: the Home next-move card owns "Close month" when it is due, and two doors to a destructive action from a menu is too many. |
| `SORTING` (only if a surface is ever placed there) | `trigger.sorting` with `next.sortedRemaining` / `next.daysRemaining` | **Sort the Inbox** → `/product/money/transactions` |

"Then your menu shows" lists `StageItem`s with their nav labels (`course` → "Course", `goals` → "Goals", `coach` → "The Coach", …; `levels` → `adds.levels`). On Basic at ROUTINE the list is just "Your level on the month score" (story edge case).

**Toggle behaviour:** mutate-on-change (`api.account.updateSettings({ showAllSurfaces: true })`), optimistic. On success the sheet body swaps to one line `show_all.done` ("Everything is in your menu now. Switch back in Settings › Account.") and a **Close** button; the More row disappears behind it. No toast (the sheet already says it). On error: revert the toggle, inline `common.message.error.generic` + **Try again** under it, plus the shell error toast (Clarity 2 rule: a toast is never the only signal).

**States**

| State | Behaviour |
| --- | --- |
| Loading | The row only exists once the stage resolved; the sheet reads cached progress and account settings, no skeleton needed. If the month score for the `MONTH` line is still loading, omit that line. |
| Error (progress) | Stage = `MONTH` → no row. |
| VIEWER, Practice preview | No row (S-12.4 #3). |
| MEMBER | Same as OWNER: the triggers (week check, close) are theirs too. |
| Plan-locked | Never lists something the plan lacks; "More with Plus" never listed (§0.3). |
| Deferred portals | Energy/Soul never listed in production (`isProductEnabled`). |
| Show-all on | No row. |

**a11y:** `SheetTitle` visible; focus lands on the first focusable (the primary button); the toggle is the `Toggle` primitive (`role="switch"`, label + hint wired); the additions list is a real `<ul>`; icons `aria-hidden`. Escape and close return focus to the Coming up row (or the More tab if the row is gone after show-all).

### 1.5 The moment a stage unlocks: one quiet note (S-12.3 #8, Should)

**Decision:** a one-time inline note, not nothing and not a toast. A tab appearing in the bottom bar without a word looks like a glitch; a toast disappears before a person reads it and has no place on Done screens.

**Component:** new `apps/application/app/_components/layout/shell-nav/stage-note.tsx`, rendered by `household-shell.tsx` as the first child of `<main>` (above page content, under the header and Money sub-nav).

```
┌ bg-accent-soft, rounded-xl, px-4 py-3, border-line ───────────┐
│ New: Goals and The Coach are now in your menu.    [ Got it ]  │
└────────────────────────────────────────────────────────────────┘
```

- Text `text-sm text-fg`; "Got it" `Button variant="ghost" size="sm"` with `min-h-11`. On phones below 380 px the button wraps under the text (flex-wrap), never truncates (NL is longer).
- Items are `stageAdditions(ctx, seen, current)` labels joined with `Intl.ListFormat(locale, { type: 'conjunction' })`.
- **Seen-state:** `localStorage` key `storageKey('board-stage-seen', householdId)` = last stage seen. First visit on a device: write the current stage, **no note** (a member joining a mature board, a new device, or a backfilled household never sees "New:"). Stage rose and additions are non-empty: show the note; "Got it" or opening the More tab/menu writes the new stage. Stage fell (deleted lines before day 5, show-all switched off): write it silently.
- Never shown in Practice preview, never with show-all on, never for an addition that is only `levels` (the month score itself shows the level after the close; a note would repeat it).
- Shown to VIEWER too: it is information, not an action.
- `role="status"` (polite), rendered after mount so it is announced once. Not focus-stealing. No icon, no confetti, no score.

**Copy:** `pages.nav.stage_note.text` (ICU, `{count}` = number of items):
`{count, plural, one {New: {items} is now in your menu.} other {New: {items} are now in your menu.}}`

### 1.6 Settings › Account: "Show everything now" (S-12.5)

**Placement:** `/settings` (Account tab, `account-settings.tsx`), a new `SettingsInkCard` between the Profile card and `DangerZone`. Reachable by OWNER, MEMBER and VIEWER (§0.6). Hidden in Practice preview (Settings isn't in preview More).

```
YOUR START                                            ← eyebrow
New boards start with jars, the Inbox and the week check. The rest joins
your menu after your first week check and your first closed month.
[Toggle] Show everything now
         Skip the step-by-step start. You can switch back any time.
```

- `Toggle` from `@rumtelo/ui` (same as the Coach toggle in Preferences), mutate-on-change, no form (frontend rule: instant toggle = direct mutation). Invalidate `apiQuery.account.settings.key()`. Success toast reuses `pages.settings.saved`. Error: revert + toast + inline `common.message.error.generic`.
- Hint swaps with state: off → `hint_off`, on → `hint_on`.
- Loading: the toggle renders disabled in its saved-default position (off) until `account.settings` arrives; no skeleton.

### 1.7 Copy (EN) and keys

`pages.nav` (existing namespace):

| Key | EN |
| --- | --- |
| `coming_up.row` | Coming up |
| `coming_up.row_next.week_check` | After your first week check |
| `coming_up.row_next.month_close` | After you close your first month |
| `coming_up.row_next.sorting` | After you sort a few lines |
| `coming_up.row_aria` | Coming up: {next} |
| `coming_up.title` | Coming up |
| `coming_up.lead` | Rumtelo starts with your jars, Inbox and week check. More joins your menu as your board fills in. |
| `coming_up.next_eyebrow` | Next |
| `coming_up.trigger.week_check` | Do your first week check — ten minutes. |
| `coming_up.trigger.month_close` | Close your first month. |
| `coming_up.trigger.sorting` | `Sort {sorted, plural, one {# more line} other {# more lines}} or wait {days, plural, one {# day} other {# days}}.` |
| `coming_up.adds_eyebrow` | Then your menu shows |
| `coming_up.adds.levels` | Your level on the month score |
| `coming_up.search_hint` | Every page is already open: search for it in Quick add. |
| `coming_up.close` | Close |
| `show_all.label` | Show everything now |
| `show_all.hint_off` | Skip the step-by-step start. You can switch back any time. |
| `show_all.hint_on` | On — you see every page your plan and role include, in every household. |
| `show_all.done` | Everything is in your menu now. Switch back in Settings › Account. |
| `stage_items.course` | Course |
| `stage_items.goals` | Goals |
| `stage_note.text` | see §1.5 |
| `stage_note.dismiss` | Got it |
| `search.deferred.week_check` | Shows in your menu after your first week check. |
| `search.deferred.month_close` | Shows in your menu after you close your first month. |

Reused: `pages.dashboard.next_move.week_check.cta` (Start week check), `pages.dashboard.next_move.inbox.cta` (Sort the Inbox), `pages.dashboard.next_move.viewer.close_month`, `pages.nav.children.{coach,debt,net_worth,learn}`.

`pages.settings.panels.start` (new block, settings.ts):

| Key | EN |
| --- | --- |
| `eyebrow` | Your start |
| `blurb` | New boards start with jars, the Inbox and the week check. The rest joins your menu after your first week check and your first closed month. |
| toggle label / hints | reuse `pages.nav.show_all.*` (one wording in both places) |

### 1.8 a11y summary

- Stage changes never move focus. The note is a polite status, announced once.
- Coming up row: a button with a self-describing `aria-label`; 56 px tall in the sheet.
- The Growth placeholder cell is `aria-hidden` and not focusable, so the tab order never contains a dead stop.
- Deferred search hits carry their muted line as visible text inside the link (read as part of the link name), not as a tooltip.

---

## 2. CL-13 · Quick add by stage

### 2.1 Flow

1. FAB opens the palette. Mode rule unchanged: Ask when Coach steps are due, else Add (S-13.1 #6).
2. **Add, empty filter:** kinds for this stage, plan badge rules unchanged (§2.2).
3. **Add, typing:** filter over all kinds the plan and role allow and launch enables. A kind above the current stage shows with a muted second line and opens normally (hidden ≠ removed).
4. **Ask, typing:** `nav.searchable` now includes deferred pages with `deferredUntil`; a hit shows its muted line.
5. Pick → create route (`CREATE_HREF`), palette closes.

### 2.2 Kinds by stage

`QUICK_ITEMS` gets a `fromStage` and a new order (Income moves up to fourth):

| # | Kind | `fromStage` | Extra filter |
| --- | --- | --- | --- |
| 1 | Transaction `tx` | SPLIT | — |
| 2 | Bank statement `importStatement` | SPLIT | Basic: shown with the "Plus" badge (today) |
| 3 | Fixed cost `fixed` | SPLIT | — |
| 4 | Income `income` | SPLIT | role sees GROWTH section (writers do) |
| 5 | Goal `goal` | ROUTINE | — |
| 6 | Move money `move` | ROUTINE | — |
| 7 | Debt `debt` | MONTH | plan badge if locked (only reached on Basic at MONTH) |
| 8 | Asset `asset` | MONTH | plan badge if locked |
| 9 | Training `session` | MONTH | **`isProductEnabled('energy')`** — never in production, not even when typed |

**Training fix (S-13.1 #4) ships first and alone:** filter `QUICK_ITEMS` by a `product?: 'energy'` field and `isProductEnabled`. One-line rule, no stage dependency.

**Phone (375 px):** the four week-1 kinds are 4 × 44 px rows + mode switch + input + eyebrow ≈ 300 px; the panel sits above the tabs (`bottom-36`) and fits without scrolling on a 667 px-tall screen. At MONTH (8 rows) the list scrolls inside the panel: add `max-h-[min(60dvh,28rem)] overflow-y-auto` to the list, never the page.

**Deferred hit row (typed):**

```
[◫]  Debt                                     ← text-sm text-fg
     Shows here after you close your first month.   ← text-xs text-fg-muted
```

### 2.3 a11y fixes in the same file (Should, small)

The palette predates the 44 px rule. While the file is open:

- Add/Ask mode buttons: `min-h-11`, `aria-pressed` (real toggle buttons).
- Input: add `aria-label` (`pages.shell.quick_add.search_label_ask` / `search_label_add`); placeholders stay as instructions.
- Add rows: `min-h-11` (today `py-2` + 32 px icon ≈ 40 px).
- Ask hit rows already `py-2.5` (≈ 40 px): `min-h-11`.

### 2.4 Copy and keys

| Key | EN |
| --- | --- |
| `pages.shell.quick_add.deferred.week_check` | Shows here after your first week check. |
| `pages.shell.quick_add.deferred.month_close` | Shows here after you close your first month. |
| `pages.shell.quick_add.search_label_ask` | Search pages and The Coach |
| `pages.shell.quick_add.search_label_add` | Filter what to add |
| `pages.shell.quick_add.ask_placeholder` *(change)* | Search The Coach or a page… (was "Ask Coach or search…": the feature is "The Coach") |

### 2.5 States

| State | Behaviour |
| --- | --- |
| Stage loading | Show the SPLIT list (4 kinds). A kind appearing later is additive at the bottom, nothing jumps under the finger. (Different from the nav because Quick add is opened by a person, after load in practice.) |
| Stage error | `MONTH` list. |
| VIEWER, Practice preview | No FAB (unchanged). |
| Plan-locked | Statement · Plus badge in week 1 is the only upsell (story edge case). Goal cap: Goal still shows; the create page explains the limit. |
| Show-all | Full list. |
| Production | Never Training. |

---

## 3. G-1 · Close month from the Home next move

### 3.1 Flow

1. A writer presses **Close month** on the next-move card (`CLOSE_PRIOR` or `CLOSE_MONTH`), or **Close month** in `MonthScoreLog` (second door, same flow, S-G1 #8).
2. The **Close month sheet** opens for `target`; Home's selected period does **not** change. It loads `money.monthScore.current({ period: target })`.
3. The flow picks the first step that applies (pure resolver, §3.2):
   1. `isClosed` → **Already closed** ("{month} is already closed.") + Done. (A partner closed it.)
   2. `priorOpenPeriod` → **Earlier month first**: "Close {prior} first — months close in order." Primary **Close {prior}** re-targets the sheet to `prior` (back to 2).
   3. `closeBlockers.inboxCount > 0` → **Inbox first**: "{n} lines from {month} are still in your Inbox." Primary **Sort them**; the Close button is shown `aria-disabled` with the reason.
   4. `closeBlockers.dueBills.length > 0` → **Bills**: carry or skip each (today's `CloseMonthDialog` body), primary **Close {month}**.
   5. Otherwise → **Confirm**: "You'll see your score and carry what's left into next month. A closed month can't be changed." Primary **Close {month}**.
4. Close calls `monthScore.close({ period, billDispositions })`.
5. **Success:** invalidate `money.dashboard.get`, `money.progress.get`, `money.monthScore.current`, settlements, debts. The existing recap toast shows (`month_closed_toast`).
   - If the sheet was re-targeted (we closed `prior` on the way to `original`), the sheet stays open, refetches `original`, and shows a status line at the top: "{prior} closed." then continues at step 3.1 for `original`.
   - Otherwise the sheet closes. The next-move card moves on; if this was the first close, the stage rises to `MONTH` and the stage note may follow (§1.5).
6. **Error:** the sheet stays open on the same step with the API message inline and **Try again** (close is idempotent, so retry is safe).

**"Sort them"** closes the sheet, sets the shell period to `target` (`setPeriod(parsePeriodKey(target))`) and navigates to `/product/money/transactions` (opens on the INBOX tab for writers). This is the one place where the period changes, because the person is leaving Home to work on that month. No new query param is needed.

### 3.2 Pure step resolver

New **`apps/application/app/_lib/close-month-steps.ts`** with `close-month-steps.test.ts`:

```ts
export type CloseStep =
  | { kind: 'ALREADY_CLOSED' }
  | { kind: 'PRIOR_FIRST'; prior: PeriodKey }
  | { kind: 'INBOX_FIRST'; count: number }
  | { kind: 'BILLS'; bills: MonthCloseDueBill[] }
  | { kind: 'CONFIRM' };
export function resolveCloseStep(score: MonthScore): CloseStep;
```

### 3.3 Screen

Mockup: [`clarity-3/close-month.svg`](./clarity-3/close-month.svg).

**Component:** new `apps/application/app/_components/features/home/close-month-flow.tsx`:

```ts
type CloseMonthFlowProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Month the person asked to close (`YYYY-MM`). The flow may visit earlier months first. */
  target: string | null;
};
```

Owns its query, mutation and invalidations, so Home and `MonthScoreLog` just pass `target`. `home-dashboard.tsx` drops `goToMonthScore` and its own close mutation; `MonthScoreLog`'s `onCloseMonth` prop is replaced by `onStartClose(period)` that opens the same flow (its `ConfirmActionButton` "Are you sure?" two-step goes: the sheet is the confirmation).

- **Phone:** `Sheet side="bottom"`, `max-h-[85dvh] overflow-y-auto`, safe-area padding. Title `h2` "Close {month}" (month of the *current step*, so it reads "Close October" after re-targeting). Buttons full width, `h-12`, primary first; **Not now** is a ghost button under it.
- **Tablet/desktop:** same body as a right panel (`md:max-w-md`), PlanGainsSheet's class recipe. Buttons inline, `size="md"`.
- **Bills step:** extract today's list from `close-month-dialog.tsx` into `CloseMonthBills` (list only) and render it inside the sheet; delete the separate Dialog (no dialog on top of a sheet). The Carry forward / Skip chips grow from 10 px mono pills (~24 px) to `min-h-11` buttons with `text-sm`, still `aria-pressed` inside a `role="group"` labelled by the bill name. Default stays Carry forward. The list scrolls inside the sheet.
- No red: overdue months are not shown in `danger` here. The sheet is the move, not a warning (principle 4).

### 3.4 Copy (EN) and keys

`pages.dashboard.close_flow` (new):

| Key | EN |
| --- | --- |
| `title` | Close {month} |
| `prior_first` | Close {prior} first — months close in order. |
| `prior_first_cta` | Close {prior} |
| `prior_done` | {month} closed. |
| `inbox_first` | `{count, plural, one {# line from {month} is still in your Inbox.} other {# lines from {month} are still in your Inbox.}}` |
| `inbox_first_cta` | Sort them |
| `inbox_first_reason` | Sort the Inbox first, then close. |
| `confirm_body` | You'll see your score and carry what's left into next month. A closed month can't be changed. |
| `bills_tail` | A closed month can't be changed. |
| `close_cta` | Close {month} |
| `already_closed` | {month} is already closed. |
| `done` | Done |
| `not_now` | Not now |
| `load_error` | Couldn't load {month}. |
| `close_error_fallback` | Couldn't close {month}. Check your connection and try again. |

Reused: `pages.dashboard.close_bills_title`, `close_bills_body`, `close_bills_roll`, `close_bills_skip`, `close_bills_roll_hint`, `close_bills_roll_debt_hint`, `close_bills_skip_hint`, `month_closed_toast`, `ui.button.actions.try_again`. API errors (`month_close_*`, `period_closed`) go through `useApiError`; `close_error_fallback` only when there is no mapped message. Once nothing uses them, retire `close_month_confirm`, `close_month_review_bills`, `prior_open_cta`.

### 3.5 States

| State | Behaviour |
| --- | --- |
| Loading | Sheet opens at once with the title and a skeleton (one text bar, one `h-12` button bar). No layout jump when the step arrives. |
| Error (load) | `load_error` + secondary **Try again** (refetch). Not now stays. |
| Error (close) | Inline message above the primary, **Try again** = same call. Bill choices are kept. |
| Success | Toast + sheet closes, or re-targeted continue with `prior_done` status line. |
| Empty | n/a. A zero-income month closes normally; the recap toast shows €0 as a fact, no extra copy. |
| VIEWER, Practice preview | The card has no CTA and `MonthScoreLog` has no close button (unchanged), so the flow can't open. The component also returns `null` when `!canMutate`, as a guard. |
| MEMBER | Same as OWNER (S-5.2: a MEMBER may close). |
| Plan-locked | n/a, closing is on every plan. |
| Period travel | The card always targets now-based months; the flow never reads the selected period. |
| Two people at once | Second close returns the recap (idempotent); the flow treats it as success. |

### 3.6 a11y

- On open, focus goes to the sheet title (`tabIndex={-1}`), so a screen reader hears "Close October" before the step. On a step change (re-target, after a prior close), focus moves to the title again and `prior_done` sits in a `role="status"` line.
- `aria-disabled` Close button keeps focus and has `aria-describedby` → `inbox_first_reason`.
- Escape / Not now close the sheet; focus returns to the button that opened it (Radix default).
- Closing is irreversible: it is always two deliberate presses (card CTA, then the sheet's Close {month}), and the sheet names the consequence in plain words.

---

## 4. G-2 · Checklist invite from seat counts

### 4.1 Flow and rules

`Week1Checklist` replaces `members` + `usePlanCapacity('maxMembers', …)` with **`household.seats`** for the invite item (bank and dream are unchanged).

| Seats data | Invite item |
| --- | --- |
| `members > 1` | **Done** row: "Done" (today) |
| `members === 1 && pendingInvites > 0` | **Done** row, status "Invited — waiting for them" |
| `members === 1 && pendingInvites === 0` and a seat is left (`maxMembers === null \|\| members + pendingInvites < maxMembers`) | **Open** row → `/settings/general/household` (members section) |
| no seat left and nobody invited | **Hidden** (never shown as locked, S-6.5 #6) |

The "x of y done" count includes the invited row as done.

### 4.2 Screen change

Done rows today show the label plus "Done" on the right. The invited row puts the status **under** the label instead, because "Uitgenodigd — wacht op hen" doesn't fit on the right at 360 px:

```
●  Invite your partner
   Invited — waiting for them        ← text-xs text-fg-muted
```

Not a link (no resend/cancel UI in scope). Filled `accent` dot + text, so done isn't colour-only.

### 4.3 States

| State | Behaviour |
| --- | --- |
| Loading | Checklist renders nothing until all its reads arrive (unchanged). |
| `seats` error | Render the checklist **without** the invite item. Bank and dream still help; the checklist is optional either way. |
| MEMBER | Reads `seats`, sees the item (both roles may invite). |
| VIEWER, Practice preview | Never rendered (unchanged; `seats` is not called). |
| Basic, OWNER + pending VIEWER invite | Done ("Invited — waiting for them"). |

### 4.4 Invite dialog (Should, S-G2 #7)

`household-members-settings.tsx`: feed `SeatCapacitySummary` / `useSeatCapacity` from `seats` (writable/viewer used and caps) so "1 seat left" counts pending invites like the server. No new copy; existing seat-limit strings.

### 4.5 Copy

| Key | EN |
| --- | --- |
| `pages.dashboard.checklist.invited` | Invited — waiting for them |

---

## 5. D4 · Levels without fake unlocks

**What renders today:** only the level name next to the score in `MonthScoreLog` (when `hasClosedMonth`). Nothing in the app renders `unlocks` (`monthScoreUnlockLabel` has no callers). So "what replaces the unlock lines" is: **nothing on the card**, plus one honest sentence where a curious person looks.

1. Card: level name stays, now with an `sr-only` prefix so it isn't a bare word to a screen reader: `pages.dashboard.month_score.level_sr` = "Level: {level}" (visible text unchanged).
2. Home Help sheet: a new section in `features.tour.pages.home.sections.score` explains levels: they grow with closed months; they open nothing. One place, not on every card.
3. Delete `monthScoreUnlockLabel`, `MonthScoreUnlockKey` usage and `pages.dashboard.levels.unlocks.*` (S-12.6).
4. Stale Growth help (`features.tour.pages.growth.sections.what_for.body`, says "Overview → Income → Goals" and "Learn unlocks on Plus"): rewrite (Could, same pass).
5. No "points to next level" line: it needs a cumulative score the contract doesn't expose, and a progress bar toward a level is the gamification S-12.4 rules out.

| Key | EN |
| --- | --- |
| `pages.dashboard.month_score.level_sr` | Level: {level} |
| `features.tour.pages.home.sections.score.heading` | Your month score and level |
| `features.tour.pages.home.sections.score.body` | Each month you close adds to your score. Your level grows with it: a record of your routine, not a key. Nothing opens or closes with a level. |
| `features.tour.pages.growth.sections.what_for.body` *(rewrite)* | Course is your week: the three things that move your goals, set in your week check. On Basic you keep one goal; Course and Learn are in Plus. |

The Help sheet sections come from `_components/features/tour/content/i18n-builders.ts`; add `score` to the Home builder. Help is static and always shows the section: it explains what will appear.

---

## 6. Dutch strings to pin

For `translations/overrides.ts` (NL agent). *Je*-form, *Koers*, *weekcheck*, *potjes*, *De Coach*.

| Key | NL (proposed) | Why pin |
| --- | --- | --- |
| `pages.nav.coming_up.row` / `title` | Binnenkort | story text |
| `pages.nav.coming_up.row_next.week_check` | Na je eerste weekcheck | product noun |
| `pages.nav.coming_up.row_next.month_close` | Nadat je je eerste maand afsluit | word order |
| `pages.nav.coming_up.lead` | Rumtelo begint met je potjes, Inbox en weekcheck. De rest komt in je menu naarmate je overzicht zich vult. | *potjes* |
| `pages.nav.coming_up.trigger.week_check` | Doe je eerste weekcheck — tien minuten. | — |
| `pages.nav.coming_up.trigger.month_close` | Sluit je eerste maand af. | — |
| `pages.nav.coming_up.adds_eyebrow` | Daarna staat in je menu | — |
| `pages.nav.coming_up.adds.levels` | Je niveau bij de maandscore | — |
| `pages.nav.coming_up.search_hint` | Elke pagina is al open: zoek hem op via Snel toevoegen. | match the NL FAB label in use |
| `pages.nav.show_all.label` | Laat alles meteen zien | story text |
| `pages.nav.show_all.hint_off` | Sla de stap-voor-stap-start over. Je kunt altijd terug. | story tone |
| `pages.nav.show_all.hint_on` | Aan — je ziet elke pagina die je abonnement en rol bevatten, in elk huishouden. | — |
| `pages.nav.stage_note.text` | `{count, plural, one {Nieuw: {items} staat nu in je menu.} other {Nieuw: {items} staan nu in je menu.}}` | story text, verb agreement |
| `pages.nav.stage_note.dismiss` | Begrepen | — |
| `pages.nav.stage_items.course` | Koers | never *cursus* |
| `pages.nav.stage_items.goals` | Doelen | — |
| `pages.nav.search.deferred.*` / `pages.shell.quick_add.deferred.*` | Komt in je menu na je eerste weekcheck. · …nadat je je eerste maand afsluit. / Komt hier na je eerste weekcheck. · Komt hier nadat je je eerste maand afsluit. | length |
| `pages.settings.panels.start.eyebrow` | Je start | — |
| `pages.dashboard.close_flow.title` / `close_cta` | {month} afsluiten | word order |
| `pages.dashboard.close_flow.prior_first` | Sluit eerst {prior} af — maanden sluiten op volgorde. | — |
| `pages.dashboard.close_flow.prior_first_cta` | {prior} afsluiten | — |
| `pages.dashboard.close_flow.inbox_first` | `{count, plural, one {# regel uit {month} staat nog in je Inbox.} other {# regels uit {month} staan nog in je Inbox.}}` | *Inbox* stays English |
| `pages.dashboard.close_flow.inbox_first_cta` | Sorteer ze | — |
| `pages.dashboard.close_flow.confirm_body` | Je ziet je score en neemt wat over is mee naar volgende maand. Een afgesloten maand kun je niet meer wijzigen. | — |
| `pages.dashboard.close_flow.not_now` | Nu niet | match lock card |
| `pages.dashboard.checklist.invited` | Uitgenodigd — wacht op hen | story text |
| `features.tour.pages.home.sections.score.body` | Elke maand die je afsluit telt mee in je score. Je niveau groeit mee: een verslag van je routine, geen sleutel. Er gaat niets open of dicht met een niveau. | *routine* |

**Long-string watch (360 px):** the Coming up second line "Nadat je je eerste maand afsluit" wraps inside the 56 px row (allowed, `text-pretty`, no truncate; drop `truncate` on that row). The stage note wraps its button under the text. "{month} afsluiten" titles fit. Bill chip "Doorschuiven"/"Overslaan" fit at `min-h-11` side by side.

---

## 7. Open questions

| # | Question | Design default until answered |
| --- | --- | --- |
| Q1 | Decision 2: does a paid board sit at `MONTH` (all its plan) or "at least `ROUTINE`"? And is it **computed on read** or a **floor written** at paid start/checkout? Computed-on-read drops a downgraded Plus→Basic board back to its data stage (it could lose The Coach row it used). | `MONTH`, written as `boardStageFloor = MONTH` on paid start and successful upgrade (never lowered), so a downgrade keeps the menu. The UI is diff-based and works either way. |
| Q2 | SORTING has no visible surface. Keep it? | Keep in the contract; the UI skips it (§0.2). PM may later place something there (for example the Move money kind). |
| Q3 | Levels: stage table says `MONTH`, design says `hasClosedMonth` (§0.4). | `hasClosedMonth`. |
| Q4 | Fail-open wording: loading = reserved space, error = `MONTH` (§0.5). | As designed. Security/perf agree nothing paid is hidden by a failure. |
| Q5 | Show-all on the Account tab instead of Preferences (§0.6). | Account tab + Coming up sheet. |
| Q6 | "Sort them" changes the shell period to the month being closed. OK? | Yes: the person leaves Home to work on that month; the Inbox must show it. |

---

## 8. Build plan (one frontend engineer)

**Order** (each step mergeable alone): 1 → 2 → 3 → 4 → 5 → 6 → 7. Steps 1–4 have no dependency on the new progress contract.

| # | Step | Files (C create · E edit · D delete), all under `apps/application/app/` unless noted |
| --- | --- | --- |
| 1 | **Training launch filter** (S-13.1 #4, ship first) | E `_components/layout/quick-add.tsx` |
| 2 | **D4 levels** | E `_lib/month-score-copy.ts` (delete `monthScoreUnlockLabel`) · E `_components/features/home/month-score-log.tsx` (`level_sr`) · E `_components/features/tour/content/i18n-builders.ts` (Home `score` section) · E `packages/i18n/translations/pages/dashboard.ts` (remove `levels.unlocks`, add `month_score.level_sr`) · E `packages/i18n/translations/features/tour.ts` |
| 3 | **G-2 checklist** (needs `household.seats`) | E `_components/features/home/week1-checklist.tsx` · E `(routes)/[locale]/(app)/(household)/settings/_components/household-members-settings.tsx` (Should) · E `pages/dashboard.ts` (`checklist.invited`) |
| 4 | **G-1 close flow** | C `_lib/close-month-steps.ts` (+ `.test.ts`) · C `_components/features/home/close-month-flow.tsx` · E `_components/features/home/close-month-dialog.tsx` → rename/reduce to `close-month-bills.tsx` (list only; **D** the Dialog) · E `_components/features/home/month-score-log.tsx` (`onStartClose`, drop `ConfirmActionButton` close + inline prior/blocker CTAs that the flow now owns; keep the read-only blocker text) · E `(routes)/[locale]/(app)/(household)/_components/home-dashboard.tsx` (drop `goToMonthScore` + close mutation, host `CloseMonthFlow`) · E `pages/dashboard.ts` (`close_flow.*`) |
| 5 | **Stage model** (needs `money.progress.get`) | C `_lib/board-stage.ts` (+ `.test.ts`) · E `_lib/nav.ts` (`NavContext.stage`, stage predicates, `coming_up` row, `SearchableNavItem.deferredUntil`) · E `_lib/nav.test.ts` (stage × Basic/Plus/Max × OWNER/MEMBER/VIEWER × preview) · E `_lib/use-shell-nav.ts` (progress query, `showAllSurfaces`, preview → MONTH; return `stage`, `stageReady`, `progress`) · E `_components/layout/shell-nav/bottom-tabs.tsx` (placeholder cell) · E `home-dashboard.tsx` (Growth widget, Today card, All tips → `stageAtLeast(stage, ROUTINE)`) · E every mutation that invalidates `apiQuery.money.dashboard.get.key()` after a sort / week check DONE / close: also invalidate `apiQuery.money.progress.get.key()` (grep the dashboard key) |
| 6 | **Coming up, note, show-all** | E `_components/layout/shell-nav/more-rows.tsx` (`coming_up` case) · C `_components/layout/shell-nav/coming-up-sheet.tsx` · C `_components/layout/shell-nav/stage-note.tsx` · E `_components/layout/household-shell.tsx` (host sheet + note; mark seen on More open) · E `(routes)/[locale]/(app)/(household)/settings/_components/account-settings.tsx` ("Your start" card) · E `packages/i18n/translations/pages/nav.ts`, `pages/settings.ts` |
| 7 | **Quick add by stage + search** | E `_components/layout/quick-add.tsx` (`fromStage`, order, deferred lines, a11y fixes §2.3) · E `packages/i18n/translations/pages/shell.ts` |

**Tests:** `board-stage.test.ts`, `close-month-steps.test.ts`, `nav.test.ts` additions, and a `route-capabilities.test.ts` assertion that `routeAccessForPath` takes no stage (S-12.4 #1). Manual at 375 px and 1280 px: Basic new board SPLIT → week check → ROUTINE (note shows once) → close → MONTH; Plus new board (full menu day 1); VIEWER; Practice preview; show-all on/off.

**Pending for Given:** `pnpm i18n:gen` after the keys land; NL pins in §6 go into `overrides.ts` first.

---

## 9. What the app needs from the backend

| Procedure / field | Needed by | Must hold |
| --- | --- | --- |
| `money.progress.get` → `MoneyProgress` (story S-12.1 shape) | Steps 5–7 | `stage` already includes the floor **and** decision 2 (paid plan → `MONTH`, Q1), so the client only adds show-all and preview. `next` null at `MONTH`. VIEWER and ACTIVE Practice links may read. Cheap (`EXISTS`/`LIMIT`): it runs on every shell mount. |
| `money.dashboard.get.progress` = `MoneyProgress` | Step 5 (optional seed) | Same values as `progress.get`, so the shell may seed from a cached dashboard. |
| `AccountSettings.showAllSurfaces` in `account.settings` and accepted by `account.updateSettings` | Step 6 | Default `false`; VIEWER may write their own. (Schema field already present on this branch.) |
| `household.seats` → `HouseholdSeatUsage` | Step 3 | OWNER and MEMBER; ignores expired invites; counts only, no e-mails. |
| `money.monthScore.current({ period })` | Step 4 | Existing. `closeBlockers` must use the household's real period window (`periodStartDay ≠ 1`, story G-1 edge case). |
| `money.monthScore.close` | Step 4 | Idempotent (existing). Errors mapped in `ApiErrorMessageKey` (`month_close_*`, `period_closed`). |
| `Level` without `unlocks`, `MonthScoreUnlockKey` deleted | Step 2 | `monthScore.levels` still returns `{ index, threshold }[]`. |

---

## Orchestrator answers to §7 (17 Nov 2026)

1. **Paid plans → MONTH.** Given's answer was that whoever pays sees everything their plan includes at once, so Plus and Max sit at MONTH. The server writes `boardStageFloor = MONTH` when a household starts on a paid plan or upgrades. A later downgrade keeps the floor, so the menu never shrinks. This replaces "at least ROUTINE" in the stories.
2–7. Accepted as proposed: SORTING is skipped in the UI; levels show only after the first closed month; while the stage loads, Growth keeps its slot and an error falls back to MONTH; the toggle sits on the Account tab; "More with Plus" never appears in "Coming up" or the "New" note; "Sort them" switches to the month being closed and opens the Inbox.
