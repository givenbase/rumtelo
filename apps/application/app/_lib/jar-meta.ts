import { JarKey } from '@rumtelo/contracts';

/**
 * Client-only jar chrome (Tailwind token classes).
 * Names / % / guide come from catalogs.jarTemplates (DB) when a household exists.
 * Icons match the catalog seed — use as fallback when the catalog is not loaded yet.
 */
export const JAR_CHROME: Record<JarKey, { color: string; text: string }> = {
    [JarKey.NECESSITIES]: { color: 'bg-jar-nec', text: 'text-jar-nec' },
    [JarKey.FINANCIAL_FREEDOM]: { color: 'bg-jar-ff', text: 'text-jar-ff' },
    [JarKey.LONG_TERM_SAVINGS]: { color: 'bg-jar-lts', text: 'text-jar-lts' },
    [JarKey.EDUCATION]: { color: 'bg-jar-edu', text: 'text-jar-edu' },
    [JarKey.PLAY]: { color: 'bg-jar-play', text: 'text-jar-play' },
    [JarKey.GIVE]: { color: 'bg-jar-give', text: 'text-jar-give' },
};

/** Same emoji as `JAR_TEMPLATE_SEED` — keep in sync with the catalog seed. */
export const JAR_ICONS: Record<JarKey, string> = {
    [JarKey.NECESSITIES]: '🏠',
    [JarKey.FINANCIAL_FREEDOM]: '🔒',
    [JarKey.LONG_TERM_SAVINGS]: '🎯',
    [JarKey.EDUCATION]: '📚',
    [JarKey.PLAY]: '✨',
    [JarKey.GIVE]: '🤲',
};

export function jarIcon(key: string | null | undefined, catalogIcon?: string | null): string {
    if (catalogIcon) return catalogIcon;
    if (key && key in JAR_ICONS) return JAR_ICONS[key as JarKey];
    return JAR_ICONS[JarKey.NECESSITIES];
}

const JAR_KEYS = new Set<string>(Object.values(JarKey));

function isJarKey(value: string): value is JarKey {
    return JAR_KEYS.has(value);
}

export function jarChrome(key: string | null | undefined): {
    color: string;
    text: string;
} {
    if (key && isJarKey(key)) return JAR_CHROME[key];
    return JAR_CHROME[JarKey.NECESSITIES];
}
