/**
 * Organized product icon names — documentation + typed groups.
 * Lucide accepts any kebab name at runtime; this catalog tracks what we use.
 */

/** Chrome already on Lucide — Dialog, forms, toaster, coach. */
export const PRODUCT_LUCIDE_ICONS = [
    'x',
    'calendar',
    'eye',
    'eye-off',
    'chevron-left',
    'chevron-right',
    'check',
    'chevron-down',
    'chevron-up',
    'circle',
    'circle-check',
    'info',
    'triangle-alert',
    'octagon-x',
    'loader-2',
    'mic',
    'volume-2',
] as const;

/** Former action-icons.tsx + learn accordion. */
export const ACTION_LUCIDE_ICONS = [
    'pencil',
    'clock',
    'flag',
    'circle-check',
    'refresh-cw',
    'chevron-down',
] as const;

/** Learn format filter chips / section headings. */
export const LEARN_FORMAT_LUCIDE_ICONS = [
    'book-open',
    'film',
    'tv',
    'video',
    'headphones',
    'graduation-cap',
] as const;

/** Landing jars / portals / principles / trust. */
export const LANDING_LUCIDE_ICONS = [
    'home',
    'trending-up',
    'book-open',
    'lock',
    'sparkles',
    'heart',
    'wallet',
    'compass',
    'moon',
    'shield',
    'eye',
    'database',
    'clock',
    'inbox',
    'flag',
    'users',
] as const;

/** EmptyState call sites (was emoji / unicode). */
export const EMPTY_STATE_LUCIDE_ICONS = [
    'diamond',
    'trending-up',
    'sparkles',
    'check',
    'arrow-down',
    'target',
    'moon',
    'utensils',
    'dumbbell',
] as const;

/** Reserved / registered custom keys — locale flags, partner marks. */
export const RESERVED_CUSTOM_ICONS = [
    'custom/flag-en',
    'custom/flag-nl',
    'custom/flag-es',
    'custom/flag-fr',
    'custom/masterclass',
    'custom/spotify',
] as const;

/**
 * Emoji-as-data follow-up (nav, catalogs, seeds, VendorMark).
 * Map metaphors to Lucide / custom/ in a later contracts PR — still monochrome.
 */
export const EMOJI_FOLLOWUP_NOTES = {
    nav: {
        '◇': 'diamond',
        '◈': 'hexagon',
        '↗': 'trending-up',
        '✳': 'asterisk',
        '✦': 'sparkles',
    },
    giving: {
        '🏥': 'hospital',
        '🤲': 'hand-helping',
        '📚': 'book-open',
    },
    emptyMappedThisPr: {
        '◇': 'diamond',
        '↗': 'trending-up',
        '✦': 'sparkles',
        '✓': 'check',
        '↓': 'arrow-down',
        '🎯': 'target',
        '🌙': 'moon',
        '🍽': 'utensils',
        '💪': 'dumbbell',
    },
} as const;
