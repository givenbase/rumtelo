/**
 * Practice chrome — shared page frame for the Practice control plane.
 * Visual language mirrors household settings / list surfaces (Eyebrow, surface cards).
 */
import type { ReactNode } from 'react';

import Link from 'next/link';

import { Eyebrow } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

export function PracticeInkCard({
    eyebrow,
    blurb,
    badge,
    children,
    className,
    bodyClassName,
}: {
    eyebrow: string;
    blurb?: ReactNode;
    badge?: ReactNode;
    children?: ReactNode;
    className?: string;
    bodyClassName?: string;
}) {
    return (
        <div
            className={cn(
                'overflow-hidden rounded-2xl border border-line bg-surface shadow-md',
                className
            )}>
            <div className="border-b border-line bg-raised/30 px-4 py-3.5 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <Eyebrow className="text-accent">{eyebrow}</Eyebrow>
                    {badge}
                </div>
                {blurb ? (
                    <p className="mt-1.5 max-w-[64ch] text-xs leading-snug text-pretty text-fg-muted">
                        {blurb}
                    </p>
                ) : null}
            </div>
            {children ? <div className={cn('px-4 sm:px-5', bodyClassName)}>{children}</div> : null}
        </div>
    );
}

export function PracticeRow({
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

export function PracticeRowLabel({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
    return (
        <span className="grid min-w-0 gap-px">
            <span className="text-sm text-fg">{title}</span>
            {sub ? (
                <span className="text-[11px] leading-snug text-pretty text-fg-muted">{sub}</span>
            ) : null}
        </span>
    );
}

export function PracticePanel({ children }: { children: ReactNode }) {
    return <div className="grid w-full gap-5">{children}</div>;
}

export function PracticePageHeader({
    title,
    blurb,
    action,
}: {
    title: string;
    blurb?: string;
    action?: ReactNode;
}) {
    return (
        <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
                <h1 className="text-[clamp(1.35rem,3vw,1.75rem)] font-semibold tracking-tight text-fg">
                    {title}
                </h1>
                {blurb ? (
                    <p className="mt-1.5 max-w-[56ch] text-sm leading-snug text-fg-muted">
                        {blurb}
                    </p>
                ) : null}
            </div>
            {action}
        </div>
    );
}

/** Compact insight tile — unique metrics, not roster duplicates. */
export function PracticeInsight({
    label,
    value,
    hint,
    href,
}: {
    label: string;
    value: ReactNode;
    hint?: string;
    href?: string;
}) {
    const inner = (
        <>
            <Eyebrow>{label}</Eyebrow>
            <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-fg tabular-nums">
                {value}
            </p>
            {hint ? <p className="mt-1 text-[11px] leading-snug text-fg-muted">{hint}</p> : null}
        </>
    );

    if (href) {
        return (
            <Link
                href={href}
                className="block rounded-2xl border border-line bg-surface p-4 shadow-sm transition-colors hover:border-accent/40 hover:bg-accent-soft/30">
                {inner}
            </Link>
        );
    }

    return <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">{inner}</div>;
}
