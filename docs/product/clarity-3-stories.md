# Clarity 3: stories for the practice door, the unlock ladder and Quick add (CL-11, CL-12, CL-13 + Clarity 2 gaps)

**Date:** 2026-11-17 · **Owner:** product-manager · **Status:** ready for design and build, nothing built yet.
**Source:** [`clarity-audit.md`](./clarity-audit.md) §4, §5, §8, §9 (Given accepted **D1–D11** as recommended), [`clarity-2-stories.md`](./clarity-2-stories.md) and the code on `claude/clarity-3` (Clarity 1 + 2 merged).

**In this release:** CL-11 (Practice door), CL-12 (progressive unlock ladder), CL-13 (Quick add by stage), and two Clarity 2 gaps: G-1 (Close month opens the close flow) and G-2 (the checklist counts pending invites).

**Next release, not in scope here:** D7 Course-lite for Basic (1 goal, no lanes) and D11 a read-only debt list on Basic. Where this release touches the same surfaces (the Basic Growth tab, Debt in More), it keeps today's plan rules and leaves room for them.

**Size scale (D9, `CLAUDE.md`):** S < 1 h · M 1–4 h · L 4 h–1 day of agent effort.

**Rules that apply to every story** (same as Clarity 2, not repeated per story):

- **Plan decides WHETHER, the ladder decides WHEN, role decides WHO.** `CAPABILITIES.*` + `PLAN_LIMITS` decide what exists; `HouseholdRole` decides what this person may do (server-enforced by `RequireCapability` and `RolePermissionInterceptor`); the ladder (CL-12) only decides whether a surface is *shown up front*. The ladder **never** blocks a route, a procedure or a deep link, and never shows a surface the plan or role does not allow. `HouseholdRelation` changes nothing.
- **VIEWER** reads Home and Money only; no Growth, no Coach, no Quick add, no upgrade rows.
- **Practice preview** (`ACTIVE` `PracticeClientLink`, VIEW or MANAGE) is read-only for both; `INVITED` and `REVOKED` links give no board.
- **Launch:** Energy and Soul are deferred when `NODE_ENV=production` (`launch-products.ts`); nothing in this release links to them in production, on the website or in the app. Coach rows marked `preview` stay hidden in production.
- **Money:** integer minor units; prices only from `PLAN_RETAIL_CENTS` / `PRACTICE_*` constants, never in copy.
- **Copy:** EN first, NL second. *Course/Koers*, *week check/weekcheck*, *jars/potjes*, *Inbox*, *The Coach/De Coach*, *routine*; a human coach is "a coach"/"advisor". Never "plan" for Course.
- **Done means:** contracts first, a spec per business rule with a cross-household sad path, EN + NL keys, tested at 375 px and 1280 px.

---

## CL-11 · Practice door: its own page

