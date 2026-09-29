import type { IntlLocale } from '@rumtelo/contracts';

/**
 * Every known display name for a catalog preset (EN source + seeded translations),
 * excluding the current locale’s `displayName`. Edit forms re-lock via
 * `findByNameOrAlias` when the household label was saved under another locale.
 */
export function aliasesForPresetName(
    key: string,
    displayName: string,
    sourceName: string | undefined,
    translations: Partial<Record<IntlLocale, Record<string, string>>>
): string[] {
    const names = new Set<string>();
    if (sourceName) names.add(sourceName);
    for (const localeMap of Object.values(translations)) {
        const translated = localeMap?.[key];
        if (translated) names.add(translated);
    }
    names.delete(displayName);
    return [...names];
}
