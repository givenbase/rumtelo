import { type AbstractIntlMessages, useTranslations as useNextIntlTranslations } from 'next-intl';
import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';

/**
 * Rumtelo locales — match `packages/i18n/languages/*.json`.
 * Product is English first; Dutch second. English stays the translation source of truth.
 */
export enum LocalesEnum {
    English = 'en',
    Dutch = 'nl',
}

export const locales = [LocalesEnum.English, LocalesEnum.Dutch] as const;

export type Locale = (typeof locales)[number];

/** Locales enabled for routing / detection / switcher. */
export const activeLocales = locales;

/** Hide locale switcher when only one locale is active. */
export const isLocaleSwitcherVisible = activeLocales.length > 1;

export type Messages = AbstractIntlMessages;

export const routing = defineRouting({
    locales: [...activeLocales],
    defaultLocale: LocalesEnum.English,
    localePrefix: 'never',
});

export const { redirect, usePathname, useRouter, Link } = createNavigation(routing);

export { useNextIntlTranslations as useTranslations };

export { useLocale } from 'next-intl';

/** Server Components — same message catalog as `useTranslations`. */
export { getTranslations } from 'next-intl/server';

/** Pass `t` into helpers without repeating `ReturnType<typeof useTranslations>`. */
export type TranslateFn = ReturnType<typeof useNextIntlTranslations>;
