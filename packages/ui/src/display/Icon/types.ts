import type { SVGAttributes } from 'react';

import type { IconName as LucideIconName } from 'lucide-react/dynamic';

export type IconSize = 'sm' | 'md' | 'lg' | 'xl';

/** Theme-aware tokens — same set as Typography. */
export type IconColor =
    | 'default'
    | 'muted'
    | 'secondary'
    | 'primary'
    | 'destructive'
    | 'success'
    | 'warning'
    | 'white'
    | 'inherit';

export type IconAppearance = 'outline' | 'filled';

/** Manual brand glyphs — must use the `custom/` prefix (never collides with Lucide). */
export type CustomIconName = `custom/${string}`;

export type IconName = CustomIconName | LucideIconName;

/** Props passed into custom registry SVG components (pixel size, not token). */
export type IconSvgProps = Omit<
    SVGAttributes<SVGSVGElement>,
    'color' | 'name' | 'size' | 'strokeWidth'
> & {
    size?: number;
    strokeWidth?: number;
    absoluteStrokeWidth?: boolean;
};

export type IconProps = Omit<
    SVGAttributes<SVGSVGElement>,
    'color' | 'name' | 'size' | 'strokeWidth'
> & {
    name: IconName;
    size?: IconSize;
    color?: IconColor;
    appearance?: IconAppearance;
    className?: string;
    strokeWidth?: number;
    absoluteStrokeWidth?: boolean;
};

export type { LucideIconName };
