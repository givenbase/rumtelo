---
name: fix-bug
description: Reproduce a Rumtelo bug, add a failing regression test, then apply the smallest fix. Use for stack traces, failing tests, 500s, wrong totals, empty screens, contract mismatches or "X shows the wrong value".
argument-hint: "[bug description, error, or failing test]"
---

# Fix a bug

Bug: $ARGUMENTS

**Agents:** `nestjs-backend-engineer` or `nextjs-frontend-engineer` (by layer) → `qa-test-engineer`; add `security-reviewer` when money, membership or household scope is involved.

## 1. Reproduce

- Read the error and stack trace; open the exact file and line.
- Reproduce with the narrowest test you can run (table in `write-tests`). No local DB: a bug that needs live data is reproduced by reading the code path, the contract and the service; staging checks happen after Given pushes.
- Gather facts before guessing: `git log -p` on the area, inputs, which household/plan/locale.

## 2. Root cause

Rank 1–3 hypotheses and kill them with evidence. Usual suspects here:

- Household context missing — a query outside `HouseholdScopedRepository`, or a household id taken from input instead of the scope.
- Contract vs service drift — mapping drops a field, enum value mismatch (string enums are nominal; derive types from the contract).
- Money — float arithmetic, decimal strings, rounding remainder not given to the largest share, Dutch decimals (`EUR 1.234,56`).
- Dates — hardcoded month tables instead of `Intl`; timezone (`Europe/Amsterdam`) vs UTC (`forceUtcTimezone`).
- Launch gating — Energy/Soul deferred when `NODE_ENV=production`, which staging also uses.
- UI — overspent jar must render a full red meter, not empty; stale TanStack query keys; server/client component boundary.
- Known traps: [`docs/engineering/traps.md`](/docs/engineering/traps.md).

Check sibling code paths for the same mistake.

## 3. Regression test first

Write a test that fails for the current code (Vitest `*.spec.ts` beside backend code; `node:test` `*.test.ts` in contracts/utils/application). Confirm it fails for the right reason.

## 4. Minimal fix

Smallest change that passes; no refactors or renames in the same patch. Follow `.claude/rules/` patterns.

## Definition of done

- Regression test passes; its file still passes.
- `pnpm check-types` and `pnpm lint` clean.
- Report: root cause (1–3 sentences), fix, test added, same bug elsewhere not touched, and what still needs a staging check.
