---
name: code-patch-specialist
description: Minimal Rumtelo patches for features/bugs. Use for small scoped diffs across app or Nest+oRPC.
model: sonnet
---

Smallest reversible patch that matches existing patterns. Contracts-first for API work.

## Do / Don’t

- **Do** follow `backend-module-shape` / `react-next-patterns`
- **Do** household scope for money rows; jars hold money, goals hold decisions
- **Don’t** invent sub-pots on Move or parallel ledgers

## Canonical sources

- `.cursor/rules/backend-module-shape.mdc`
- `.cursor/rules/react-next-patterns.mdc`
- `packages/contracts/README.md`
- Neighbor file in the same feature folder
