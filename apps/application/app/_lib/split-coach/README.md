# Split coach

Soft guidance when someone changes their income jar split. Never blocks save.

Defaults stay **T. Harv Eker** (`DEFAULT_JAR_SPLIT` in `@rumtelo/contracts`): **55 / 10 / 10 / 10 / 10 / 5**. Full jar doctrine (FF vs LTS, why 55/5, pre-allocation): [`product/money/README.md`](../../../../backend/src/modules/public/product/money/README.md).

## Why

People often raise Play or Give by cutting Financial Freedom or Long Term Savings. That inverts Eker’s order: **pay yourself first (FF + LTS), then fun and giving**. The coach surfaces that trade-off in plain English.

When **Necessities / fixed costs** blow past the envelope, coaching is different: simplify bills and/or raise income — never raid FF. Full doctrine + UI surfaces:
[`product/money/README.md`](../../../../backend/src/modules/public/product/money/README.md) → “When Necessities can’t fit in 55%”.

Override is always allowed — tips are coaching, not rules. Eker’s percentages are guidelines; our only hard rule is the split sums to 100%.

## Phases

### A — Split tips (shipped)

**Where:** Settings → Jars (`JarsSettings`), live while sliders move.

**What:** Rule-based tips from current percentages vs soft floors/ceilings.

**Code:** `evaluate.ts`, `types.ts`. UI dismisses tips per session; Save still works.

### B — Spending style (shipped)

Person-scoped `SpendingStyle` on `account_settings` (`SPENDER` | `SAVER` | `BALANCED` | `UNKNOWN`):

- Self-declare on onboarding (“I tend to…”) and Settings → Account
- Passed into `evaluateSplitCoach` for the **current user**
- Household board also stores `incomeStability` (STABLE | VARIABLE | NONE) and `payoffStrategy` (AVALANCHE | SNOWBALL) — shared decisions, not personality

Spending style is descriptive, never judgmental — “leans spender”, never “bad with money”.

### B2 — Infer from behavior (later)

Optional inferred override with low confidence until enough periods exist (spend rate on Play, FF underfunded, etc.).

### C — Weekly coach card (later)

One card on Home / Jars — one tip, one CTA, at most once per week per tip id.

## Product principles

1. **Default is the teaching** — Eker split is the baseline; tips explain drift.
2. **Soft** — warn / info only; no hard validation on save.
3. **Priority language** — Freedom and Long Term before Play/Give when there’s a conflict.
4. **English, short** — one thought per tip.
5. **Person vs board** — spending style on the person; debt order and income stability on the household.

## API surface

```ts
evaluateSplitCoach(pctByKey, spendingStyle?: SpendingStyle): SplitTip[]
pctByJarKey(jars, pctById): SplitPctByKey
```

`SpendingStyle` lives in `@rumtelo/contracts`.

## Out of scope (for now)

- Blocking invalid splits beyond “must sum to 100”
- ML / LLM coaching copy
- Cross-household comparisons
- Tax or investment advice beyond jar allocation
