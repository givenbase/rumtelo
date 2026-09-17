'use client';

import { cn } from '@rumtelo/utils';

/**
 * Static current → selected money delta (no chart).
 * `tone="grow"` greens when `to > from`; `tone="shrink-good"` greens when remaining falls.
 */
export function MoneyDeltaLabel({
    fromLabel,
    toLabel,
    deltaLabel,
    tone = 'grow',
    className,
}: {
    fromLabel: string;
    toLabel: string;
    deltaLabel?: string | null;
    tone?: 'grow' | 'shrink-good' | 'neutral';
    className?: string;
}) {
    const deltaPositive = tone === 'grow';
    const deltaClass =
        tone === 'neutral'
            ? 'text-fg-muted'
            : tone === 'shrink-good'
              ? 'text-success'
              : 'text-success';

    return (
        <span
            className={cn('inline-flex flex-wrap items-baseline gap-1.5 tabular-nums', className)}>
            <span className="text-fg-faint">{fromLabel}</span>
            <span className="text-fg-faint" aria-hidden>
                →
            </span>
            <span className="font-medium text-fg">{toLabel}</span>
            {deltaLabel ? (
                <span
                    className={cn(
                        'font-mono text-xs',
                        tone === 'neutral' ? 'text-fg-muted' : deltaClass
                    )}>
                    {deltaPositive || tone === 'shrink-good' ? deltaLabel : deltaLabel}
                </span>
            ) : null}
        </span>
    );
}
