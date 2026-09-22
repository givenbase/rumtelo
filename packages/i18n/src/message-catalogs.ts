/**
 * Sync message catalogs for surfaces that cannot async-import (e.g. global-error).
 * `satisfies Record<IntlLocale, …>` fails the build when a locale is added without a JSON file.
 */
import type { IntlLocale } from '@rumtelo/contracts';

import en from '../languages/en.json';
import es from '../languages/es.json';
import fr from '../languages/fr.json';
import nl from '../languages/nl.json';

export const MESSAGE_CATALOGS = {
    en,
    nl,
    es,
    fr,
} as const satisfies Record<IntlLocale, typeof en>;
