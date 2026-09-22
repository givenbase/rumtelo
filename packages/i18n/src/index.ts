export * from './locale-metadata';
export * from './locales';
export * from './next-intl';
export { LocaleSwitcher, type LocaleChromeTone } from './locale-switcher';
export { useApiError, useApiErrorMessage, useApiErrorFallbacks } from './use-api-error';
export {
    AUTH_QUOTES_WEB,
    AUTH_QUOTES_APP,
    AUTH_SIGN_IN,
    AUTH_SIGN_UP,
    AUTH_VERIFY,
    AUTH_FORGOT_PASSWORD,
    AUTH_RESET_PASSWORD,
    BRAND_CORE,
    BRAND_TAGLINE,
    type BrandQuote,
} from './brand';

import { LocalesEnum } from './next-intl';

/** Default UI locale — English first, Dutch second. */
export const DEFAULT_LOCALE = LocalesEnum.English;
