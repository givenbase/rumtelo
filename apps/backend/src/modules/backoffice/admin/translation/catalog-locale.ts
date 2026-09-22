import {
    DEFAULT_INTL_LOCALE,
    toIntlLocale,
    type IntlLocale,
    type Locale,
} from '@rumtelo/contracts';

/**
 * Catalog lookup locale — same BCP-47 tags as next-intl (`en`, `nl`, …).
 * Derived from contracts {@link Locale} via {@link toIntlLocale}.
 */
export type CatalogLocale = IntlLocale;

/** Canonical copy lives on the template/preset row itself. */
export const CATALOG_SOURCE_LOCALE: CatalogLocale = DEFAULT_INTL_LOCALE;

/** Normalize account / UI locale → catalog lookup code. */
export function catalogLocaleFromContracts(
    locale: Locale | string | null | undefined
): CatalogLocale {
    return toIntlLocale(locale);
}

export function isCatalogSourceLocale(locale: Locale | string | null | undefined): boolean {
    return catalogLocaleFromContracts(locale) === CATALOG_SOURCE_LOCALE;
}
