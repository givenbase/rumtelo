# Modules

Organised by **Postgres plane / who writes**, then product.
A group is a parent module that imports its children; a child is one aggregate
with its `*.entity.ts`, service, controller and module as flat siblings.

| Plane | Where | Postgres schema | Who writes |
|---|---|---|---|
| Identity | `auth/` | `auth` | library / user |
| Plumbing | `src/common/` | — | — |
| App / household | `public/` (`platform/` + `product/`) | `public` | **household / user** |
| Company catalogs | `backoffice/` | `backoffice` | **we (staff/system)** |

### Who owns the row (control split — non-negotiable)

| Control | Module | Examples |
|---|---|---|
| **Household / user writes** | `public/product/*`, `auth/user/account`, `auth/household/household-settings` | jars, txs, board settings, theme, language, which plan the household is *on* |
| **We write** | `backoffice/*` | Basic/Plus/Max **plan** catalog, countries, question bank, FAQ, coach tip **templates** (+ billing later if Stripe needs it) |
| **Library writes** | `auth/*/managed/` | sessions, members, provider credentials |

`public/platform/` is shared app runtime (coach) — **not** company catalogs. If Rumtelo authors it, it lives under `backoffice/`.

| Module | Children |
|---|---|
| `auth/` | `engine/` · `user/` · `household/` |
| `auth/user/` | `managed/` (`user` `session` `provider` `verification` `two-factor`) · `account/` (`account-settings`) |
| `auth/household/` | `managed/` (`household` `member` `invitation`) · `household-settings/` |
| `public/platform/` | `coach` |
| `public/product/` | `money/` (Geld) · `growth/` (Groei) · `energy/` (Energie) · `soul/` (Ziel) |
| `public/product/money/` | `plan/` (`jar` `income` `fixed-cost` `catalogs`) · `ledger/` · `targets/` · `month-score/` · `week-check/` · `dashboard` |
| `public/product/growth/` | `lever` `milestone` `catalogs` `learn` (`book` `progress` `focus`) |
| `public/product/energy/` | `log` |
| `public/product/soul/` | `gratitude` |
| `backoffice/` | `product/` · `plan/` · `communication/email` · reserved `reference/` |
| `backoffice/product/` | `money/` · `growth/` (mirrors `public/product/*`) |
| `backoffice/product/money/` | `template/` (jar, category) · `preset/` (fixed-cost, debt, income, goal, merchant) |
| `backoffice/product/growth/` | `preset/` (`lever`, `learn` → `book` `watch`, `asset` → `kind` + names) · `catalog/` (income-posture, wealth-stage) |

A product grows a sub-domain folder (like `money/plan/`) once it has several
aggregates that belong together — never pre-emptively. `growth`, `energy` and
`soul` stay flat under `public/product/` until they earn grouping.

### Backoffice: product vs reference + kinds

| Child | Meaning |
|---|---|
| **`product/`** | Catalogs tied to a product line (Geld, Groei, …) |
| **`reference/`** | Reserved — cross-product lookups (countries, FAQ, …) when they exist |
| **`plan/`** | Commercial tiers — `Plan` + catalog children `plan-product/`, `plan-feature/`, `plan-capability/`, `plan-capability-grant/` |
| **`communication/`** | Ops outbound email |

Under **each** `backoffice/product/{money\|growth\|…}` only these kind folders (create when used):

| Kind | Meaning |
|---|---|
| **`template/`** | We author shape; household **copies** on onboard |
| **`preset/`** | We author suggestions; household **may adopt** |
| **`catalog/`** | Taxonomy / lookup — filter & label, not copied into household rows |

### Auth plane: engine / user / household

Grouped by **concept** (person, group), not by vendor. Inside each concept the
`managed/` folder holds Better Auth's tables as read-only entity mirrors (one
folder per entity, entity file only — no module/controller, the library writes);
the sibling folders are Rumtelo aggregates with the full entity + service +
controller + module shape.

```
auth/
  engine/                  Better Auth wiring only — auth.config, access-control, migrate
  user/                    PERSON
    managed/{user,session,provider,verification,two-factor}/   ← library writes
    account/               ← ours: legal names, DOB (+ account-settings/)
  household/               GROUP
    managed/{household,member,invitation}/                     ← library writes
    household.*            ← ours: onboard, invite, list, members, current
    household-settings/    ← ours: board prefs (currency, plan, week-check)
```

