'use client';

import { createElement, forwardRef } from 'react';
import { DynamicIcon } from 'lucide-react/dynamic';

import { cn } from '@rumtelo/utils';

import { getCustomIcon, isCustomIconName } from './custom';
import iconVariants, { ICON_SIZE_PX } from './styles';
import type { IconProps, IconSize } from './types';

const OUTLINE_STROKE = 1.75;

/**
 * Shared Rumtelo icon — Lucide by kebab name, or `custom/<id>` from the local registry.
 * Size / color follow Typography tokens; appearance toggles outline vs filled.
 */
export const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
    {
        name,
        size = 'md',
        color = 'inherit',
        appearance = 'outline',
        className,
        strokeWidth,
        'aria-hidden': ariaHidden = true,
        ...rest
    },
    ref
) {
    const tokenSize: IconSize = size;
    const px = ICON_SIZE_PX[tokenSize];
    const resolvedStroke = strokeWidth ?? (appearance === 'filled' ? 0 : OUTLINE_STROKE);
    const fill = appearance === 'filled' ? 'currentColor' : 'none';
    const classes = cn(iconVariants({ size: tokenSize, color }), className);

    if (isCustomIconName(name)) {
        const Custom = getCustomIcon(name);
        if (!Custom) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn(`[Icon] Unknown custom icon: ${name}`);
            }
            return null;
        }
        // createElement avoids react(static-components) — registry lookup, not render-time component creation
        return createElement(Custom, {
            width: px,
            height: px,
            size: px,
            strokeWidth: resolvedStroke,
            fill,
            className: classes,
            'aria-hidden': ariaHidden,
            ...rest,
        });
    }

    return (
        <DynamicIcon
            ref={ref}
            name={name}
            size={px}
            strokeWidth={resolvedStroke}
            fill={fill}
            className={classes}
            aria-hidden={ariaHidden}
            {...rest}
        />
    );
});

export type {
    CustomIconName,
    IconAppearance,
    IconColor,
    IconName,
    IconProps,
    IconSize,
    IconSvgProps,
    LucideIconName,
} from './types';
export {
    ACTION_LUCIDE_ICONS,
    EMPTY_STATE_LUCIDE_ICONS,
    EMOJI_FOLLOWUP_NOTES,
    LANDING_LUCIDE_ICONS,
    PRODUCT_LUCIDE_ICONS,
    RESERVED_CUSTOM_ICONS,
} from './catalog';
export { CUSTOM_ICONS, isCustomIconName } from './custom';
export { ICON_SIZE_PX };
export { default as iconVariants } from './styles';
