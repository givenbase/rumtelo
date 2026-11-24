# North star in Mindset — proposal for Given

Date: 2026-11-24. Status: **open, waiting for Given.** Nothing is built. Sources: a web research brief (methods and other products) and a read-only scan of the code. Claims marked *(unverified)* were not confirmed on a primary source.

## 1. Recommendation in one paragraph

Give every household one page in Mindset, **"Where you're going"** (NL *Waar je naartoe gaat*): the app shows **where you are now** from data it already has, the household writes **one sentence about where it wants to be in a year**, optionally says **what it is for**, and the page lists the **one to three goals** that lead there, each with its first step. The sentence comes back once in the week check and once on the goals page. It reuses a field that already exists and fixes a week-1 checklist item that cannot be completed today.

## 2. What the evidence says

| Finding | Strength | What it means for us |
| --- | --- | --- |
| Specific goals with a number and date, plus feedback, beat "do your best" (Locke & Latham) | Very large body of evidence, mostly work tasks | The north star must end in goals with an amount or a "done when", and the week check is the feedback |
| An if-then first step ("If X, then I will Y") raises follow-through (Gollwitzer & Sheeran, meta-analysis of 94 tests, d = .65) | Strong | Every goal linked to the north star carries one first step |
| Goals that fit a person's own values get more sustained effort (Sheldon & Elliot) | Moderate | A light "what is it for" is worth asking; a long values exercise is not |
| People who feel connected to their future self save more (Hershfield) | Moderate; no meta-analysis found | One line, "a year from now", is enough |
| Aspirations rise at the start of a week, month or year (Dai, Milkman, Riis) | Moderate | Revisit at the week check, the month close and once a year — moments we already have |
| Effort speeds up near a goal; a head start helps (Kivetz et al.) | Moderate | Show what is already there (buffer, paid-off debt) as progress |
| Imagining only the good outcome lowers effort (Kappes & Oettingen) | Four experiments | Never ask for the dream without a first step |
| Announcing identity goals to others lowers action (Gollwitzer 2009) | Moderate | No "share your goal" prompt |
| A written "why" alone improves saving | **No evidence found** | The why is optional; the goal and first step carry the weight |
| GROW (goal, reality, options, will) | No trial of GROW itself; coaching in general works (Theeboom 2014) | "Where are you now, where do you want to go" is a sound shape for the page, not a proven method |

How other products do it, as far as it could be verified: YNAB asks one question, "What is this money for?"; Monarch, Copilot and Qapital start from a goal with an amount; Duolingo and Headspace ask a pick-from-chips motivation question early *(third-party teardowns)*; Sunsama has a weekly planning and review ritual. A free-text "why" shown back later is rare. Noom's long commitment flow (over a hundred screens, *teardown*) is the model to avoid.

