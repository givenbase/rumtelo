/**
 * Short labels and display names for locale switchers.
 * Keyed by {@link Locale}; intl-keyed views are derived — add a locale only on the enum + here.
 */
import { Locale, LOCALES, mapLocalesToIntl, type IntlLocale } from '@rumtelo/contracts';

/** Native / UI name — `satisfies` forces a row when {@link Locale} grows. */
export const LOCALE_LABELS = {
    [Locale.EN]: 'English',
    [Locale.NL]: 'Nederlands',
    [Locale.ES]: 'Español',
    [Locale.FR]: 'Français',
} as const satisfies Record<Locale, string>;

/** Short code shown in the switcher trigger (= contracts Locale value). */
export const LOCALE_SHORT_LABELS = mapLocalesToIntl(
    Object.fromEntries(LOCALES.map(code => [code, code])) as Record<Locale, string>
);

export const LOCALE_DISPLAY_NAMES = mapLocalesToIntl({ ...LOCALE_LABELS });

export type { IntlLocale };
