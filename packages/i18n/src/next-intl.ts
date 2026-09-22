import { type AbstractIntlMessages, useTranslations as useNextIntlTranslations } from 'next-intl';
import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';

import { DEFAULT_INTL_LOCALE, INTL_LOCALES, type IntlLocale } from '@rumtelo/contracts';

/**
 * next-intl routing locales — derived from contracts {@link Locale} / {@link INTL_LOCALES}.
 * Do not add languages here; extend `Locale` in `@rumtelo/contracts` common.enums.
 */
export const locales = INTL_LOCALES;

export type { IntlLocale };

/** Locales enabled for routing / detection / switcher. */
export const activeLocales = locales;

/** Hide locale switcher when only one locale is active. */
export const isLocaleSwitcherVisible = activeLocales.length > 1;

export type Messages = AbstractIntlMessages;

export const routing = defineRouting({
    locales: [...activeLocales],
    defaultLocale: DEFAULT_INTL_LOCALE,
    localePrefix: 'never',
});

export const { redirect, usePathname, useRouter, Link } = createNavigation(routing);

export { useNextIntlTranslations as useTranslations };

export { useLocale } from 'next-intl';

/** Server Components — same message catalog as `useTranslations`. */
export { getTranslations } from 'next-intl/server';

/** Pass `t` into helpers without repeating `ReturnType<typeof useTranslations>`. */
export type TranslateFn = ReturnType<typeof useNextIntlTranslations>;
