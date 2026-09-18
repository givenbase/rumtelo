# @rumtelo/backend

NestJS 11 + Fastify + oRPC + MikroORM 6 + better-auth. **ESM** — every `@orpc/*`
package ships ESM only, so CommonJS is not an option here.

```bash
pnpm --filter @rumtelo/backend dev   # :3002
```

- `src/common/` — config, database primitives, household scoping, shared utils
- `src/modules/` — plane → product → aggregate; see `src/modules/README.md`
  for CRUD shape (Create → Read → Update → Delete) and folder rules
- `src/modules/auth/` — better-auth + Rumtelo `account` (identity plane → schema `auth`)
- `src/modules/public/` — platform + product (household app → schema `public`)
- `src/modules/backoffice/` — catalogs we publish (schema `backoffice`)
- `src/banking/` — bank aggregation behind a port; null adapter by default
- `src/database/` — migrations and seeders
  - `DatabaseSeeder` orchestrates `product/{money|growth}` + `plan` catalog seeders, then `demo/DemoHouseholdSeeder`
  - Catalog seed **data** lives next to the aggregate (`modules/backoffice/product/.../seed/`)
  - Seeder runners mirror that tree under `database/seeders/`
- Swagger UI (dev): `http://localhost:3002/api/docs` — controllers use `@ControllerSwagger`
- Shared helpers: `common/database/entity-config.util.ts`, constraint → CONFLICT, `executeWithTransaction`, date/timezone utils
- Outbound email: `modules/backoffice/communication/email` (`EMAIL_PROVIDER=memory|resend`)
- System pages: `/` (dev portal), `/access-denied`, `/health*`, `/email-preview*`

Migrations only; `schema:update` is never run against a database holding money.

## Conventions (do not regress)

### Naming — no single-letter locals

```ts
// ✅
rows.map(goal => goal.target)
inbox.map(transaction => transaction.amount)

// ❌
rows.map(g => g.target)
inbox.map(tx => tx.amount) // jargon shorthand — not clear enough
```

Enforced by Oxlint `id-length` (min 2; only `_` excepted) via root `.oxlintrc.json`.
Also avoid cryptic abbreviations that pass the rule (`tx`, `alloc`, `str`) — prefer the domain word: `transaction`, `allocation`, `alias`.
`em` / `id` are fine.

### MikroORM persistence — no `*AndFlush`

MikroORM 6 deprecates `em.persistAndFlush` / `em.removeAndFlush`. Always chain:

```ts
// ✅
await this.em.persist(entity).flush();
await this.em.remove(entity).flush();

// ❌ deprecated
await this.em.persistAndFlush(entity);
await this.em.removeAndFlush(entity);
```

For already-managed entities (loaded or previously persisted), mutate then `await this.em.flush()`.

### Field naming — booleans / enums / relations / time / json

See `docs/ENTITY_STYLE.md`. Enforced by `pnpm lint:entities`:

| Kind | Pattern | Example |
|------|---------|---------|
| Boolean | `is*` / `has*` / `can*` | `isActive`, not `active` |
| Enum | noun for kind/status | `kind`, `payoffStrategy` |
| Day ordinal | `*Day` (`int`) | `dueDay`, `expectedDay` — **not** `dueDate` |
| Calendar date | `*On` (`date`) | `startedOn`, `endsOn` |
| Instant | `*At` (`timestamptz`) | `closedAt` |
| JSON array | plural | `aliases`, `unlocks` |
| JSON object | bag / `*Json` | `metadata`, `payloadJson` |
| FK (ORM relation) | relation noun | `household`, `account`, `jar` — never `householdId` on `@ManyToOne` |
| FK (scalar `@Property`) | `*Id` | `appliedRuleId` |
| Collection | plural relation | `events` |

### Enums — contracts + `NativeEnum` + Zod 4

- **Define once** in `packages/contracts/src/enums/` (ALL_CAPS keys and values). Never `export enum` inside a backend entity.
- **Zod:** `z.enum(DebtKind)` — not deprecated `z.nativeEnum(...)`.
- **MikroORM:** `@Enum(NativeEnum({ DebtKind, domain: 'money', defaultValue: DebtKind.LOAN }))` from `common/database/native-enum.util.ts`. Types live in Postgres schema `public` as `public.{domain}_{snake}` (e.g. `public.money_debt_kind`).

## Households: the isolation model

A **household** is one shared money unit — one board of jars, one week check, one
pot of money to steer. It is a better-auth organization stored as `auth.household`
(`modelName: 'household'`). A solo user is a
household of one; a couple, family or friends-investing-together group are
households of several. One person can belong to up to five households
(`organizationLimit: 5`) and switches via `activeOrganizationId` (column
`active_household_id`).

### Platform vs household-scoped data

| Concern | Location | Storage |
|---|---|---|
| Auth identity, sessions, org membership, invitations | better-auth (+ Rumtelo account) | `auth` |
| Household settings, coach, money / growth / energy / soul | `modules/public/*` | `public.*` (every household row has `household_id`) |
| Catalogs we publish (plans, jar templates, …) | `modules/backoffice/*` | `backoffice.*` |
| Enforcement | `HouseholdContextModule` interceptor + `HouseholdScopedRepository` | AsyncLocalStorage |

Postgres schemas: `auth`, `public`, `backoffice`. Product areas are code folders
under `modules/public/`, not separate DB schemas.

### How scoping is enforced

1. `HouseholdScopeInterceptor` (`common/household`) resolves the better-auth
   session per request, picks the household (`x-household-id` header → oRPC body
   → session `activeOrganizationId`), verifies membership, and stores
   `{ userId, householdId, role }` in AsyncLocalStorage.
2. `HouseholdScopedRepository` is the **single choke point** for reading and
   writing household-owned entities. It injects `householdId` from that context
   on every `find`/`create`, and `remove` refuses cross-household deletes.
   Services never call `em.find` directly on entities extending
   `HouseholdEntity`.

There is no scoping middleware: Fastify/Nest middleware runs before the route
is resolved (`req.url` is `/`), so the interceptor is the intentional and only
enforcement layer.

### Kind vs role (two different axes)

- **Role** (per member, from better-auth `member.role`): what can this person
  change? `owner`/`admin` → OWNER, `member` → MEMBER, `viewer` → VIEWER
  (read-only guest tier, defined in `src/auth/access-control.config.ts`).
  Role names are capability-neutral on purpose — "Partner", "Kid" or
  "Housemate" are UI copy driven by the household's kind, never enum values.
  Role *is* the trust level — there is no separate trust-score system.
- **Kind** (per household, `auth.household_settings.kind`): what is the
  nature of the group — `family`, `partners`, `friends`, `solo`? Kind only
  drives copy and defaults (e.g. a friends portfolio may hide energy/soul
  modules later); it never gates queries.

Households connect to people via membership; households are never linked to
other households.

### Why shared schema, not schema-per-tenant

Rumtelo's "tenant" is a household of 1–10 people sharing one budget.
Schema-per-household would mean creating/dropping a schema per signup,
N× migrations, an EntityManager fork on every request and painful
cross-household analytics — with zero product benefit at this size.

Row-level isolation (`household_id` column + `HouseholdScopedRepository` + the
interceptor) gives the guarantee with one migration path and one database.
This is deliberate; do not introduce `tenant_*` schemas or `em.fork({ schema })`.
