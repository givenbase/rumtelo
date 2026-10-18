/**
 * Manual corrections applied after machine translation (`pnpm i18n:gen`).
 *
 * Same idea as Galighticus: `languages/*.json` is generated output. A wrong
 * DeepL word is fixed here, keyed by locale and dot path. The generator
 * writes these values into `languages/<locale>.json`. Cached translations
 * are reused, so editing this file does not spend DeepL quota on unchanged
 * English.
 *
 * This file lives outside `pages/`, `common/`, `ui/` and `features/`, so it
 * is never treated as English source text.
 */
export const TRANSLATION_OVERRIDES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
    nl: {
        // Koers is a planner, not a calendar — never "agendapunt".
        'common.message.error.api.plan_item_not_found':
            'Dit onderdeel van je planning bestaat niet meer',
        'common.message.error.api.plan_period_full':
            'Drie is hier het maximum. Rond er eerst één af, verplaats er één of laat er één los.',
    },
};
