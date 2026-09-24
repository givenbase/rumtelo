import type { ComponentType } from 'react';

import type { CustomIconName, IconSvgProps } from '../types';

/**
 * Manual brand glyphs. Keys **must** be `custom/<id>`.
 * Add components here when Lucide is not enough — same size/color/appearance via Icon.
 */
export const CUSTOM_ICONS = {} as const satisfies Record<never, ComponentType<IconSvgProps>>;

export type RegisteredCustomIconName = keyof typeof CUSTOM_ICONS;

export function isCustomIconName(name: string): name is CustomIconName {
    return name.startsWith('custom/');
}

export function getCustomIcon(name: CustomIconName): ComponentType<IconSvgProps> | undefined {
    return (CUSTOM_ICONS as Record<string, ComponentType<IconSvgProps>>)[name];
}
