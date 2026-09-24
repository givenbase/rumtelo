/**
 * Domain prefixes for Postgres enum types. Matches the backend module structure.
 * All PostgreSQL enum types live in the `public` schema (even when the table
 * lives in `auth` / `backoffice`). Always pass `domain` — it is the product/plane
 * of the **column** (where the row lives), not the TypeScript enum file.
 *
 * | Domain     | Module path                                      | Example PG type        |
 * |------------|--------------------------------------------------|------------------------|
 * | auth       | modules/auth                                     | auth_locale            |
 * | backoffice | modules/backoffice                               | backoffice_plan_key    |
 * | platform   | modules/public/platform                          | platform_currency      |
 * | money      | modules/public/product/money (+ backoffice money)| money_debt_kind        |
 * | energy     | modules/public/product/energy                    | energy_metric          |
 * | growth     | modules/public/product/growth                    | growth_*               |
 * | soul       | modules/public/product/soul                      | soul_*                 |
 *
 * Shared TS enums (Cadence, FlowDirection) still use the storing table’s domain.
 */
export type EnumDomain =
    | 'auth'
    | 'backoffice'
    | 'energy'
    | 'growth'
    | 'money'
    | 'platform'
    | 'soul';

const DOMAIN_PREFIXES = [
    'auth_',
    'backoffice_',
    'energy_',
    'growth_',
    'money_',
    'platform_',
    'soul_',
] as const;

/**
 * Converts a PascalCase string to snake_case, stripping a trailing `Enum` suffix
 * so that `DebtKindEnum` and `DebtKind` both produce `debt_kind`.
 */
export function toSnakeCaseEnumName(name: string): string {
    const stripped = name.endsWith('Enum') ? name.slice(0, -4) : name;
    return stripped
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');
}

/** Prefixed enum type name without schema: `money_jar_key`. */
export function nativeEnumType(domain: EnumDomain, name: string): string {
    const base = toSnakeCaseEnumName(name);
    return `${domain}_${base}`;
}

const RESERVED_KEYS = new Set(['domain', 'defaultValue', 'nullable', 'name', 'length']);

function isStringEnumRecord(value: unknown): value is Record<string, string> {
    if (typeof value !== 'object' || value === null) return false;
    for (const entry of Object.values(value)) {
        if (typeof entry !== 'string') return false;
    }
    return true;
}

/**
 * Extracts the enum reference and its PascalCase key name from the options object.
 * The enum must be the only non-reserved PascalCase key, e.g. `{ DebtKind, domain: 'money' }`.
 */
function resolveEnumEntry(obj: Record<string, unknown>): {
    enumNamePascalCase: string;
    enumRef: Record<string, string>;
} {
    const key = Object.keys(obj).find(k => !RESERVED_KEYS.has(k) && /^[A-Z][a-zA-Z0-9]*$/.test(k));
    if (!key) {
        throw new Error(
            'NativeEnum: pass the enum via shorthand, e.g. { DebtKind, domain: "money" }'
        );
    }
    const ref = obj[key];
    if (!isStringEnumRecord(ref)) {
        throw new Error(`NativeEnum: value for "${key}" must be the enum object itself`);
    }
    return { enumRef: ref, enumNamePascalCase: key };
}

/**
 * Builds MikroORM `@Enum` options — `items` + `nativeEnumName` — for a native
 * PostgreSQL enum type in the `public` schema.
 *
 * Pass the enum via ES shorthand so the key carries the name automatically.
 * Use `defaultValue` (not `default`) to avoid reserved-keyword parse issues
 * inside `experimentalDecorators`.
 *
 * **Name resolution rules (applied in order):**
 * 1. `domain` + `name` together  → `public.{domain}_{name}`
 * 2. `name` alone                → `public.{name}` (must already include a domain prefix)
 * 3. Enum name already has a recognised domain prefix → `public.{snake_case}`
 * 4. `domain` alone              → `public.{domain}_{snake_case}`
 *
 * @example
 * NativeEnum({ DebtKind, domain: 'money', defaultValue: DebtKind.LOAN })
 * // → { items: () => DebtKind, nativeEnumName: 'public.money_debt_kind', default: 'LOAN' }
 *
 * @example
 * NativeEnum({ Locale, domain: 'auth', defaultValue: Locale.NL })
 * // → { items: () => Locale, nativeEnumName: 'public.auth_locale', default: 'NL' }
 */
export function NativeEnum<T extends Record<string, string>>(options: {
    domain?: EnumDomain;
    /** Override the DB enum type name (snake_case). Combined with `domain` when both are given. */
    name?: string;
    /** MikroORM column default value. Use `defaultValue` (not `default`) to avoid parse issues. */
    defaultValue?: T[keyof T];
    /** Whether the column is nullable. */
    nullable?: boolean;
    /** Max column length for the enum value. */
    length?: number;
    /** Enum reference — provided via ES shorthand: `{ DebtKind, domain: 'money' }` */
    [enumKey: string]: boolean | number | string | T | T[keyof T] | undefined;
}): {
    default?: T[keyof T];
    /** Runtime enum object discovered from the shorthand key. */
    items: () => Record<string, string>;
    length?: number;
    nativeEnumName: string;
    nullable?: boolean;
} {
    const { domain, name: nameOverride, defaultValue, nullable, length, ...rest } = options;
    const { enumRef, enumNamePascalCase } = resolveEnumEntry(rest);

    let suffix: string;

    if (nameOverride !== undefined && domain !== undefined) {
        suffix = `${domain}_${nameOverride}`;
    } else if (nameOverride !== undefined) {
        const hasDomainPrefix = DOMAIN_PREFIXES.some(prefix => nameOverride.startsWith(prefix));
        if (!hasDomainPrefix) {
            throw new Error(
                `NativeEnum: name "${nameOverride}" has no recognised domain prefix. ` +
                    `Either prefix the name (e.g., "money_${nameOverride}") or pass domain: 'auth' | 'backoffice' | 'energy' | 'growth' | 'money' | 'platform' | 'soul'.`
            );
        }
        suffix = nameOverride;
    } else {
        const snakeCase = toSnakeCaseEnumName(enumNamePascalCase);
        const hasDomainPrefix = DOMAIN_PREFIXES.some(prefix => snakeCase.startsWith(prefix));

        if (hasDomainPrefix) {
            suffix = snakeCase;
        } else {
            if (!domain) {
                throw new Error(
                    `NativeEnum: "${enumNamePascalCase}" has no recognised domain prefix. ` +
                        `Pass domain: 'auth' | 'backoffice' | 'energy' | 'growth' | 'money' | 'platform' | 'soul'.`
                );
            }
            suffix = `${domain}_${snakeCase}`;
        }
    }

    return {
        items: () => enumRef,
        nativeEnumName: `public.${suffix}`,
        ...(defaultValue !== undefined && { ['default']: defaultValue }),
        ...(nullable !== undefined && { nullable }),
        ...(length !== undefined && { length }),
    };
}