Dutch context: budget-coaching intakes map the situation first and then agree goals and actions *(secondary sources; Nibud's own intake questions were not found)*.

## 3. What the app already has

| Already there | Where | Notes |
| --- | --- | --- |
| A household "why" | `household_settings.why` (≤500), shown on Home as "Your dream", in the export | **No screen can edit it.** The week-1 checklist item "Write down your dream" links to a settings page without that field (backlog CL-7) |
| "Where are you now?" in the Course wizard | `account_settings.work_situation`, `year_intention` | Plus/Max only, per person, never shown again after the wizard, **not in the GDPR export** |
| "What do you want to see different by the end of the year?" | Course wizard step 3 → year goals with a first step for the month | Plus/Max only |
| A why per goal | `money_goal.why` (≤500) | All plans; Basic has one goal |
| A weekly intention | `money_week_check.intention` (≤280) | The Mindset "Intent" page is a mock with no storage |
| The household's real "now" | Split, pot balances, buffer, debts and debt-free date, month score, net worth (Max) | Nothing has to be asked again |

Naming: `docs/brand/positioning.md` already calls the slogan "Stop wondering where it went" the north star. The feature needs its own name; this proposal uses "Where you're going".

## 4. Three options

| | A — household direction (recommended) | B — personal direction | C — a "life" horizon in Course |
| --- | --- | --- | --- |
| What it is | One page in Mindset for the household | One private line per person | A level above the year goals |
| Asked | One sentence (where in a year); optional what-for | The same, per person | A long-term goal per area |
| Read, not asked | Where you are now, from the board | The same | — |
| Link to Planning | Lists 1–3 goals; shown on the goals page and in the week check | The same, for the person's own goals | Strongest: year goals hang under it |
| Plans | All | All | Plus and Max only |
| Who writes | OWNER (MEMBER reads) — your call | Each person | The maker |
| Practice coach | Sees it on an ACTIVE link (it is household data) | Never (per-person consent is not built) | Never |
| Build | Reuses `why`; one new column | New personal field | New enum value, own migration, more UI |
| Size | M, 4–8 h in three steps | M | L |
| Fits "keep it simple" | Yes | Yes | No |

**Recommended: A now, B as a later addition** for partners with different reasons. Park C.

## 5. Option A in detail

The page, top to bottom:

1. **Where you are now** — read from the board, neutral, no score judgement: this month's split, the buffer, the debt-free date if there are debts. A board in its first week shows only the split. Zero income shows one move: "Add income to see your split".
2. **Where you want to be** — "Where do you want to be a year from now?" / *Waar wil je over een jaar staan?* One sentence, up to 280 characters.
3. **What it is for** — optional. Chips (Peace of mind / *Rust*, Freedom / *Vrijheid*, Family / *Gezin*, Out of debt / *Schuldenvrij*, Something specific / *Iets specifieks*) and, optionally, your own words (the existing `why`). A hint says no health or religion details are needed.
4. **The goals that get you there** — the household's active goals (Basic: one; Plus: up to five), each with its first step. With no goal yet: one button, "Make this a goal".

Where it comes back: once on the week check's last screen, once above the goals list, and on Home where "Your dream" is today. Never as a reminder or a nag. At the month close and at the start of a year the page offers "Still right?".

Build steps (each one commit group):

| Step | What | Priority · Size · Estimate |
| --- | --- | --- |
| S1 | The page in the Mindset tab; write direction and what-for; Home and the checklist item point at it (fixes CL-7); in the export | High · M · 3–5 h, migration unverified until staging |
| S2 | "Where you are now" read from the dashboard | Medium · M · 2–3 h |
| S3 | Show the line on the goals page and at the end of the week check; "Make this a goal" | Medium · S–M · 1–3 h |

## 6. What to avoid

- A dream without a first step.
- A mandatory free-text why: no proven benefit, and it can hold health or belief data.
- A big red gap between now and the target ("information, never shame").
- Sharing or announcing the north star outside the household.
- More than three goals under it.
- A long onboarding flow; this lives after onboarding, in Mindset.

## 7. Found on the way

- `work_situation` and `year_intention` are personal data that the export leaves out. That is a GDPR completeness gap whatever is decided here.
- The Mindset "Intent" page is a mock: its input stores nothing.
- The year intention has no year attached, although the question names one.

## 8. Decisions for Given

1. Option A (household), B (personal), or A now and B later?
2. May a MEMBER write the household direction, or only the OWNER?
3. May a coach on an ACTIVE link read it? Today the household "why" already reaches them through the dashboard.
4. The name: "Where you're going" / *Waar je naartoe gaat*, keep "Your dream" / *Je droom*, or another.
5. Add `work_situation` and `year_intention` to the export now?

## Sources

- Gollwitzer & Sheeran 2006, implementation intentions: https://www.socmot.uni-konstanz.de/publications/implementation-intentions-and-goal-achievement-meta-analysis-effects-and-processes
- Wang et al. 2021, mental contrasting with implementation intentions: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8149892/
- Kappes & Oettingen 2011, positive fantasies: https://www.psy.uni-hamburg.de/arbeitsbereiche/paedagogische-psychologie-und-motivation/personen/oettingen-gabriele/dokumente/kappes-oettingen-2011.pdf
- Sheldon & Elliot 1999, self-concordance: https://pubmed.ncbi.nlm.nih.gov/10101878/
- Gollwitzer et al. 2009, intentions made public: https://pubmed.ncbi.nlm.nih.gov/19389130/
- Dai, Milkman & Riis 2014, fresh start effect: https://anderson-review.ucla.edu/wp-content/uploads/2021/03/Dai-Milkman-Riis_FreshStartEffect_2014_Mgmt_Sci.pdf
- Hershfield 2011, future self: https://static1.squarespace.com/static/5dd05454f1a7771855d537b7/t/5deeac51af06d83e3e797573/1575922770469/Hershfield_2011_Annals_of_the_New_York_Academy_of_Sciences.pdf
- Locke & Latham 2002, goal setting: https://goal-lab.psych.umn.edu/orgpsych/2020/readings/5.%20Motivation/Locke%20&%20Latham%20(2002).pdf
- Kivetz, Urminsky & Zheng 2006, goal gradient: https://business.columbia.edu/sites/default/files-efs/pubfiles/1200/goalgradient.pdf
- Theeboom et al. 2014, coaching meta-analysis: https://dare.uva.nl/record/1/403451
- YNAB getting started: https://support.ynab.com/en_us/getting-started-with-ynab-BJBFUjkUGg.md
- Monarch goals: https://help.monarch.com/hc/en-us/articles/15000751305108-Using-Goals
- Copilot goals: https://help.copilot.money/en/articles/11100462-creating-new-goals
- Qapital goals: https://help.qapital.com/en/articles/10245417-create-goals
- Sunsama weekly planning: https://help.sunsama.com/docs/weekly-planning
- Irish DPC, special category data: https://www.dataprotection.ie/organisations/know-your-obligations/lawful-processing/special-category-data
