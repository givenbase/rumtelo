import type { ElementType } from 'react';

import { cn } from '@rumtelo/utils';

import type TypographyProps from './types';
import { defaultAsForVariant, defaultColorFor, defaultSizeFor, defaultWeightFor } from './types';

import typographyVariants from './styles';

/**
 * Shared Rumtelo typography primitive.
 * Font family is automatic from `as` / `variant` (display · sans · mono).
 * Colors are theme-aware (`default` → foreground flips in dark mode).
 */
export function Typography({
    children,
    as,
    size,
    weight,
    color,
    variant = 'default',
    className,
    ...props
}: TypographyProps) {
    const resolvedAs = as ?? defaultAsForVariant(variant);
    const resolvedSize = size ?? defaultSizeFor(variant);
    const resolvedWeight = weight ?? defaultWeightFor(resolvedAs, resolvedSize, variant);
    const resolvedColor = color ?? defaultColorFor(variant);
    const Tag = resolvedAs as ElementType;

    return (
        <Tag
            className={cn(
                typographyVariants({
                    as: resolvedAs,
                    size: resolvedSize,
                    weight: resolvedWeight,
                    color: resolvedColor,
                    variant,
                }),
                className
            )}
            {...props}>
            {children}
        </Tag>
    );
}

export { typographyVariants };
export type {
    TypographyAs,
    TypographyColor,
    TypographyProps,
    TypographySize,
    TypographyVariant,
    TypographyWeight,
} from './types';
