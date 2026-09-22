/**
 * App locale bridges — thin re-exports from contracts (source of truth).
 */
import {
    DEFAULT_INTL_LOCALE,
    DEFAULT_LOCALE,
    fromIntlLocale,
    INTL_LOCALES,
    Locale,
    LOCALES,
    LOCALE_TO_INTL,
    mapLocalesToIntl,
    toIntlLocale,
    type IntlLocale,
} from '@rumtelo/contracts';

export {
    DEFAULT_INTL_LOCALE,
    DEFAULT_LOCALE,
    fromIntlLocale,
    INTL_LOCALES,
    Locale,
    LOCALES,
    LOCALE_TO_INTL,
    mapLocalesToIntl,
    toIntlLocale,
    type IntlLocale,
};

/** App locale → ISO 3166-1 alpha-2 (seed / reference). Add rows when {@link Locale} grows. */
const LOCALE_ISO2 = {
    [Locale.EN]: 'US',
    [Locale.NL]: 'NL',
    [Locale.ES]: 'ES',
    [Locale.FR]: 'FR',
} as const satisfies Record<Locale, string>;

export const LOCALE_TO_ISO2 = mapLocalesToIntl({ ...LOCALE_ISO2 });
