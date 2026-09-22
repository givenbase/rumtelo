import { Locale, toIntlLocale } from '@rumtelo/contracts';
import { locales } from '@rumtelo/i18n';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

/**
 * Resolve locale for Server Components / next-intl APIs.
 *
 * Uses `requestLocale` (middleware / segment), not `next/root-params`:
 * root-params has no exports in the proxy/middleware graph and breaks
 * `createNavigation` when `@rumtelo/i18n` is imported from `proxy.ts`.
 */
export default getRequestConfig(async ({ locale, requestLocale }) => {
    const fallback = toIntlLocale(Locale.NL);
    // Prefer an explicit override (Server Actions / Route Handlers).
    if (!locale) {
        const paramValue = await requestLocale;
        locale = hasLocale(locales, paramValue) ? paramValue : fallback;
    } else if (!hasLocale(locales, locale)) {
        locale = fallback;
    }

    return {
        locale,
        messages: (await import(`../../../packages/i18n/languages/${locale}.json`)).default,
        timeZone: 'Europe/Amsterdam',
    };
});
