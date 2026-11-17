import { Locale } from '@rumtelo/contracts';

/**
 * Names stored when the person gave none. They are data, not UI: written once in the
 * creator's language at onboard and renamed later like any other name.
 */
const MAIN_ACCOUNT_NAME: Record<Locale, string> = {
    [Locale.EN]: 'Main account',
    [Locale.NL]: 'Hoofdrekening',
    [Locale.ES]: 'Cuenta principal',
    [Locale.FR]: 'Compte principal',
};

const DEFAULT_HOUSEHOLD_NAME: Record<Locale, string> = {
    [Locale.EN]: 'My household',
    [Locale.NL]: 'Mijn huishouden',
    [Locale.ES]: 'Mi hogar',
    [Locale.FR]: 'Mon foyer',
};

/** The one account every new household starts with (no bank, no IBAN). */
export function mainAccountName(locale: Locale): string {
    return MAIN_ACCOUNT_NAME[locale] ?? MAIN_ACCOUNT_NAME[Locale.EN];
}

/** Household name when the client sent none or a blank one. */
export function defaultHouseholdName(locale: Locale): string {
    return DEFAULT_HOUSEHOLD_NAME[locale] ?? DEFAULT_HOUSEHOLD_NAME[Locale.EN];
}
