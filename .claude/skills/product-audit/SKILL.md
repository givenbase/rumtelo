---
name: product-audit
description: Read-only customer-clarity audit of a Rumtelo surface (a page, flow, portal or the website) by product-manager, ux-ui-designer and brand-copywriter - first-30-seconds test, promise and next step, copy vs docs/brand, information-architecture count. Output is findings, prioritized recommendations and mockup suggestions; no code changes. Use before a redesign, launch, or when a screen "doesn't land".
argument-hint: "[route, flow, or surface]"
---

# Product audit (customer clarity)

Surface: $ARGUMENTS

**Read-only.** No edits to code, copy or translations. Output is a report.

**Agents:** `product-manager` (promise, audience, priority) + `ux-ui-designer` (IA, hierarchy, mockups) + `brand-copywriter` (copy vs voice) in parallel; the orchestrator merges. Optional: `wcag-compliance-auditor` for obvious a11y blockers.

## Read first

- [`docs/product/overview.md`](/docs/product/overview.md), [`audience.md`](/docs/product/audience.md), [`principles.md`](/docs/product/principles.md)
- [`docs/brand/positioning.md`](/docs/brand/positioning.md), [`docs/brand/quotes.md`](/docs/brand/quotes.md)
- The matching `docs/explain/*` page (money, growth, energy, soul, practice)
- EN copy for the surface in `packages/i18n/translations/` (and NL in `languages/nl.json`)

## Look at it

Browser pane on the running app or staging when available (screenshots at 375 and 1280 px); otherwise reason from the route's components and copy and say so.

## Tests

1. **First 30 seconds** — a new user from [`audience.md`](/docs/product/audience.md): what is this, is it for me, what do I do now? Answer each in one line or mark it failed.
2. **Promise and next step** — the surface's one promise in one sentence, and exactly one primary action. Count competing primary actions.
3. **Copy vs docs/brand** — words match product language (household, jars, goals, Course, week check); no jargon; "information, never shame" (every warning carries the one move that fixes it); no stale "coming soon" for things that exist or will not exist.
4. **IA count** — number of nav items, tabs, cards and actions visible at once; flag over 7 at one level; duplicate entry points to the same thing.
5. **Plan and role** — what Basic / Plus / Max and viewer vs full member see; locked states explain the gain, not only the lock.
6. **EN / NL parity** — meaning, length, tone.

## Output

```
## Findings
| # | Area | Finding | Evidence (file/route/key) | Severity (High/Med/Low) |

## Recommendations (prioritized)
| # | Change | Why (which test) | Priority | Size (S/M/L) | Owner agent |

## Mockup suggestions
Short descriptions or ASCII wireframes of the proposed layout for the top 1–3 items.
```

## Definition of done

All six tests answered with evidence; recommendations carry Priority + Size so they can go straight into [`docs/BACKLOG.md`](/docs/BACKLOG.md); no files changed.
