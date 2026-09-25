# Coach readiness

**The Coach** is one product voice: tip inbox (`/product/coach`) plus on-screen helpers. Not every surface is production-ready yet.

Runtime source of truth: [`packages/contracts/src/public/platform/coach/coach-readiness.ts`](../../packages/contracts/src/public/platform/coach/coach-readiness.ts).

- **`ship`** — visible in production (still respects Settings → Account “Show The Coach”)
- **`preview`** — visible on `development` / `staging` / `test` only; hidden when `NODE_ENV=production`
- **`backlog`** — checklist only; no UI

Promote `preview` → `ship` only after the checklist boxes for that row are done.

---

## Ship

| Id | Where | What good looks like | Checklist |
|---|---|---|---|
| `inbox` | `/product/coach` | Feed with kinds, dismiss, CTAs | [x] Shell works |
| `session` | Coach smart-fill | Up to 3 next-move steps, writes via product APIs | [x] Steps wired |
| `split_coach` | Settings → Jars | Soft % tips vs Eker floors; spending style aware | [x] Phase A/B |
| `debt_strategy` | Money → Debts | Avalanche / snowball / minimal compare | [x] Real numbers |
| `necessities_pressure` | Money → Fixed costs | Clear “bills vs 55%” coaching | [x] Card + doctrine |
| `jar_guide` | Jar detail | Per-jar “what can I use this for?” | [x] Guide card |
| `why_caption` | App shell | One calm why-line under header | [x] Path map |
| `period_travel` | Money Looking Ahead/Back | Honest horizon copy | [x] Shared util |

---

## Preview (staging / dev only)

| Id | Where | What good looks like | Gaps to close before ship |
|---|---|---|---|
| `giving_finder` | Give flows / Soul / jar guide | Shortlist orgs with signals; HelperGate | [ ] Advice quality reviewed · [ ] HelperGate at every call site (gate now wraps component) |
| `goal_advice` | Growth → Goal detail | Concrete next moves, not filler cards | [ ] Depth / tone pass · [ ] Coach chrome if it stays “The Coach” |
| `learn_recommended` | Growth → Learn | Recommendations that teach, not chrome | [ ] Ranking quality · [ ] Not just a Coach mark |
| `income_simulator` | Growth → Income | Coaching content beyond a mark | [ ] Real tip / next move · or drop Coach chrome |
| `time_coach` | Inbox + Energy week | Rule-based time tips with citations | [ ] Energy portal ships · [ ] More producers so inbox is not empty |

---

## Backlog

| Id | Intent | Notes |
|---|---|---|
| `split_coach_b2` | Infer spending style from behaviour | See `apps/application/app/_lib/split-coach/README.md` |
| `split_coach_c` | Weekly Home / Jars tip card | Same README |
| `money_tip_producers` | `CoachService.registerRefresher` for money | Only time coach registers today |
| `growth_tip_producers` | Growth inbox tips | — |
| `soul_tip_producers` | Soul inbox tips | — |
| `household_coach_toggle` | Wire `isCoachEnabled` | Schema exists; unused by UI / service |
| `coach_guide_surface` | Adopt `CoachGuideSurface` | Prefer over ad-hoc mark + gate |
| `feed_key_i18n` | Localize non–`energy.time.*` keys | Today: server English fallback |

---

## Env rule

Same pattern as launch products (Energy / Soul deferred in production):

```ts
shouldDeferPreviewCoaches({ nodeEnv }) // true only when production
isCoachFeatureEnabledAtLaunch(id, { nodeEnv })
```

App wrapper: `apps/application/app/_lib/coach-readiness.ts` + `CoachFeatureGate`.
