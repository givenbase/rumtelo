import type { ReactNode } from 'react';

import { cn } from '@rumtelo/utils';

/** Ink-style settings card — header + stacked rows (compact). */
export function SettingsInkCard({
    eyebrow,
    blurb,
    badge,
    children,
    className,
}: {
    eyebrow: string;
    blurb?: ReactNode;
    badge?: ReactNode;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'overflow-hidden rounded-xl border border-line bg-surface shadow-sm',
                className
            )}>
            <div className="border-b border-line px-3.5 py-3 sm:px-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-[10px] font-medium tracking-[0.14em] text-accent uppercase">
                        {eyebrow}
                    </p>
                    {badge}
                </div>
                {blurb ? (
                    <p className="mt-1 max-w-[64ch] text-xs leading-snug text-pretty text-fg-muted">
                        {blurb}
                    </p>
                ) : null}
            </div>
            {children ? <div className="px-3.5 sm:px-4">{children}</div> : null}
        </div>
    );
}

export function SettingsRow({
    children,
    className,
    last = false,
}: {
    children: ReactNode;
    className?: string;
    last?: boolean;
}) {
    return (
        <div
            className={cn(
                'flex flex-wrap items-center justify-between gap-2 py-2.5',
                !last && 'border-b border-line',
                className
            )}>
            {children}
        </div>
    );
}

export function SettingsRowLabel({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
    return (
        <span className="grid min-w-0 gap-px">
            <span className="text-sm text-fg">{title}</span>
            {sub ? (
                <span className="text-[11px] leading-snug text-pretty text-fg-muted">{sub}</span>
            ) : null}
        </span>
    );
}

export function SettingsPill({
    children,
    tone = 'neutral',
    className,
}: {
    children: ReactNode;
    tone?: 'neutral' | 'accent' | 'success' | 'danger';
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] font-medium tracking-widest uppercase',
                tone === 'accent' && 'border-accent/40 text-accent',
                tone === 'success' && 'border-success/40 text-success',
                tone === 'danger' && 'border-danger/40 text-danger',
                tone === 'neutral' && 'border-line text-fg-secondary',
                className
            )}>
            {children}
        </span>
    );
}

export function SettingsPanel({ children }: { children: ReactNode }) {
    return <div className="grid w-full gap-3">{children}</div>;
}
