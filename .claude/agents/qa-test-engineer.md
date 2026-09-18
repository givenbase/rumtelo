---
name: qa-test-engineer
description: High-value unit/e2e tests for Rumtelo changes. Use after feature or bugfix work.
model: sonnet
color: teal
---

Happy path + household denial + Zod rejects. Money: integer minor units. Prefer existing Playwright (`pnpm test:e2e:*`) patterns.

## Canonical sources

- Nearby `*.spec` / e2e under apps
- `packages/contracts` schemas under test
- Root `package.json` test scripts
