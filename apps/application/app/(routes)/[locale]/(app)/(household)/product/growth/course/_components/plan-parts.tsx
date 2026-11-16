'use client';

import type { ReactNode } from 'react';

import { Icon } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

/**
 * A large, calm choice: title, one line of help and a check when picked. A real toggle
 * button (`aria-pressed`) so it works with keyboard and screen readers, and so picking it
 * again lets go.
 */
export function PlanChoiceCard({
    title,
    hint,
    selected,
    onClick,
    dashed = false,
}: {
    title: string;
    hint?: string;
    selected: boolean;
    onClick: () => void;
    /** A "write my own" card: same shape, dashed edge. */
    dashed?: boolean;
}) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onClick}
            className={cn(
                'flex min-h-20 w-full flex-col items-start gap-1 rounded-3xl border p-4 text-left transition-colors sm:p-5',
                FOCUS,
                dashed && 'border-2 border-dashed',
                selected
                    ? 'border-accent bg-accent-soft'
                    : 'border-line bg-card hover:border-line-strong'
            )}>
            <span className="flex w-full items-start justify-between gap-3">
                <span className="text-base leading-snug font-semibold text-fg">{title}</span>
                <span
                    aria-hidden
                    className={cn(
                        'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border',
                        selected
                            ? 'border-accent bg-accent text-on-accent'
                            : 'border-line-strong text-transparent'
                    )}>
                    <Icon name={dashed ? 'plus' : 'check'} size="sm" className="size-3" />
                </span>
            </span>
            {hint ? <span className="text-sm text-fg-muted">{hint}</span> : null}
        </button>
    );
}

/** A small toggle chip (an area, a scope). */
export function PlanChip({
    label,
    selected,
    onClick,
}: {
    label: string;
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onClick}
            className={cn(
                'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors',
                FOCUS,
                selected
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line bg-card text-fg-secondary hover:border-line-strong'
            )}>
            {selected ? <Icon name="check" size="sm" className="size-3.5" aria-hidden /> : null}
            {label}
        </button>
    );
}

/** A group of choices with a visible label. */
export function PlanGroup({
    id,
    label,
    hint,
    children,
}: {
    id: string;
    label: string;
    hint?: string;
    children: ReactNode;
}) {
    return (
        <div role="group" aria-labelledby={id} className="grid gap-3">
            <div className="grid gap-0.5">
                <p id={id} className="text-base font-semibold text-fg">
                    {label}
                </p>
                {hint ? <p className="text-sm text-fg-muted">{hint}</p> : null}
            </div>
            {children}
        </div>
    );
}
