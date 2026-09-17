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

export function jarChrome(key: string | null | undefined): {
    color: string;
    text: string;
} {
    if (key && Object.prototype.hasOwnProperty.call(JAR_CHROME, key)) {
        return JAR_CHROME[key as JarKey];
    }
    return JAR_CHROME[JarKey.NECESSITIES];
}
