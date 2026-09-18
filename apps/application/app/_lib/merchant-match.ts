import type { JarKey, MerchantPreset } from '@rumtelo/contracts';
import { containsWord } from '@rumtelo/utils';

/**
 * Same first-pass rules as MerchantPresetService.matchFeed (whole-word, case-insensitive).
 * Prefer longer needles so "AH TO GO" wins over bare "AH".
 */
export function matchMerchantJarKey(
    text: string,
    merchants: readonly MerchantPreset[]
): JarKey | null {
    const haystack = text.trim().toLowerCase();
    if (!haystack || merchants.length === 0) return null;

    let best: { jarKey: JarKey; length: number } | null = null;
    for (const merchant of merchants) {
        const needles = [merchant.matchValue, ...merchant.aliases]
            .map(alias => alias.trim().toLowerCase())
            .filter(Boolean);
        for (const needle of needles) {
            if (!containsWord(haystack, needle)) continue;
            if (!best || needle.length > best.length) {
                best = { jarKey: merchant.jarKey, length: needle.length };
            }
        }
    }
    return best?.jarKey ?? null;
}