- `auth/engine/` — config only, no tables
- `auth/user/managed/`, `auth/household/managed/` — better-auth owns writes; we map read entities
- `auth/user/account/` — person data + prefs (theme, locale) — **user** writes
- `auth/household/household-settings/` — board prefs — **household** writes
- `auth/household/household-billing/` — plan tier + Stripe subscription pointers — **household** writes

**IDs (do not mix):**

| Kind | Contract | Storage | Example consumers |
|---|---|---|---|
| Better Auth identity | `AuthId` / `UserId` / `HouseholdId` / `MemberId` | Postgres `uuid` (BA `generateId` → uuidv7) | `useAuth().userId`, `useAuth().householdId`, `x-household-id` |
| Rumtelo person profile | `Id` as `accountId` | Postgres `uuid` (`auth.account`) | energy/gratitude attribution, account settings |
| Rumtelo product rows | `Id` | Postgres `uuid` (BaseEntity uuidv7) | jar, transaction, goal |

Both BA and Rumtelo ids validate as `z.uuid()` and share uuidv7 minting going forward, but they are still **different id spaces**.

**Rule:** application / product person FKs on entities use **`account`** (`@ManyToOne mapToPk`); DTOs map it back as **`accountId: row.account`**. Better Auth **`userId`** stays for session, membership (`auth.member`), and the `Account.user` link. When you need profile + login fields together, resolve Account and map `account.user` (see `AccountService.ensureCurrentAccount` / `HouseholdMember`).

Frontend session field stays `activeOrganizationId` (BA SDK name); DB column is `active_household_id`.
- Jar **instances** → `public/product/money/plan/jar` — **household** writes (table in `public`)
- Jar **templates** → `backoffice/product/money/template/jar` — **we** write; onboard copies into household jars
- Product **tiers** → `backoffice/plan` — **we** write; not the same as `product/money/plan` (jars/income)
- Outbound **email** → `backoffice/communication/email` — **we** send (invites; digests later)
- Seed data for catalogs lives next to the aggregate (`…/seed/`); runners in `src/database/seeders/` mirroring backoffice (`product/money`, `product/growth`, `plan`)

`FeatureModules` registers `AuthModule`, `PublicModule`, `BackofficeModule`.

### Table naming (`entityConfig`)

Every Rumtelo-owned entity uses `entityConfig({ schema, domain?, tableName })` from
`common/database/entity-config.util.ts`:

- `auth` / `backoffice` / `public` schemas
- Domain prefixes in `public` (`money_jar`, …); auth settings (`account_settings`, `household_settings`)
- Backoffice product catalogs: `reference_{money|growth}_{table}` via `domain: 'reference', group: 'money'|'growth'` (e.g. `reference_money_jar_template`)

---

## Aggregate shape (every feature)

```
<aggregate>/
  <aggregate>.entity.ts      # PROPERTIES → [UI METADATA] → [ENUMS] → RELATIONSHIPS
  <aggregate>.service.ts     # CREATE → READ → UPDATE → DELETE
  <aggregate>.controller.ts  # same order, transport only
  <aggregate>.module.ts      # MikroOrmModule.forFeature + exports
  index.ts                   # barrel
```

Gold standard in-repo: `auth/user/account/account-settings/`.

### Helpers: `*.util.ts` vs `utils/`

Same rule as sub-domains — earn the folder, never create it pre-emptively.

| Situation | Where |
|---|---|
| One helper, one owner | loose `<name>.util.ts` beside the file that uses it (`common/database/native-enum.util.ts`, `auth/engine/auth-url.util.ts`) |
| Two or more helpers inside one module | `<module>/utils/` with an `index.ts` barrel (`backoffice/communication/email/utils/`) |
| Used by more than one module | `common/utils/` — a module never imports another module's `utils/` |

- Suffix is always singular `.util.ts` (never `.utils.ts`); constants use `.constants.ts`
- A `utils/` folder holds pure functions only — no Nest providers, no entities

### CRUD order — non-negotiable

**Create → Read → Update → Delete.** The acronym is the order. Never
`list` before `create`. Never put `onboard` / `invite` / `importCsv` /
`createCategory` after updates or deletes.

Every service and controller uses these banners, in this sequence only:

```ts
// ====================================================================
// ? CREATE Operations
// ====================================================================

// ====================================================================
// ? READ Operations
// ====================================================================

// ====================================================================
// ? UPDATE Operations
// ====================================================================

// ====================================================================
// ? DELETE Operations
// ====================================================================
```

Include a banner only when that letter has methods — but never out of order.
Private helpers sit in a final `// Private` block after all public CRUD.

