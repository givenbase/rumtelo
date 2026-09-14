import type { ComponentProps } from 'react';
import Image from 'next/image';

import { BRAND_ASSETS } from './assets';

export type RumteloLogoVariant =
    | 'wordmark'
    | 'wordmarkOnLight'
    | 'wordmarkOnDark'
    | 'icon';

type ImageProps = ComponentProps<typeof Image>;

export type RumteloLogoProps = Omit<ImageProps, 'src' | 'alt' | 'width' | 'height'> & {
    /**
     * `wordmark` follows the page theme (light/dark).
     * `wordmarkOnLight` / `wordmarkOnDark` force a surface.
     * `icon` is the colorful mark (theme-independent).
     */
    variant?: RumteloLogoVariant;
    /** Accessible name — defaults to “Rumtelo”. */
    alt?: string;
    /** Intrinsic width — defaults match the SVG viewBox. */
    width?: number;
    /** Intrinsic height — defaults match the SVG viewBox. */
    height?: number;
};

/** Wordmark viewBox ≈ 349×58 */
const WORDMARK_SIZE = { width: 350, height: 58 } as const;
/** Icon mark viewBox ≈ 485×463 */
const ICON_SIZE = { width: 48, height: 46 } as const;

/**
 * Shared brand lockup — designer files in `@rumtelo/brand/assets`, served
 * from each app via `public/brand` (symlink, no duplicates).
 *
 * Default wordmark swaps on-light / on-dark via `.rumtelo-logo-*` rules in
 * `packages/config/tailwind/dark.css`.
 *
 * SVGs use `unoptimized` — Next doesn’t raster-optimize SVG.
 */
export function RumteloLogo({
    variant = 'wordmark',
    alt = 'Rumtelo',
    className,
    width,
    height,
    ...rest
}: RumteloLogoProps) {
    if (variant === 'icon') {
        return (
            <Image
                src={BRAND_ASSETS.icon}
                alt={alt}
                width={width ?? ICON_SIZE.width}
                height={height ?? ICON_SIZE.height}
                className={className}
                unoptimized
                {...rest}
            />
        );
    }

    const w = width ?? WORDMARK_SIZE.width;
    const h = height ?? WORDMARK_SIZE.height;

    if (variant === 'wordmarkOnLight') {
        return (
            <Image
                src={BRAND_ASSETS.wordmarkOnLight}
                alt={alt}
                width={w}
                height={h}
                className={className}
                unoptimized
                {...rest}
            />
        );
    }

    if (variant === 'wordmarkOnDark') {
        return (
            <Image
                src={BRAND_ASSETS.wordmarkOnDark}
                alt={alt}
                width={w}
                height={h}
                className={className}
                unoptimized
                {...rest}
            />
        );
    }

    return (
        <span className={['rumtelo-logo', 'inline-grid', className].filter(Boolean).join(' ')}>
            <Image
                src={BRAND_ASSETS.wordmarkOnLight}
                alt={alt}
                width={w}
                height={h}
                className="rumtelo-logo-on-light col-start-1 row-start-1 h-full w-auto max-w-full"
                unoptimized
                {...rest}
            />
            <Image
                src={BRAND_ASSETS.wordmarkOnDark}
                alt=""
                aria-hidden
                width={w}
                height={h}
                className="rumtelo-logo-on-dark col-start-1 row-start-1 h-full w-auto max-w-full"
                unoptimized
            />
        </span>
    );
}
