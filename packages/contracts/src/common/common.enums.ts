/**
 * Common Enums
 * Shared string enums — single source of truth for contracts + Nest/MikroORM + i18n.
 */

export enum Cadence {
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    QUARTERLY = 'QUARTERLY',
    YEARLY = 'YEARLY',
    ONCE = 'ONCE',
}

export enum FlowDirection {
    IN = 'IN',
    OUT = 'OUT',
}

export enum Currency {
    EUR = 'EUR',
    USD = 'USD',
    GBP = 'GBP',
}

/**
 * Account / API locale — single source of truth.
 * Add a member here; maps / generate / DeepL follow from {@link LOCALES}.
 */
export enum Locale {
    EN = 'EN',
    NL = 'NL',
    ES = 'ES',
    FR = 'FR',
}

/** All locales in enum declaration order — never hand-list members in UI. */
export const LOCALES = Object.values(Locale) as [Locale, ...Locale[]];

/** next-intl / `languages/*.json` tag — lowercase of {@link Locale}. */
export type IntlLocale = Lowercase<Locale>;

export function localeToIntl(code: Locale): IntlLocale {
    return code.toLowerCase() as IntlLocale;
}

export const LOCALE_TO_INTL = Object.fromEntries(
    LOCALES.map(code => [code, localeToIntl(code)])
) as Record<Locale, IntlLocale>;

export const INTL_LOCALES = LOCALES.map(localeToIntl) as [IntlLocale, ...IntlLocale[]];

export const DEFAULT_LOCALE = Locale.EN;
export const DEFAULT_INTL_LOCALE = localeToIntl(DEFAULT_LOCALE);

/** Re-key a Locale-keyed map to intl codes (for next-intl / JSON paths). */
export function mapLocalesToIntl<T>(byLocale: Record<Locale, T>): Record<IntlLocale, T> {
    return Object.fromEntries(LOCALES.map(code => [localeToIntl(code), byLocale[code]])) as Record<
        IntlLocale,
        T
    >;
}

/** Contracts / account locale (or intl tag) → next-intl code. Unknown → EN. */
export function toIntlLocale(locale: Locale | string | null | undefined): IntlLocale {
    if (locale === null || locale === undefined || locale === '') return DEFAULT_INTL_LOCALE;
    const raw = (typeof locale === 'string' ? locale : localeToIntl(locale)).trim();
    const upper = raw.toUpperCase();
    if ((LOCALES as readonly string[]).includes(upper)) {
        return localeToIntl(upper as Locale);
    }
    const primary = raw.toLowerCase().split(/[-_]/)[0] ?? '';
    if ((INTL_LOCALES as readonly string[]).includes(primary)) {
        return primary as IntlLocale;
    }
    return DEFAULT_INTL_LOCALE;
}

/** next-intl / document lang → contracts {@link Locale}. Unknown → EN. */
export function fromIntlLocale(intl: string | null | undefined): Locale {
    if (intl === null || intl === undefined || intl === '') return DEFAULT_LOCALE;
    const primary = intl.trim().toLowerCase().split(/[-_]/)[0] ?? '';
    const upper = primary.toUpperCase();
    if ((LOCALES as readonly string[]).includes(upper)) {
        return upper as Locale;
    }
    return DEFAULT_LOCALE;
}

export enum Theme {
    LIGHT = 'LIGHT',
    DARK = 'DARK',
    SYSTEM = 'SYSTEM',
}

/** Monthly-equivalent multipliers for normalising cadences. */
export const CADENCE_TO_MONTHLY: Record<Cadence, number> = {
    [Cadence.WEEKLY]: 52 / 12,
    [Cadence.MONTHLY]: 1,
    [Cadence.QUARTERLY]: 1 / 3,
    [Cadence.YEARLY]: 1 / 12,
    [Cadence.ONCE]: 0,
};
