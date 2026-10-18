/**
 * Translation memory, keyed by locale, dot path, and English source text.
 * A changed English sentence is a new key, so DeepL runs again for that
 * leaf only. The same English word on another path stays its own translation.
 */
import { createHash } from 'node:crypto';

/** Path is part of the key so the same English word can differ by screen. */
export function translationCacheKey(english: string, locale: string, path: string): string {
    return createHash('md5').update(`${locale}\n${path}\n${english}`).digest('hex');
}

export type LeafPlan =
    | { kind: 'use'; text: string; remember?: { key: string; text: string } }
    | { kind: 'translate'; english: string; cacheKey: string };

/**
 * Decide one leaf. `skip` means DeepL must not see it (ICU, brands).
 * An unchanged English leaf keeps the current locale string and stores it
 * in cache. A changed or new English leaf is translated.
 */
export function planLeaf(input: {
    english: string;
    locale: string;
    path: string;
    previousEnglish: string | undefined;
    existing: unknown;
    cached: string | undefined;
    override: string | undefined;
    skip: boolean;
}): LeafPlan {
    if (input.override !== undefined) return { kind: 'use', text: input.override };

    const cacheKey = translationCacheKey(input.english, input.locale, input.path);
    const sourceChanged =
        input.previousEnglish === undefined || input.previousEnglish !== input.english;
    // Unchanged English keeps this path's own locale string. Cache is not
    // consulted first — the same English word on another path must not leak in.
    if (!sourceChanged && typeof input.existing === 'string') {
        if (input.existing === input.english) return { kind: 'use', text: input.existing };
        return {
            kind: 'use',
            text: input.existing,
            remember: { key: cacheKey, text: input.existing },
        };
    }
    if (input.cached) return { kind: 'use', text: input.cached };
    if (input.skip) return { kind: 'use', text: input.english };
    return { kind: 'translate', english: input.english, cacheKey };
}
