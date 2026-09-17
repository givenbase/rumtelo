import type { ReactNode } from 'react';

export type TypographyAs = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'label';
export type TypographySize = 'xs' | 'sm' | 'default' | 'lg';
export type TypographyWeight = 'normal' | 'medium' | 'semibold' | 'bold';
export type TypographyColor =
    | 'default'
    | 'muted'
    | 'secondary'
    | 'primary'
    | 'destructive'
    | 'success'
    | 'warning'
    | 'white'
    | 'inherit';
export type TypographyVariant = 'default' | 'lead' | 'caption' | 'eyebrow';

interface TypographyProps {
    children?: ReactNode;
    /** HTML element to render. Defaults from `variant` when omitted. */
    as?: TypographyAs;
    size?: TypographySize;
    weight?: TypographyWeight;
    /** Theme-aware text color (`default` → foreground; flips in dark mode). */
    color?: TypographyColor;
    /** Structural recipe (lead / caption / eyebrow). Not a color. */
    variant?: TypographyVariant;
    className?: string;
    [key: string]: unknown;
}

export type { TypographyProps };
export default TypographyProps;

/** Resolve default element when `as` is omitted. */
export function defaultAsForVariant(variant: TypographyVariant = 'default'): TypographyAs {
    if (variant === 'caption') return 'span';
    if (variant === 'eyebrow' || variant === 'lead') return 'p';
    return 'p';
}

/** Resolve default size when `size` is omitted. */
export function defaultSizeFor(variant: TypographyVariant = 'default'): TypographySize {
    if (variant === 'caption' || variant === 'eyebrow') return 'xs';
    if (variant === 'lead') return 'lg';
    return 'default';
}

/** Resolve default weight when `weight` is omitted. */
export function defaultWeightFor(
    as: TypographyAs,
    size: TypographySize,
    variant: TypographyVariant = 'default'
): TypographyWeight {
    if (variant === 'eyebrow') return 'medium';
    if (as === 'label') return 'medium';
    if (as === 'h1' && size === 'lg') return 'bold';
    if (as === 'h1' || as === 'h2' || as === 'h3' || as === 'h4') return 'semibold';
    return 'normal';
}

/** Resolve default color when `color` is omitted. */
export function defaultColorFor(variant: TypographyVariant = 'default'): TypographyColor {
    if (variant === 'lead' || variant === 'caption' || variant === 'eyebrow') return 'muted';
    return 'default';
}
