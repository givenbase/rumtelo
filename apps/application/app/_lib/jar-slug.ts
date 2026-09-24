import { JarKey } from '@rumtelo/contracts';

const JAR_KEYS = new Set<string>(Object.values(JarKey));

function isJarKey(value: string): value is JarKey {
    return JAR_KEYS.has(value);
}

/** Route slug for jar detail pages — NECESSITIES → necessities. */
export function jarKeyToSlug(key: string): string {
    return key.toLowerCase().replaceAll('_', '-');
}

/** Parse `/jars/[jarKey]` slug back to JarKey enum member. */
export function slugToJarKey(slug: string): JarKey | null {
    const normalised = slug.trim().toUpperCase().replaceAll('-', '_');
    return isJarKey(normalised) ? normalised : null;
}
