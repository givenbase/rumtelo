'use client';

import type { ReactNode } from 'react';

import { cn } from '@rumtelo/utils';

import { HelperGate } from './helper-gate';
import { CoachMark } from './helper-mark';

type CoachGuideSurfaceProps = {
    children: ReactNode;
    /** Accessible name for this coach guide. */
    label?: string;
    className?: string;
    /** Show the Coach badge (default true). */
    showMark?: boolean;
    markSize?: 'sm' | 'md';
};

/**
 * Wrap on-screen Coach guides: gated by preference + Coach mark.
 * Tip inbox still lives at /product/coach — this is the in-context coaching layer.
 */
export function CoachGuideSurface({
    children,
    label = 'The Coach',
    className,
    showMark = true,
    markSize = 'md',
}: CoachGuideSurfaceProps) {
    return (
        <HelperGate>
            <div
                className={cn('relative', className)}
                data-feature-helper
                data-coach-guide
                aria-label={label}>
                {showMark ? (
                    <div className="mb-2 flex items-center gap-2">
                        <CoachMark size={markSize} />
                    </div>
                ) : null}
                {children}
            </div>
        </HelperGate>
    );
}