**Why:** Practice sits on the household path today: the landing header links to `#practices`, and the household pricing section has an audience toggle (`landing-pricing.tsx`, `SIGN_UP_AUDIENCES`) that swaps the household plans for `PracticePricing`. A household visitor meets a B2B price table; a coach has to find a tab. D8: own page, Practice pricing off the household toggle, MANAGE described only as **sponsoring Plus, read-only today** (MANAGE writes are not built: backlog #1).

**Principles:** 4 (information, never shame: the client's yes comes first and the page says so). 1 and 2 are what the coach sees ("jars and week check"). 3 is not touched and Energy is not mentioned.

### S-11.1 · The `/practices` page — *website*

**Story:** As a **practice coach or practice admin** (budget coach, debt-help worker, advisor), I want one page that tells me what Rumtelo does for my clients, what my clients must agree to and what it costs, so that I can decide without reading the household pricing.

**Acceptance criteria**

1. **Given** a visitor opens `/{locale}/practices` (EN and NL; `es`/`fr` generated), **then** the page renders, in this order:
   1. **Hero:** "Stop wondering where your clients stand." / "Niet meer gissen waar je cliënten staan." + lead (audit §5): *One desk for every client's jars and week check — only after they say yes. Rumtelo never moves money.* Primary CTA "Start a practice" → `webSignUpPath(signUpAudienceQuery('practice'))`.
   2. **How it works** (existing `practice_plan.step_1..3`): create your practice → invite a client by email → they accept, then you see their board.
   3. **What you see** (`practice_plan.f1..f4`, production-safe as fixed in Clarity 1: income, jars, spending, week check).
   4. **Consent and data** block: every link starts *invited*, nothing is shared until the household owner accepts; either side can end it any time; the client keeps their own board and data; Rumtelo never moves money and is not *bewindvoering*; EU-resident data.
   5. **Pricing** (moved from `PracticePricing`): base price, staff seat, "Client who looks along — Free", "Client you sponsor — {price} / month each" (see criterion 3), example total, footnote.
   6. **FAQ:** the existing practice FAQ entries (`landing-faq.tsx` `practice`), moved or duplicated here.
   7. **Closing CTA**, same as the hero.
2. **Given** every price on the page, **then** it is computed from `PRACTICE_BASE_UNIT_CENTS`, `PRACTICE_STAFF_SEAT_UNIT_CENTS`, `PRACTICE_CLIENT_SEAT_UNIT_CENTS`, `PRACTICE_CLIENT_DISCOUNT_PCT` and `PLAN_RETAIL_CENTS[PLUS]`; a test asserts no hard-coded euro amount in the page or its copy.
3. **Given** the MANAGE line (D8), **then** it sells sponsorship, not editing: *"You pay for their Plus — {discount}% less than the {retail} a month they'd pay themselves. You see their full board, read-only."* No line promises "manage", "edit", "change their plan", "coming next" or anything a coach could do *to* a board. The **example total uses look-along clients** ("You + 1 staff seat + 10 clients who look along = {total} / month"); a second line shows the sponsor case ("Sponsor 3 of them on Plus: + {amount}").
4. **Given** a **signed-in visitor who is practice staff** (`useMarketingSession`), **then** the CTAs read "Open the practice desk" → `appPracticeUrl()` (existing `cta_open`). **Given** a signed-in household-only user, **then** the CTA stays "Start a practice" (they create one from the app, Settings › General › Practice, after sign-in redirect).
5. **Given** `NODE_ENV=production` (or the staging website build that mirrors it), **then** the page mentions no Energy, Soul, sleep, stillness or "168 hours" (CL-1 filter applies).
6. **Given** search engines and sharing, **then** the page has its own `generateMetadata` (title "Rumtelo for practices", description = lead), canonical URL per locale and `hreflang` alternates, like `support/page.tsx`.
7. **Given** a screen reader, **then** headings are one `h1` and ordered `h2`s; the price table is a real list/table with text labels, not icons only. Works at 375 px with no horizontal scroll.

**Edge cases:** `isRegistrationOpen() === false` (maintenance): CTAs show the same closed state as the landing sign-up. A practice invite link (`practice-invite-provider.tsx`) arriving on `/practices` keeps its query and still prefills sign-up. Locale missing in URL: locale middleware first.

**Out of scope:** a practice self-serve demo board, case studies, a separate practice checkout, any change to practice prices or to what MANAGE bills (backlog #1 stays Critical and is Given's call).

**MoSCoW:** Must · **Size:** M · **Layer:** website (+ i18n keys under `pages.practices.*`; reuse `pages.landing.practice_plan.*` where the text is identical).

### S-11.2 · Household pricing without the audience toggle; band + header link on the landing — *website*

**Story:** As a **household visitor**, I want the pricing section to show only household plans, so that I compare Basic, Plus and Max without a B2B table in the way. As a **coach**, I want one clear door from the landing page.

**Acceptance criteria**

1. **Given** the landing pricing section, **then** the audience switch (`SIGN_UP_AUDIENCES` toggle) and `PracticePricing` are removed; it always shows Basic · Plus · Max. Below the cards, one text link: "Coach or advisor? See Practice pricing →" / "Coach of adviseur? Bekijk de prijzen voor praktijken →" → `/practices`.
2. **Given** the landing page, **then** a short **For practices** band sits after the Growth teaser/Pricing and before the FAQ (audit §5 order), with `id="practices"`: the practice headline, one line of the lead, and "See how it works for practices" → `/practices`. No prices in the band.
3. **Given** the landing header (`NAV_LINK_KEYS`), **then** "For practices" links to `/{locale}/practices` (a page, not `#practices`) on desktop and in the mobile menu.
4. **Given** an old link to `/#practices` (sales mails, the app), **then** it scrolls to the band (the anchor survives), which links on. `landing-pricing.tsx`'s hash-to-tab logic is deleted.
5. **Given** the sign-up page with `?audience=practice`, **then** it still works exactly as today; only the pricing toggle goes.
6. **Given** the landing FAQ, **then** the practice price entry moves to `/practices`; the landing keeps at most one practice question that links there.

**Edge cases:** a signed-in user on a plan (`lead_on_plan`): the pricing section copy is unchanged apart from the toggle. Footer: add "For practices" to the footer links.

**Out of scope:** the in-app "Start a practice" entry (already moved to Settings in S-8.4), the app's practice desk.

**MoSCoW:** Must · **Size:** S · **Layer:** website.

---

## CL-12 · Progressive unlock ladder

**Why:** Clarity 2 cut the first week down with plain data checks on Home only (S-5.3). The nav, More and Quick add still show the full board on day 1 (about 12 destinations, 9 Quick add kinds). D3: event triggers decide *when* surfaces appear, on every plan, with a "Show everything now" escape (default off). D4: keep level names, drop the fake level "unlocks" (`month-score.service.ts` `LEVELS[].unlocks`: Coach, Goals, Debts, Energy layer, Export — none of which gate anything).

**Principles:** 2 is the reason (the routine first, everything else after the first week check). 1 (Jars, Inbox, Income and Fixed costs are there from day 1 — the split comes first). 4 (a score and levels only once there is a month; no faded rows; a deferred item says what opens it, never "locked"). 3 is not touched.

### Decision: per-household stage, per-person "Show everything now" (recommendation)

- **The stage is per household, derived from board data.** Every trigger is a household event (the split, sorted Inbox lines, the week check, the month close: all one-per-household rows). Two partners on one board see the same tabs, so "it's under More › Debt" means the same thing to both. A member who joins a board that is already in month 3 sees the full board on day 1 — the ladder is about how mature the board is, not how new the person is. Per-person state would need a new per-member table and would split one board into two layouts.
- **"Show everything now" is per person** (`AccountSettings`). It is a preference about guidance, like theme or helpers. A MEMBER or VIEWER can't write household settings, so a household-level switch would trap them; and one person's choice doesn't change their partner's board.
- **Derived, not event-written.** The stage is computed on read from existence checks, so there is nothing to keep in sync and no write-on-read. The only stored value is a **floor** for backfill (S-12.2). Every trigger is monotonic except "5 sorted", which can drop if lines are deleted, but only before day 5 (after that, household age holds the stage). Accepted.
- **Practice preview ignores the ladder**: staff see everything the client's plan and the link allow. Staff need the same desk on every client, and hidden is not removed for the client either.

### The stages

`BoardStage` (ordered; a higher stage includes everything below):

| Stage | Reached when (first true, top down) | Audit §4 row |
| --- | --- | --- |
| `MONTH` | any month score closed (`hasClosedMonth`) | Month 1 |
| `ROUTINE` | any money week check `DONE` (`hasCompletedWeekCheck`) | Weeks 2–4 |
| `SORTING` | ≥ 5 transactions with status `SORTED` (by hand or by rule), **or** household age ≥ 5 days | Week 1 |
| `SPLIT` | onboarded (every household that exists has its split) | Day 1 |

`stage = max(derived, floor)`; when the person has `showAllSurfaces = true`, the client treats the stage as `MONTH`.

### What each stage shows (production; plan and role filters still apply on top)

| Surface | SPLIT | SORTING | ROUTINE | MONTH | Note |
| --- | --- | --- | --- | --- | --- |
| Home: next move, jars, dream line, week-1 checklist | ✓ | ✓ | ✓ | ✓ | As Clarity 2 |
| Home: month score block | data rule of S-5.3 #1 | | | | Unchanged (not ladder) |
| Home: levels in the score block | | | | ✓ | Same as `hasClosedMonth` today |
| Home: Growth widget, Today card (Course), "All tips ({n})" link | | | ✓ | ✓ | Replaces `progress.hasCompletedWeekCheck` checks, so floor/showAll apply |
| Money sub-nav: Jars, Inbox, Fixed costs, Income | ✓ | ✓ | ✓ | ✓ | See Q1 |
| Money header **Week check** button | ✓ | ✓ | ✓ | ✓ | The routine is never deferred |
| **Growth** tab (Plus/Max: Course; Basic: Goals + Course preview card) | | | ✓ | ✓ | See Q2 for upgrades |
| More: The Coach | | | ✓ | ✓ | |
| More: "More with Plus" / "More with Max" | | | ✓ | ✓ | See Q3 |
| More: Debt, Net worth, Learn | | | | ✓ | Plan still decides |
| More: Why Rumtelo, Settings, Help, Go to practice, Back to practice | ✓ | ✓ | ✓ | ✓ | |
| More: Energy, Soul "Preview" (staging only) | | | | ✓ | Never in production |
| More: **Coming up** row (S-12.4) | ✓ | ✓ | ✓ | — | Gone at `MONTH` or with show-all |
| Quick add kinds | CL-13 | | | | |

### S-12.1 · Server: the board stage (contract) — *backend + contracts*

**Story:** As a household **member**, I want the app to know how far our board has come, so that it shows us what fits now, the same on every page and for everyone on the board.

**Contract** (new leaf `packages/contracts/src/public/product/money/progress/`, mounted at `contract.money.progress`):

```ts
// public/platform/enums.ts — ordered; compare with BOARD_STAGE_ORDER
export enum BoardStage {
    SPLIT = 'SPLIT',
    SORTING = 'SORTING',
    ROUTINE = 'ROUTINE',
    MONTH = 'MONTH',
}

// money/progress/progress.schema.ts
/** As-of-now board facts and the stage they reach. Never depends on period travel. */
export const MoneyProgress = z.object({
    hasTransactions: z.boolean(),
    hasCompletedWeekCheck: z.boolean(),
    weekCheckDoneThisWeek: z.boolean(),
    hasClosedMonth: z.boolean(),
    /** SORTED transactions, all time, capped at 5 (`LIMIT 5`, not a full count). */
    sortedCount: z.int().min(0).max(5),
    /** Whole days since `Household.createdAt` (UTC). */
    householdAgeDays: z.int().min(0),
    /** max(derived stage, settings floor). The client applies the person's showAllSurfaces. */
    stage: z.enum(BoardStage),
    /** The next stage and what reaches it, for "Coming up" copy. Null at MONTH. */
    next: z
        .object({
            stage: z.enum(BoardStage),
            trigger: z.enum(['SORT_FIVE_OR_DAY_FIVE', 'FIRST_WEEK_CHECK', 'FIRST_MONTH_CLOSE']),
            /** Only for SORT_FIVE_OR_DAY_FIVE: lines still to sort (0–5) and days to wait (0–5). */
            sortedRemaining: z.int().min(0).max(5).nullable(),
            daysRemaining: z.int().min(0).max(5).nullable(),
        })
        .nullable(),
});

// money/progress/progress.contract.ts (READ)
/** Board stage for the shell (nav, More, Quick add) and Home. Read-only, nothing is written. */
export const moneyProgressGet = oc.input(HouseholdScoped).output(MoneyProgress);
```

- `money.dashboard.get` `progress` becomes `MoneyProgress` (a superset of today's `DashboardProgress`, so Home needs no second request). `DashboardProgress` stays as a type alias for one release, then goes.
- New `ProgressService` in `money/progress` builds it from the transaction, week-check and month-score **services** (`hasAny`, a new `sortedCount(limit 5)`, `completionFacts`, `hasClosedMonth`) and `HouseholdSettingsService` (floor) + household `createdAt`. `DashboardService.progress()` delegates to it. All queries are `EXISTS`/`LIMIT`, never full counts.

**Acceptance criteria**

1. **Given** a new household with 0 sorted lines on day 0, **then** `stage = SPLIT`, `next = { stage: SORTING, trigger: SORT_FIVE_OR_DAY_FIVE, sortedRemaining: 5, daysRemaining: 5 }`.
2. **Given** 5 lines `SORTED` (by hand or by a rule, any direction) on day 1, **then** `stage = SORTING`. `IGNORED` and `INBOX` lines don't count; deleted lines don't count.
3. **Given** household age ≥ 5 days and 0 transactions, **then** `stage = SORTING`.
4. **Given** a completed money week check (any week), **then** `stage ≥ ROUTINE`, even with fewer than 5 sorted lines. **Given** a closed month without any week check (S-5.3 edge case), **then** `stage = MONTH`.
5. **Given** `floor = MONTH` (backfill) and no data, **then** `stage = MONTH`, `next = null`.
6. **Given** household A at `MONTH` and household B at `SPLIT`, **when** a member of both switches the active household, **then** each response is scoped through `HouseholdScopedRepository`; a spec asserts B never reads A's facts. Passing another household's id without membership → 403.
7. **Given** a **VIEWER** or a **Practice preview** on an `ACTIVE` link, **then** the read is allowed (MONEY section, read). `INVITED`/`REVOKED` → no board, as today.
8. **Given** period travel, **then** the facts are "as of now".
9. **Given** any plan, **then** the stage is computed identically (D3: every plan walks the ladder). The plan is not an input.

**Edge cases:** Household `createdAt` in the future (clock skew) → age 0. A household whose transactions were all deleted on day 2 drops back to `SPLIT` until day 5 (accepted; the stage is "what to show first", not a reward). A rule that auto-sorts 5 imported lines on day 1 reaches `SORTING` at once: correct, the Inbox is working.

**Out of scope:** storing per-milestone timestamps, analytics events (Could: `board_stage_reached` without amounts), per-member stages.

**MoSCoW:** Must · **Size:** M · **Layer:** contracts + backend (`money/progress` leaf, README lists `contract.money.progress.get`).

### S-12.2 · Existing households land unlocked (floor + backfill) — *backend + DB*

**Story:** As a **household that has used Rumtelo before this release**, I want my board to look the way I left it, so that an update never hides Debt, Course or Learn that I already use.

**Why derived data is not enough:** a Plus household that has used Course and Debt for two months but never finished a money week check would derive `SORTING` and lose its Growth tab and Debt row overnight.

**Contract + DB**

```ts
// household.schema.ts — HouseholdSettings (read-only; NOT in HouseholdSettingsPatch)
/** Lowest stage this board shows, whatever the data says. Server-written only. Null = derived only. */
boardStageFloor: z.enum(BoardStage).nullable(),
```

- Column `household_settings.board_stage_floor` (nullable text/enum), MikroORM migration.
- **Backfill in the same migration:** every household settings row that exists when the migration runs gets `board_stage_floor = 'MONTH'`. New households are created with `null`.
- `HouseholdSettingsPatch` does **not** accept it; `updateSettings` with that key is rejected by Zod (`strict`) or ignored, with a spec.

**Acceptance criteria**

1. **Given** a household created before the release, **when** any member opens the app after deploy, **then** the nav, More, Home and Quick add look as in Clarity 2 (everything the plan and role allow); no "Coming up" row.
2. **Given** a household created after the release, **then** `boardStageFloor = null` and it walks the ladder.
3. **Given** a Clarity 3 rollback, **then** the column is unused and harmless (no code before this release reads it).
4. **Given** the migration runs twice (re-deploy), **then** it is idempotent (`WHERE board_stage_floor IS NULL AND created_at < migration time`).

**Edge cases:** a household created minutes before deploy also lands at `MONTH`. Accepted: the cost is one household skipping the ladder, never one losing a surface. See Q2 for whether a paid upgrade should raise the floor.

**Out of scope:** an admin tool to reset the floor (backoffice later), lowering a floor.

**MoSCoW:** Must (ships with S-12.3, never after it) · **Size:** S · **Layer:** backend + DB migration + contracts.

### S-12.3 · The shell and Home follow the stage — *frontend*

**Story:** As a **new household owner or member**, I want the app to show me my jars, Inbox and week check first and the rest when I've done my first week check or closed my first month, so that I learn one routine before I meet twenty pages.

**Acceptance criteria**

1. **Given** `buildNav` (`nav.ts`), **then** `NavContext` gains `stage: BoardStage` (already resolved for show-all and preview) and every tab, Money sub-item, More row and searchable item follows the stage table above. `buildNav` stays pure; `nav.test.ts` covers each stage × Basic/Plus/Max × OWNER/MEMBER/VIEWER × preview.
2. **Given** `useShellNav`, **then** it reads `apiQuery.money.progress.get` once per household (shared cache key with Home; invalidated after a transaction sort, `weekCheck.advance(DONE)` and `monthScore.close`). **While loading or on error, the stage is treated as `MONTH`** (fail open to the full board): the ladder is guidance, not a gate, and a failed read must never hide something the household pays for.
3. **Given** an OWNER or MEMBER on **Plus** at `SPLIT`, **then** tabs are Home · Money · More; More shows Why, Settings, Help and Coming up. **At `ROUTINE`**, Growth (opening on Course Today), The Coach and "More with Max" appear. **At `MONTH`**, Debt and Learn appear.
4. **Given** a **Basic** OWNER at `MONTH`, **then** More shows The Coach, More with Plus, Why, Settings, Help; Debt, Net worth and Learn stay absent (plan), and they never appear under Coming up.
5. **Given** a **VIEWER**, **then** the same stage applies to what the role sees (Home, Money, More: Debt/Net worth at `MONTH` if the plan has them, Why, Settings, Help). No Coming up row for a VIEWER (they can't act on any trigger) — instead deferred rows just appear when the board reaches them.
6. **Given** a **Practice preview**, **then** `stage = MONTH` regardless of the client's data or the staff member's own setting.
7. **Given** Home, **then** the Growth widget, Today card and "All tips ({n})" link read `stage ≥ ROUTINE` instead of `progress.hasCompletedWeekCheck`. Month score and level rules (S-5.3 #1–2) are unchanged.
8. **Given** a surface appears because the stage just went up (for example right after the first week check's Done screen), **then** the person sees **one** quiet note once: "New: Course and The Coach are now in your menu." / "Nieuw: Koers en De Coach staan nu in je menu." (`Should`; seen-state in `localStorage` per household + stage, no server write). No confetti, no score.
9. **Given** `NODE_ENV=production`, **then** no stage shows Energy or Soul anywhere (tabs, More, search, Quick add).

**Edge cases:** a person in two households at different stages sees each board's own stage after switching (cache keyed by household). A downgrade from Plus to Basic at `MONTH`: the Growth tab switches to Basic's Goals + preview (plan rule), stage unchanged. The Money **Week check** button and the next-move card never depend on the stage.

**Out of scope:** reordering tabs, Energy/Soul launch, per-person stages.

**MoSCoW:** Must · **Size:** L · **Layer:** frontend.

### S-12.4 · Hidden is not removed: deep links, search and "Coming up" — *frontend*

**Story:** As a **new household member** who heard about Debt or Course, I want to still find it and know when it will show up, so that the ladder never feels like a cage.

**Acceptance criteria**

1. **Given** any deferred route opened by URL, bookmark, Coach CTA, e-mail or the Course schedule (for example `/product/money/debt` at `SPLIT` on Plus), **then** it opens normally. Route gating stays `route-capabilities.ts` (plan + role) only; a test asserts `routeAccessForPath` has no stage input.
2. **Given** Quick add **Ask** search (`nav.searchable`), **then** deferred items the plan and role allow are still found, with a muted second line saying what brings them up front: "Shows in your menu after your first week check." / "…after you close your first month." Opening one works.
3. **Given** an OWNER or MEMBER below `MONTH`, **then** More ends with one row **"Coming up"** / **"Binnenkort"**. It opens a small sheet with:
   - the **next** trigger in plain words with live numbers from `next`: "Sort {n} more lines or wait {d} days" (`SORTING`), "Do your first week check — ten minutes" with a "Start week check" link (`ROUTINE`), "Close your first month" (`MONTH`);
   - what that stage adds **on this plan and role only** (for example on Plus at `SORTING`: "Course · The Coach");
   - a "Show everything now" switch (S-12.5).
   It is one row, never one faded row per item (keeps S-9.2's rule). VIEWER and Practice preview never see it.
4. **Given** a Coach tip whose CTA points to a deferred page (for example a debt tip), **then** the tip still shows and its CTA works; the Coach is not filtered by the ladder.
5. **Given** a screen reader, **then** the Coming up row reads its label plus the next trigger ("Coming up: after your first week check").

**Edge cases:** at `ROUTINE` on Basic, the `MONTH` stage adds nothing the plan has except levels — Coming up then says "Close your first month to see your month score levels." Zero-income household: triggers are unchanged (sorting and age do not need income).

**Out of scope:** a progress bar or percentage, gamified badges (they fight principle 4's "no score before there's something to score").

**MoSCoW:** Must (1, 2) · Should (3, 4, 5) · **Size:** M · **Layer:** frontend.

### S-12.5 · "Show everything now" — *contracts + backend + frontend*

**Story:** As an **experienced budgeter** (owner, member or viewer), I want to switch the ladder off for myself, so that I see the whole board from day one.

**Contract**

```ts
// account.schema.ts — AccountSettings
/** Skip the board ladder for this person (every household). Default false (D3). */
showAllSurfaces: z.boolean(),
```

- `accountUpdateSettings` already accepts `AccountSettings.partial()`, so the patch needs no new procedure. Column `account_settings.show_all_surfaces boolean not null default false` + migration.

**Acceptance criteria**

1. **Given** Settings › Account › **Preferences**, **then** a switch "Show everything now" / "Laat alles meteen zien" with the hint "Skip the step-by-step start. You can switch back any time." Default off for every new and existing person.
2. **Given** it is on, **then** the shell and Home treat the stage as `MONTH` for this person in every household they're in; plan and role filters still apply; Coming up disappears.
3. **Given** it is switched back off, **then** the board stage applies again (things the board already reached stay).
4. **Given** a VIEWER, **then** they may change it (personal setting, own account only). **Given** a Practice preview, **then** it has no effect (preview is always `MONTH`).
5. **Given** one partner turns it on, **then** the other partner's view does not change.

**Out of scope:** a household-wide switch for the OWNER, an onboarding question "Are you new to jars?" (onboarding stays two screens).

**MoSCoW:** Must · **Size:** S · **Layer:** contracts + backend (account settings) + frontend.

### S-12.6 · Drop the fake level "unlocks" (D4) — *contracts + backend + frontend + i18n*

**Story:** As a household **member**, I want level names to mean progress only, so that the app never promises an "unlock" that isn't real.

**Acceptance criteria**

1. **Given** `LEVELS` in `month-score.service.ts`, **then** `unlocks` is removed; thresholds and the five level names (Beginner…Compass) stay.
2. **Given** the contract, **then** `Level` loses `unlocks`, and `MonthScoreUnlockKey` is deleted from `month-score.schema.ts` and the barrels. `monthScore.levels` keeps returning `{ index, threshold }[]`. No app code reads `unlocks` today (verified: `monthScoreUnlockLabel` has no callers) — delete it from `month-score-copy.ts`.
3. **Given** i18n, **then** `pages.dashboard.levels.unlocks.*` is removed from `translations/pages/dashboard.ts` and any pinned override; `pnpm i18n:gen` (Given) regenerates the languages.
4. **Given** the tour copy (`features/tour.ts`) and Why page, **then** no line ties a feature to a level. (The tour's Growth body still says "Overview → Income → Goals", which is stale since CL-8; fix it in the same pass, Could.)
5. **Given** the real ladder (CL-12), **then** level-ups are never a trigger. Stage and level are two different things: the stage is what the board shows; the level is the cumulative score.

**MoSCoW:** Must · **Size:** S · **Layer:** contracts + backend + frontend + i18n.

---

## CL-13 · Quick add: four kinds in week 1

### S-13.1 · Quick add follows the stage — *frontend*

**Story:** As a **new household owner or member**, I want Quick add to offer the four things I need in my first week, so that adding spending is one tap and not a choice between nine.

**Kinds by stage** (`QUICK_ITEMS` in `quick-add.tsx`; plan filter from `CREATE_KIND_CAPABILITY` still applies):

| Kind (`CreateKind`) | From stage | Plan |
| --- | --- | --- |
| Transaction (`tx`) | `SPLIT` | all |
| Statement (`importStatement`) | `SPLIT` | Plus/Max; Basic sees it with the "Plus" badge (as today), opening the lock page |
| Fixed cost (`fixed`) | `SPLIT` | all |
| Income (`income`) | `SPLIT` | all (`growthIncome`); hidden where the role can't see Income |
| Goal (`goal`) | `ROUTINE` | all (`maxGoals` from `PLAN_LIMITS`; Basic 1) |
| Move money (`move`) | `ROUTINE` | all |
| Debt (`debt`) | `MONTH` | Plus/Max (`moneyDebt`) |
| Asset (`asset`) | `MONTH` | Max (`growthNetWorth`) |
| Training (`session`) | `MONTH`, **staging only** | Energy; **never in production** |

**Acceptance criteria**

1. **Given** an OWNER or MEMBER at `SPLIT` or `SORTING`, **when** they open Quick add › Add, **then** exactly Transaction · Statement · Fixed cost · Income show, in that order.
2. **Given** `ROUTINE`, **then** Goal and Move money are added; **given** `MONTH` (or show-all, or backfill floor), **then** Debt and Asset are added where the plan has them. A kind the plan lacks keeps today's plan badge only if it is in the stage's list (no new upsell rows).
3. **Given** the person **types** in Add mode, **then** deferred kinds the plan and role allow are matched too ("debt" finds Debt at `SPLIT`), with the muted line "Shows here after you close your first month." and they open normally (hidden ≠ removed).
4. **Bug fix (production):** **Given** `NODE_ENV=production`, **then** Training (`session` → `/product/energy/training/create`) is never listed or matched. Today `QUICK_ITEMS` has no launch filter, so production offers an Energy page that is deferred. Filter with `isProductEnabled('energy')`.
5. **Given** a VIEWER or a Practice preview, **then** Quick add stays hidden (`household-shell.tsx`: `showQuickAdd && canMutate`), unchanged.
6. **Given** the FAB opens in Ask mode when Coach steps are due, **then** that rule is unchanged; only the Add list is staged.
7. **Given** a 375 px screen, **then** the four week-1 kinds fit without scrolling inside the sheet.

**Edge cases:** goal cap reached (`maxGoals`): Goal still shows from `ROUTINE`; the create page shows the existing limit message. A Basic household at `SPLIT` sees "Statement · Plus" — that is the one upsell in week 1, and it is on the action the user is trying to do (import instead of typing), so it is information, not a nudge (principle 4).

**Out of scope:** new kinds, reordering by usage, a "recent" section.

**MoSCoW:** Must (1, 4, 5) · Should (2, 3) · **Size:** S · **Layer:** frontend. **Depends on** S-12.1 + S-12.3 (stage in `useShellNav`). Criterion 4 has no dependency: ship it first.

---

## Clarity 2 gaps

### G-1 · "Close month" on Home opens the close flow — *frontend*

**Today:** the next-move card's Close month CTA calls `goToMonthScore` (`home-dashboard.tsx`): it travels Home to that period and scrolls to `#month-score`. The person then has to find the close button in `MonthScoreLog`, and for `CLOSE_PRIOR` meet the blockers there. One move becomes three.

**Story:** As a household **owner or member**, I want "Close month" to start closing the month right away, so that the next move is one tap.

**Acceptance criteria**

1. **Given** next move `CLOSE_PRIOR` or `CLOSE_MONTH` and an OWNER or MEMBER, **when** they press **Close {month}**, **then** a **Close month** dialog/sheet opens on Home **without changing the selected period**. It loads `money.monthScore.current({ period: target })` for that month's `closeBlockers` and `priorOpenPeriod`.
2. **Given** the target has a `priorOpenPeriod` (an older month is still open), **then** the dialog first says "Close {prior} first — months close in order." with one button "Close {prior}", which re-targets the dialog to the prior month. After it closes, the dialog moves on to the next open month or finishes. (Server rule unchanged: the close chain is enforced by `monthScore.close`.)
3. **Given** `closeBlockers.inboxCount > 0` for the target, **then** the dialog shows "{n} lines from {month} are still in your Inbox." with "Sort them" → the Inbox filtered to that period, and the Close button is disabled with that reason. (Today's `MonthScoreLog` blocker copy is reused.)
4. **Given** due bills (`closeBlockers.dueBills`), **then** the dialog continues straight into the existing `CloseMonthDialog` dispositions (carry or skip each bill), then calls `monthScore.close({ period, billDispositions })`.
5. **Given** success, **then** the existing recap toast shows, `money.dashboard.get`, `money.progress.get`, settlements and debts are invalidated, and the next-move card moves on. Closing a first month raises the stage to `MONTH` (S-12.1), so S-12.3 #8's note may follow.
6. **Given** a close fails (network/5xx or `month_close_*` error), **then** the dialog stays open with the error and Retry. `close` is idempotent (closing a closed month returns its recap), so Retry is safe.
7. **Given** a VIEWER or Practice preview, **then** the card has no CTA (S-5.2 #2–3), unchanged.
8. **Given** `MonthScoreLog` on Home, **then** its own close button uses the **same** flow component (one close flow, two doors).

**Edge cases:** two members close the same month at once: the second gets the recap (idempotent). A household with `periodStartDay ≠ 1`: verify `collectCloseBlockers` (it builds the window as `${period}-01` … end of month) counts the household's real period window; if not, that is a bug to fix in this item or log for backend. Zero-income month: closing works; the recap shows €0 without shame copy.

**Out of scope:** auto-close, changing bill disposition rules, closing from the Money portal.

**MoSCoW:** Must · **Size:** M · **Layer:** frontend (+ backend only if the `periodStartDay` check finds a bug).

### G-2 · Week-1 checklist counts pending invites — *backend + contracts + frontend*

**Today:** `Week1Checklist` marks "Invite your partner" done only when `members.length > 1`, and decides whether to show it with `usePlanCapacity('maxMembers', members.length)`. The server (`household.service.ts` `seatOccupation`) counts **pending invitations as occupied seats**, and no procedure exposes them. So after inviting a partner, the item stays open, and on Basic (2 seats: 1 writable, 1 viewer) the item can invite into a seat the server will refuse.

**Contract** (`household.contract.ts`, READ):

```ts
// household.schema.ts
/** Seat use as the server counts it: members plus pending, unexpired invitations. Counts only, no e-mails. */
export const HouseholdSeatUsage = z.object({
    members: z.int().min(1),
    pendingInvites: z.int().min(0),
    writableUsed: z.int().min(0),   // members + pending in OWNER/MEMBER roles
    viewerUsed: z.int().min(0),     // members + pending in VIEWER role
    /** Effective caps after seat add-ons (`effectiveSeatCaps`); null = unlimited. */
    maxMembers: z.int().nullable(),
    maxWritable: z.int().nullable(),
    maxViewer: z.int().nullable(),
});

/** Seat usage for invite UIs (checklist, members settings). OWNER and MEMBER; not VIEWER. */
export const householdSeats = oc.input(HouseholdScoped).output(HouseholdSeatUsage);
// mounted as contract.household.seats
```

`seatOccupation` becomes the single source for both `invite` and `seats`, and it **ignores expired invitations** (`expiresAt < now`), which it counts today (an expired invite blocks a seat until someone cancels it).

**Acceptance criteria**

1. **Given** an OWNER who invited their partner (pending), **then** "Invite your partner" shows as done ("Invited — waiting for them" / "Uitgenodigd — wacht op hen").
2. **Given** the invite expires or is cancelled and nobody joined, **then** the item is open again.
3. **Given** a Basic household with the OWNER plus one pending VIEWER invite, **then** the item is done; it is never shown as an action into a full plan (S-6.5 #6 keeps "hidden, not locked").
4. **Given** the item is open, **then** it shows only when the server's caps leave a seat (`seats` response), not the client's member count.
5. **Given** a MEMBER, **then** they may read `seats` and see the item (both roles may invite). **Given** a VIEWER, **then** `seats` is rejected by role and the checklist doesn't render (unchanged).
6. **Given** household A has pending invites, **when** B reads `seats`, **then** B's numbers don't include them (cross-household spec). No invitee e-mail or name is returned (privacy: counts only).
7. **Given** the invite dialog (`household-members-settings.tsx`), **then** it uses the same `seats` data to say "1 seat left" correctly (Should).

**Out of scope:** listing pending invites with e-mails, resend/cancel invite UI, seat price copy.

**MoSCoW:** Must (1–6) · Should (7) · **Size:** M · **Layer:** contracts + backend (`auth/household`) + frontend.

---

## Next release (noted, not in scope)

- **D7 · Course-lite for Basic** (1 goal, no lanes). This release keeps Basic's Growth tab = Goals + Course preview card, behind `ROUTINE`. Course-lite will reuse that tab and stage.
- **D11 · Read-only debt list on Basic.** Today Debt is `moneyDebt` (Plus+). When D11 ships, the Debt More row appears on Basic at `MONTH` with the same ladder rule; the debt plan with a free date stays Plus.

## Dependencies and build order

```
S-13.1 #4 Training launch filter      (independent bug fix, ship first)
S-11.2 ─┐
S-11.1 ─┴─ website, independent of the app (one PR)
S-12.6 drop fake unlocks              (independent)
G-2 seats contract ─► checklist        (independent)
G-1 close flow                         (independent; #5 invalidates progress once S-12.1 exists)
S-12.1 progress + stage ─► S-12.2 floor + backfill ─► S-12.3 shell/Home ─► S-12.4 Coming up/search
                                   S-12.5 showAllSurfaces ─┘                 └─► S-13.1 Quick add by stage
```

- **S-12.2 must deploy with or before S-12.3.** Without the floor, existing households lose surfaces on deploy.
- **S-12.3 fails open to `MONTH`** while the stage loads, so a slow or failing `progress.get` never hides paid features.
- **Recommended order:** (1) backend pass: S-12.1, S-12.2, S-12.5 contract/column, S-12.6, G-2; (2) app: S-13.1 #4, G-1, G-2 UI, S-12.3, S-12.5 UI, S-12.4, S-13.1; (3) website in parallel: S-11.1, S-11.2.

## Open questions for Given (not answered by D1–D11)

1. **Fixed costs and Income on day 1?** The audit puts them at "week 1" in the nav but offers them in Quick add from day 1, and the zero-income next move says "Add income". **Recommendation:** all four Money items from day 1 (the sub-nav is already ≤ 4; principle 1 needs income and bills in place first). Only Growth, Coach, upgrade rows, Debt, Net worth, Learn and the extra Quick add kinds wait.
2. **A paid upgrade and the ladder** *(plans)*. D3 says every plan walks the ladder, but a Basic household that upgrades to Plus on day 2 for Course would not see the Growth tab until its first week check. **Recommendation:** a successful upgrade raises `boardStageFloor` to at least `ROUTINE`, and checkout success lands on Course.
3. **When does "More with Plus" appear?** *(pricing)*. **Recommendation:** from `ROUTINE` (after the first week check), so week 1 carries no upgrade row; the only week-1 plan badge is "Statement · Plus" in Quick add, on the action itself.
4. **Backfill scope** *(scope)*. **Recommendation:** every household that exists at deploy starts fully unlocked (`floor = MONTH`), including ones a few days old. The alternative (derive for households < 14 days old) protects the ladder for a handful of boards but risks hiding paid surfaces.

---

## Decisions on the open questions (Given, 17 Nov 2026)

1. **Day 1 surfaces:** Fixed costs and Income are visible from day 1. The SPLIT stage shows Jars, Inbox, Fixed costs and Income.
2. **Paid upgrade:** a household on Plus or Max goes straight to the stage that shows everything its plan includes (at least ROUTINE, so Course shows at once). Whoever pays sees what they pay for. The same applies when a household starts on a paid plan.
3. **"More with Plus" (Basic):** appears only after the first week check (ROUTINE stage or later).
4. **Existing households:** every household that exists before this release starts at MONTH (fully unlocked), with or without history. Nobody loses a surface after an update. *(orchestrator decision)*
