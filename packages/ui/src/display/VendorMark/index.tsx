'use client';

import { useState } from 'react';

import { cn } from '../../lib/utils';
import type { VendorMarkProps } from './types';

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
    }
    return (parts[0]?.slice(0, 2) || '?').toUpperCase();
}

/**
 * Compact vendor / bank mark: logo when available, lettermark fallback.
 */
export function VendorMark({ name, src, size = 20, className }: VendorMarkProps) {
    /** Remember which `src` failed so a new URL can retry without an effect. */
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const showImage = Boolean(src) && src !== failedSrc;

    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-raised ring-1 ring-line',
                className
            )}
            style={{ width: size, height: size }}
            aria-hidden
            title={name}>
            {showImage ? (
                <img
                    src={src!}
                    alt=""
                    width={size}
                    height={size}
                    className="size-full object-contain p-0.5"
                    loading="lazy"
                    decoding="async"
                    onError={() => setFailedSrc(src!)}
                />
            ) : (
                <span
                    className="font-mono font-semibold tracking-tight text-fg-muted"
                    style={{ fontSize: Math.max(8, Math.round(size * 0.42)) }}>
                    {initialsFromName(name)}
                </span>
            )}
        </span>
    );
}

export type { VendorMarkProps };
