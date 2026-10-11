'use client';

import type { ReactNode } from 'react';

import { cn } from '@rumtelo/utils';

export type MetricStripItem = {
    label: string;
    value: ReactNode;
    /** Optional subline under the value. */
    hint?: ReactNode;
    tone?: 'default' | 'accent' | 'success' | 'danger' | 'muted';
};

const VALUE_TONE: Record<NonNullable<MetricStripItem['tone']>, string> = {
    default: 'text-fg',
    accent: 'text-accent',
    success: 'text-success',
    danger: 'text-danger',
    muted: 'text-fg-secondary',
};

function gridClass(count: number): string {
    if (count >= 5) return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5';
    if (count === 4) return 'grid-cols-2 sm:grid-cols-4';
    if (count === 3) return 'grid-cols-1 sm:grid-cols-3';
    if (count === 1) return 'grid-cols-1';
    return 'grid-cols-2';
}

/** Column counts per breakpoint — keep in sync with {@link gridClass}. */
function colsAt(count: number): { mobile: number; sm: number; lg: number } {
    if (count >= 5) return { mobile: 2, sm: 3, lg: 5 };
    if (count === 4) return { mobile: 2, sm: 4, lg: 4 };
    if (count === 3) return { mobile: 1, sm: 3, lg: 3 };
    if (count === 1) return { mobile: 1, sm: 1, lg: 1 };
    return { mobile: 2, sm: 2, lg: 2 };
}

function cellBorders(index: number, count: number): string {
    const { mobile, sm, lg } = colsAt(count);
    return cn(
        // Mobile
        index % mobile !== 0 && 'border-l border-line',
        index >= mobile && 'border-t border-line',
        // sm+
        'sm:border-t-0 sm:border-l-0',
        index % sm !== 0 && 'sm:border-l sm:border-line',
        index >= sm && 'sm:border-t sm:border-line',
        // lg+ (only differs when count >= 5)
        count >= 5 && 'lg:border-t-0 lg:border-l-0',
        count >= 5 && index % lg !== 0 && 'lg:border-l lg:border-line',
        count >= 5 && index >= lg && 'lg:border-t lg:border-line'
    );
}

/**
 * Equal-column money/context metrics with hairline separators —
 * same language as goal jar-context / kluis side stats.
 */
export function MetricStrip({
    items,
    className,
    /** Slightly larger figures (summary heroes). */
    size = 'md',
}: {
    items: readonly MetricStripItem[];
    className?: string;
    size?: 'md' | 'lg';
}) {
    if (items.length === 0) return null;

    const pair = items.length === 2;

    return (
        <dl className={cn('grid border-t border-line', gridClass(items.length), className)}>
            {items.map((item, index) => {
                const endAnchor = pair && index === 1;
                return (
                    <div
                        key={item.label}
                        className={cn(
                            'min-w-0 px-4 py-3.5 sm:px-5 sm:py-4',
                            cellBorders(index, items.length),
                            endAnchor && 'text-right'
                        )}>
                        <dt className="font-mono text-[10px] tracking-wide text-fg-muted uppercase">
                            {item.label}
                        </dt>
                        <dd
                            className={cn(
                                'mt-1.5 font-display font-semibold tracking-tight tabular-nums',
                                size === 'lg' ? 'text-2xl leading-none sm:text-3xl' : 'text-xl',
                                VALUE_TONE[item.tone ?? 'default']
                            )}>
                            {item.value}
                        </dd>
                        {item.hint ? (
                            <p className="mt-1 font-mono text-[10px] leading-snug text-fg-faint">
                                {item.hint}
                            </p>
                        ) : null}
                    </div>
                );
            })}
        </dl>
    );
}
