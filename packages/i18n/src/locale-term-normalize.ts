/**
 * Product-term rewrites after generate / DeepL.
 * English sources stay in `translations/`; locale JSON is generated.
 *
 * NL: prefer “vaste kosten” over “vaste last(en)” (and woonkosten over woonlasten).
 */

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

const NL_LAST_TO_KOST: ReadonlyArray<readonly [RegExp, string]> = [
    [/\bVaste lasten\b/g, 'Vaste kosten'],
    [/\bvaste lasten\b/g, 'vaste kosten'],
    [/\bVaste last\b/g, 'Vaste kosten'],
    [/\bvaste last\b/g, 'vaste kosten'],
    [/\bWoonlasten\b/g, 'Woonkosten'],
    [/\bwoonlasten\b/g, 'woonkosten'],
];

export function normalizeLocaleTerms(locale: string, tree: Json): Json {
    if (locale !== 'nl') return tree;
    return rewriteJson(tree, value => {
        let next = value;
        for (const [pattern, replacement] of NL_LAST_TO_KOST) {
            next = next.replace(pattern, replacement);
        }
        return next;
    });
}

function rewriteJson(node: Json, mapString: (value: string) => string): Json {
    if (typeof node === 'string') return mapString(node);
    if (Array.isArray(node)) return node.map(item => rewriteJson(item, mapString));
    if (!node || typeof node !== 'object') return node;
    const out: Record<string, Json> = {};
    for (const [key, value] of Object.entries(node)) {
        out[key] = rewriteJson(value, mapString);
    }
    return out;
}
