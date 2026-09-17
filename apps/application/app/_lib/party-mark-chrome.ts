import { bgClassToCssVar } from '@/app/_lib/jar-chrome';
import { jarChrome } from '@/app/_lib/jar-meta';

/**
 * Intermediate VendorMark chrome when a brand logo is missing:
 * category-template emoji → jar emoji, tinted with jar color.
 */
export function catalogMarkChrome(opts: {
    /** Bill / category display name — matched to CategoryTemplate.name. */
    billName?: string | null;
    jarKey?: string | null;
    jarByKey?: Map<string, { icon: string | null }>;
    categoryTemplates?: readonly { name: string; icon: string | null }[];
}): { fallbackIcon: string | null; tone: string | null } {
    const needle = opts.billName?.trim().toLowerCase() ?? '';
    const categoryIcon = needle
        ? (opts.categoryTemplates?.find(row => row.name.toLowerCase() === needle)?.icon?.trim() ??
          null)
        : null;
    const jarIcon = opts.jarKey ? (opts.jarByKey?.get(opts.jarKey)?.icon?.trim() ?? null) : null;
    return {
        fallbackIcon: categoryIcon || jarIcon,
        tone: opts.jarKey ? bgClassToCssVar(jarChrome(opts.jarKey).color) : null,
    };
}
