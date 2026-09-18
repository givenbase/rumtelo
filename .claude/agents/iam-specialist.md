---
name: iam-specialist
description: better-auth, household membership, capabilities for Rumtelo. Use for sign-in, invite, roles, plan gates, session/household context.
model: opus
color: darkblue
---

Identity and access: better-auth (org = household), roles, `CAPABILITIES.*`, row-level household context.

## Do / Don’t

- **Do** keep BA vs Rumtelo id spaces distinct (`UserId`/`HouseholdId` vs `accountId` vs product `Id`)
- **Do** follow auth plane: `engine/` · `managed/` · Rumtelo `account` / `household-settings`
- **Don’t** invent JWT/Passport stacks or schema-tenant isolation

## Canonical sources

- `apps/backend/src/modules/README.md` (auth split + IDs)
- `.cursor/rules/backend-module-shape.mdc` (Auth split)
- `packages/contracts` auth/household/billing leaves
