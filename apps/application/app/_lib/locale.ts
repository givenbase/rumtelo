/**
 * App locale helpers — contracts `Locale` is the source of truth.
 */
export {
    DEFAULT_INTL_LOCALE,
    DEFAULT_LOCALE,
    fromIntlLocale,
    toIntlLocale,
    type IntlLocale,
    Locale,
    LOCALES,
    LOCALE_TO_INTL,
} from '@rumtelo/contracts';

/** Re-export shell locale toggle — use inside authenticated layout only. */
export { useAppShell as useLocaleContext } from '@/components/features/shell/app-shell-context';
