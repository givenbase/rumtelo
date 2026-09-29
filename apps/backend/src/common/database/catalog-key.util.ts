/**
 * Builds `@ManyToOne` options for a household → catalog reference by **natural key**.
 *
 * Household rows never point at catalog uuids (ids differ per environment, exports
 * and deep links carry keys). They store the catalog `key` — and since MikroORM 7
 * that column is a real foreign key on `CatalogEntity.key` (`targetKey`), so:
 *
 * - Postgres rejects unknown keys from every writer (API, seeds, imports, jobs)
 * - `ON UPDATE CASCADE` — renaming a catalog key follows into household rows
 * - `ON DELETE SET NULL` (optional refs) — retiring a preset keeps the row and its
 *   name snapshot; required refs use `restrict` so the catalog row cannot vanish
 *
 * `mapToPk: true` keeps the property a plain `string` in app code, so services,
 * DTOs and seeders read / write `merchantKey = 'DEGIRO'` unchanged.
 *
 * Field name: `<catalog>Key` (`merchantKey`, `givingOrganizationKey`); lives under
 * `// ? RELATIONSHIPS` because it is one.
 *
 * @example
 * @ManyToOne(() => MerchantPreset, CatalogKey('merchant_key'))
 * merchantKey: string | null = null;
 *
 * @example
 * @ManyToOne(() => AssetKind, CatalogKey('kind_key', { required: true }))
 * kindKey!: string;
 */
export function CatalogKey(
    fieldName: string,
    options?: {
        /** Column is NOT NULL and the catalog row cannot be deleted while referenced. */
        required?: boolean;
    }
): {
    targetKey: 'key';
    mapToPk: true;
    fieldName: string;
    nullable: boolean;
    deleteRule: 'set null' | 'restrict';
    updateRule: 'cascade';
} {
    const required = options?.required === true;
    return {
        targetKey: 'key',
        mapToPk: true,
        fieldName,
        nullable: !required,
        deleteRule: required ? 'restrict' : 'set null',
        updateRule: 'cascade',
    };
}
