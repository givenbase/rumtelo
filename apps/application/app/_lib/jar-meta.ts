import { JarKey } from '@rumtelo/contracts';

/**
 * Client-only jar chrome (Tailwind token classes).
 * Names / icons / % / guide come from catalogs.jarTemplates (DB).
 */
export const JAR_CHROME: Record<JarKey, { color: string; text: string }> = {
    [JarKey.NECESSITIES]: { color: 'bg-jar-nec', text: 'text-jar-nec' },
    [JarKey.FINANCIAL_FREEDOM]: { color: 'bg-jar-ff', text: 'text-jar-ff' },
    [JarKey.LONG_TERM_SAVINGS]: { color: 'bg-jar-lts', text: 'text-jar-lts' },
    [JarKey.EDUCATION]: { color: 'bg-jar-edu', text: 'text-jar-edu' },
    [JarKey.PLAY]: { color: 'bg-jar-play', text: 'text-jar-play' },
    [JarKey.GIVE]: { color: 'bg-jar-give', text: 'text-jar-give' },
};

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
