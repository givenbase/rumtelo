# Household taxonomy — Role × Relation (Kind retired)

## Decision

Household access and identity use **two per-seat enums** only:

| Enum | Values | Meaning |
|---|---|---|
| `HouseholdRole` | `OWNER` \| `MEMBER` \| `VIEWER` | What they may do |
| `HouseholdRelation` | `FAMILY` \| `CIRCLE` \| `EXTERNAL` | Who they are to this board |

`HouseholdKind` (`SOLO` / `PARTNERS` / `FAMILY` / `FRIENDS`) is **deprecated**. Plan limits are **seat caps**, not board type. Kind may still exist on settings rows for export/compat; product UI must not set or gate on it.

## Role ladder

Product enum is **only** `OWNER | MEMBER | VIEWER` — no ADMIN.

| Legacy BA role | Product `HouseholdRole` |
|---|---|
| owner | OWNER |
| admin | MEMBER (mapped at service layer) |
| member | MEMBER |
| viewer | VIEWER |

Invite form never offers OWNER — only MEMBER | VIEWER. MEMBER may invite when the plan allows.

## Relation

Stored in Rumtelo tables (not better-auth):

- `household_invite_meta` — pending invite
- `household_member_meta` — accepted seat

Copied on accept via `household.claimInviteRelation`. Soft-upgrade chooser suggests Practice for `EXTERNAL`, household for `FAMILY` / `CIRCLE`.

## Invite defaults

- Role: VIEWER  
- Relation: FAMILY  
- Seat caps disable roles that do not fit the plan  

## Practice

Real coaches still prefer Practice dual-consent. Household `EXTERNAL` is the lightweight look-along / helper path without a Practice desk.
