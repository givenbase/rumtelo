import { bgClassToCssVar } from '@/app/_lib/jar-chrome';
import { jarChrome } from '@/app/_lib/jar-meta';

type CategoryChromeRow = {
    key?: string;
    name: string;
    icon: string | null;
    jarKey?: string | null;
};

/**
 * Free-text labels (demo / inbox) that should map to a category template key
 * when the display name is not an exact catalog match.
 */
const BILL_CATEGORY_ALIASES: ReadonlyArray<{ pattern: RegExp; key: string }> = [
    {
        pattern: /\brestaurants?\b|\bdining\b|\bcafe\b|\bcafé\b|\bdate\s*night\b/i,
        key: 'EATING_OUT',
    },
    { pattern: /\bgrocer/i, key: 'GROCERIES' },
    { pattern: /\bpharmacy\b|\bapotheek\b/i, key: 'PHARMACY' },
    { pattern: /\bbookstore\b|\bbooks?\b/i, key: 'BOOKS' },
    { pattern: /\bvanguard\b|\bbrokerage\b|\bindex\s*fund/i, key: 'INDEX_FUNDS' },
    { pattern: /\bairbnb\b|\bhotel\b|\btravel\b/i, key: 'TRAVEL' },
    { pattern: /\bdonation\b|\bgive\b|\bcharity\b/i, key: 'DONATIONS' },
    { pattern: /\brent\b|\bmortgage\b|\bhousing\b/i, key: 'HOUSING' },
    { pattern: /\bdebt\b|\bcredit\s*line\b|\bloan\b/i, key: 'DEBT_PAYMENTS' },
    { pattern: /\bbank\b|\bbanking\b/i, key: 'BANKING' },
];

/**
 * Intermediate VendorMark chrome when a brand logo is missing:
 * explicit icon → category-template emoji → jar emoji, tinted with jar color.
 */
export function catalogMarkChrome(opts: {
    /** Prefer this icon when set (debt kind, preset option, etc.). */
    icon?: string | null;
    /** Bill / category display name — matched to CategoryTemplate. */
    billName?: string | null;
    /** Extra free-text (description, note) for alias matching. */
    searchText?: string | null;
    /** Merchant / preset categoryTemplateKey when known. */
    categoryTemplateKey?: string | null;
    jarKey?: string | null;
    jarByKey?: Map<string, { icon: string | null }>;
    categoryTemplates?: readonly CategoryChromeRow[];
}): { fallbackIcon: string | null; tone: string | null } {
    const matched = resolveCategoryTemplate(opts);
    const jarKey = opts.jarKey ?? matched?.jarKey ?? null;
    const jarIcon = jarKey ? (opts.jarByKey?.get(jarKey)?.icon?.trim() ?? null) : null;
    return {
        fallbackIcon: opts.icon?.trim() || matched?.icon?.trim() || jarIcon,
        tone: jarKey ? bgClassToCssVar(jarChrome(jarKey).color) : null,
    };
}

function resolveCategoryTemplate(opts: {
    billName?: string | null;
    searchText?: string | null;
    categoryTemplateKey?: string | null;
    categoryTemplates?: readonly CategoryChromeRow[];
}): CategoryChromeRow | null {
    const templates = opts.categoryTemplates ?? [];
    if (templates.length === 0) return null;

    if (opts.categoryTemplateKey) {
        const byKey = templates.find(row => row.key === opts.categoryTemplateKey);
        if (byKey) return byKey;
    }

    const needle = opts.billName?.trim().toLowerCase() ?? '';
    if (needle) {
        const exact = templates.find(row => row.name.toLowerCase() === needle);
        if (exact) return exact;

        const byKeyName = templates.find(
            row => row.key && row.key.replaceAll('_', ' ').toLowerCase() === needle
        );
        if (byKeyName) return byKeyName;

        const partial = templates.find(row => {
            const name = row.name.toLowerCase();
            return (
                (needle.length >= 4 && name.includes(needle)) ||
                (name.length >= 4 && needle.includes(name))
            );
        });
        if (partial) return partial;
    }

    const haystack = [opts.billName, opts.searchText].filter(Boolean).join(' ');
    if (!haystack.trim()) return null;
    for (const alias of BILL_CATEGORY_ALIASES) {
        if (!alias.pattern.test(haystack)) continue;
        const hit = templates.find(row => row.key === alias.key);
        if (hit) return hit;
    }
    return null;
}
