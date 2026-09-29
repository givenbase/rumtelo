/**
 * Builds MikroORM `@Property` options for a Postgres **jsonb** column.
 *
 * Prefer this over `{ type: 'json' }` — Rumtelo stores jsonb; `json` drifts the
 * schema snapshot and re-emits alter noise on every `db:gen`.
 *
 * Empty-array SQL defaults must use `emptyArray: true` (emits `defaultRaw`),
 * not `default: []` — MikroORM cannot emit a stable SQL default from a JS array.
 * Keep `= []` on the field for the runtime default.
 *
 * @example
 * @Property(Jsonb())
 * capabilities!: JarCapabilities;
 *
 * @example
 * @Property(Jsonb({ emptyArray: true }))
 * spendingStyles: SpendingStyle[] = [];
 *
 * @example
 * @Property(Jsonb({ nullable: true }))
 * guide: JarGuide | null = null;
 */
export function Jsonb(options?: {
    /** Whether the column is nullable. */
    nullable?: boolean;
    /** Stable SQL default `'[]'::jsonb`. Pair with `= []` on the field. */
    emptyArray?: boolean;
}): {
    type: 'jsonb';
    nullable?: boolean;
    defaultRaw?: string;
} {
    const { nullable, emptyArray } = options ?? {};
    return {
        type: 'jsonb',
        ...(nullable !== undefined && { nullable }),
        ...(emptyArray === true && { defaultRaw: `'[]'::jsonb` }),
    };
}
