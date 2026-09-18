/**
 * Shared TypeScript string enums — source of truth for Zod (`z.enum`)
 * and Nest/MikroORM (`@Enum(NativeEnum({ …, domain }))`).
 *
 * Owned under each domain folder. This barrel exists so routers/schemas can
 * import cross-domain without long relative paths.
 * Prefer public imports via `@rumtelo/contracts/money`, `/platform`, …
 * Postgres types use NativeEnum `domain` (e.g. `money_debt_kind`) — do not
 * rename TS enums to `MoneyDebtKind`.
 */
export * from '../backoffice/plan/enums';
export * from '../backoffice/plan/capabilities';
export * from '../common/enums';
export * from '../public/product/energy/enums';
export * from '../public/product/growth/enums';
export * from '../public/product/money/enums';
export * from '../public/platform/enums';
