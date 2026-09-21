'use client';

import { cn } from '@rumtelo/utils';

type CoachMarkProps = {
    className?: string;
    /** Compact chip for tight rows (why-line). */
    size?: 'sm' | 'md';
};

/**
 * Badge that marks on-screen tips from The Coach (why-lines, jar cards).
 * Same voice as /product/coach — informatie, nooit schaamte.
 */
export function CoachMark({ className, size = 'md' }: CoachMarkProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 font-mono font-bold tracking-[0.12em] text-accent uppercase',
                size === 'sm' ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-0.5 text-[9px]',
                className
            )}
            title="From The Coach — turn on-screen tips on or off in Settings → Account">
            <span aria-hidden>✦</span>
            The Coach
        </span>
    );
}
