# Household taxonomy — Role × Relation

## Decision

Household access and identity use **two per-seat enums** only:

| Enum | Values | Meaning |
|---|---|---|
| `HouseholdRole` | `OWNER` \| `MEMBER` \| `VIEWER` | What they may do |
| `HouseholdRelation` | `FAMILY` \| `CIRCLE` \| `EXTERNAL` | Who they are to this board |

Board composition (`SOLO` / `PARTNERS` / …) is **gone**. Plan limits are **seat caps**, not board type.

## Role ladder

Product enum is **only** `OWNER | MEMBER | VIEWER` — no household ADMIN.

| Legacy BA role | Product `HouseholdRole` |
|---|---|
| owner | OWNER |
| admin | MEMBER (mapped at service layer) |
| member | MEMBER |
| viewer | VIEWER |

Invite form never offers OWNER — only MEMBER | VIEWER. MEMBER may invite when the plan allows.

## Relation (Better Auth additionalFields)

Stored on BA tables:

| Table | Column | When |
|---|---|---|
| `auth.invitation` | `relation` | Invite create (`createInvitation` body) |
| `auth.member` | `relation` | Seat (founder default + copy on accept) |

Configured in `auth.config.ts` under `organization.schema.member|invitation.additionalFields`
(@see [Better Auth — Organization Additional Fields](https://www.better-auth.com/docs/plugins/organization)).

| Field | `input` | Why |
|---|---|---|
| `invitation.relation` | `true` | Owner/member invite API may set it |
| `member.relation` | `false` | Seat holders must not self-set; hooks/SQL copy |

Accept does **not** auto-copy invitation extras onto the new member — `afterAcceptInvitation` copies `relation`. Soft-upgrade chooser suggests Practice for `EXTERNAL`, household for `FAMILY` / `CIRCLE`.

## Schema ownership (do not blur)

| Owner | Tool | Scope |
|---|---|---|
| **Better Auth** | `pn auth:migrate` | Library tables under auth managed/ mirrors (`user`, `session`, `provider`, `verification`, `two_factor`, `household`, `member`, `invitation`) including `additionalFields` |
| **MikroORM** | `pn db:gen` → `pn db:push` | Rumtelo entities (`household_settings`, money, …). Mirror entities may list BA columns for typed **reads**. |

Do **not** use Mikro `schemaGenerator.skipTables` / `skipColumns` for BA mirrors:

- `skipTables` → `db:gen` emits `DROP TABLE` for auth.member / household / …
- `skipColumns` → `db:gen` emits `DROP COLUMN` for mapped additionalFields

Enforcement: `scripts/lint/check-ba-migration-ownership.ts` fails lint if a non-initial Mikro migration SQL-alters BA-owned tables.

**Workflow when adding a BA `additionalField`:**

1. Add it in `auth.config.ts` `additionalFields`
2. `pn auth:migrate` (creates the column)
3. Map the column on the managed Mikro entity (reads)
4. `pn db:gen` — if it emits `ADD … relation`, **delete those SQL lines** from the migration (keep the snapshot update so entity ↔ snapshot stay aligned)
5. Confirm lint passes; next `db:gen` should be empty for that column

**Apply locally:** `pn db:push` runs Mikro migrations **then** `auth:migrate` (idempotent). `pn db:gen` only authors Mikro files — it does not touch the DB or BA.

Commit does **not** migrate. Push to `main`/`dev` runs the same pair in CI when migration or auth-engine paths change.

## Invite defaults

- Role: VIEWER  
- Relation: FAMILY  
- Seat caps disable roles that do not fit the plan  

## Practice

`PracticeRole.ADMIN` is a **Practice staff** role — unrelated to household seats. Real coaches still prefer Practice dual-consent. Household `EXTERNAL` is the lightweight look-along / helper path without a Practice desk.