| Letter | Examples |
|--------|----------|
| **C** | `create`, `add`, `onboard`, `invite`, `importCsv`, `createCategory` |
| **R** | `list`, `get`, `findOne`, `settings`, `current`, `members`, `summary`, `balances`, `inbox`, `plan`, `projections`, `history`, `feed` |
| **U** | `update`, `updateSettings`, `updateSplit`, `sort`, `dismiss`, `close`, `applySplit`, `replay`, `advance` |
| **D** | `delete`, `remove`, `deleteCategory` |

### Entity bases, naming, references

Full rules + linter (`pnpm --filter @rumtelo/backend lint:entities`): `apps/backend/docs/ENTITY_STYLE.md`.
Every entity, its base, table and relations: `apps/backend/docs/ENTITY_INVENTORY.md`.

| Base | Rows |
|---|---|
| `BaseEntity` | account, pivot entities, enum-keyed catalogs (`Plan`, `JarTemplate`) |
| `CatalogEntity` | company catalogs with `key` / `name` / `sortOrder` / `isActive` (templates, presets, catalogs, plan children) |
| `HouseholdEntity` | household-owned product + settings rows |
| `WeekCheckEntity` | the four portal week checks (`week`, `completedAt`) |

- Money → `MoneyType` (bigint eurocents, `number` at runtime); ratios stay `decimal`
- Text → `name` / `description`; catalog defaults are plain nouns (`cadence`, not `defaultCadence`)
- backoffice → backoffice = real relations (`categoryTemplate`, `audiences`, `merchantLinks`, `postures`, `minWealthStage`); household → backoffice = `*Key` snapshot (`Jar.templateKey`, `Goal.givingOrganisationKey`)
- Inverse collections: `import type` + string entity name (`@OneToMany('PlanFeature', 'product')`) — no entity import cycles

### Entity comments

```ts
/**
 * <Name> Entity
 *
 * <one paragraph>
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(...)
export class Foo extends HouseholdEntity {
    // ? PROPERTIES
    /** ... */
    @Property(...)
    bar!: string;

    // ? RELATIONSHIPS
    /** ... */
    @ManyToOne(() => Other)
    other!: Other;
}
```

### Controllers

Transport only. No business `if`. Pattern:

```ts
@Implement(contract.money.accounts.create)
create() {
    return implement(contract.money.accounts.create).handler(({ input }) =>
        this.accounts.create(input)
    );
}
```

### Cross-aggregate rules

- **Never query another aggregate's tables directly.** Import its service —
  see `public/product/money/dashboard`, which composes services rather than joining tables.
- **Household-owned entities extend `HouseholdEntity`** and are read through
  `HouseholdScopedRepository`, never `em.find` directly on those entities.
- **Money is integer minor units.** Never a float, never arithmetic on a
  decimal string. Splitting goes through `common/utils/money.util.ts`.

### Naming

No single-letter locals (`g`, `d`, `j`). Prefer domain words: `goal`, `debt`, `jar`, `row`, `preset`, `transaction` — not jargon shorthand (`tx`, `alloc`). Accumulators: `sum` / `total`. Enforced by Oxlint `id-length` in root `.oxlintrc.json` (min 2; only `_` excepted).

### Persistence (MikroORM 6)

Never use deprecated `persistAndFlush` / `removeAndFlush`:

```ts
await this.em.persist(entity).flush();
await this.em.remove(entity).flush();
```

Managed entities: mutate properties, then `await this.em.flush()`.

### Enums

- Source of truth: `@rumtelo/contracts` (`packages/contracts/src/enums/`) — ALL_CAPS.
- Entities: `@Enum(NativeEnum({ SomeEnum, domain: 'money' | 'auth' | … }))` — never local `export enum`.
- Contracts Zod: `z.enum(SomeEnum)` (Zod 4 — not `z.nativeEnum`).

### Auth vs account

- `auth/engine/` — Better Auth config; `auth/*/managed/` — better-auth owns writes; we map read entities
- `auth/user/account/` — Rumtelo-owned person rows (`account`, `account-settings`)
- Board prefs (currency, period, week-check, kind) → `auth/household/household-settings`
- Person prefs (theme, locale) → `account-settings`
- better-auth credential store table is `provider`, not `account`

### Adding a product portal

Add a child under `public/product/`, register it in `public/product/product.module.ts`.
Entities are discovered by convention — any `*.entity.ts` under `src/`
(see `mikro-orm.config.ts`); there is no registry to edit.
