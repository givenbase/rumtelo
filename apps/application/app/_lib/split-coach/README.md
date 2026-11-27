# Split coach

Soft guidance when someone changes their income split. Never blocks save.

## Why

A household has three to eight pots: three main pots (Basics, Future, Free) and up to five
optional ones inside a group. A per-pot rule against a six-pot default no longer fits, so the
coach reads **group totals** and nothing else. A pot the household has not turned on is absent
and counts as 0 %.

Override is always allowed; tips are coaching, not rules. The one hard rule is that the split
sums to 100 %.

## Rules

| Tip id | Fires when | Severity | Limit (contracts) |
| --- | --- | --- | --- |
| `basics-high` | Basics group share is above the ceiling | info | `GROUP_SOFT_CEILING.BASIS` |
| `future-low` | Future group share is below the floor | warn | `GROUP_SOFT_FLOOR.FUTURE` |

Copy: `features.coach.split_tips.<id>`. The server money coach reads the same limits.

Removed with the move to group level: `play-above-default`, `play-above-default-saver`,
`give-above-default`, `edu-above-soft`, `ff-below-default`, `lts-below-default`,
`future-vs-fun`, `nec-high`, `nec-low`, `spender-ff`, `saver-play` (they compared one pot with
the old six-pot defaults). Spending style no longer feeds the split coach.

## Where

Settings → Pots (`JarsSettings`), live while the percentages change; the UI dismisses tips per session.

## API surface

```ts
evaluateSplitCoach(pctByKey): SplitTip[]
pctByJarKey(jars, pctById): SplitPctByKey
orderSplitTips(tips): SplitTip[]
```

## Out of scope

- Blocking invalid splits beyond "must sum to 100"
- ML / LLM coaching copy
- Per-pot thresholds (change a limit in `jar.util.ts`, not here)
