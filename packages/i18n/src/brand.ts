/**
 * Convenience constants for surfaces that are not yet on `useTranslations`
 * (SSR brand lockups). Source of truth remains `translations/features/brand.ts`
 * + `translations/features/auth.ts` — keep in sync with docs/brand/quotes.md.
 */
import auth from '../translations/features/auth';
import brand from '../translations/features/brand';

export type BrandQuote = {
    eyebrow: string;
    headline: string;
    support: string;
};

export const BRAND_TAGLINE = brand.tagline;

export const BRAND_CORE = [brand.core.one, brand.core.two, brand.core.three] as const;

/** Website auth aside — marketing / sales. */
export const AUTH_QUOTES_WEB: readonly BrandQuote[] = [
    brand.auth_quotes_web.money_picture,
    brand.auth_quotes_web.how_it_works,
    brand.auth_quotes_web.who_its_for,
    brand.auth_quotes_web.life_beyond,
];

/** Application auth aside — habit / keep using. */
export const AUTH_QUOTES_APP: readonly BrandQuote[] = [
    brand.auth_quotes_app.money_picture,
    brand.auth_quotes_app.how_it_works,
    brand.auth_quotes_app.energy,
    brand.auth_quotes_app.why,
];

export const AUTH_SIGN_IN = auth.sign_in;
export const AUTH_SIGN_UP = auth.sign_up;
export const AUTH_VERIFY = auth.verify;
export const AUTH_FORGOT_PASSWORD = auth.forgot_password;
export const AUTH_RESET_PASSWORD = auth.reset_password;
