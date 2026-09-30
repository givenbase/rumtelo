'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { VendorMark } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

type MoneyPartyRowProps = {
    title: string;
    subtitle?: string | null;
    mark: {
        name: string;
        src: string | null;
        /** Category / jar emoji when the brand logo is missing. */
        fallbackIcon?: string | null;
        /** Soft jar/category tint behind non-logo fallbacks. */
        tone?: string | null;
    };
    amount: string;
    amountClassName?: string;
    badges?: ReactNode;
    /**
     * Left of the row body (e.g. multi-select checkbox).
     * Outside the navigation hit-target.
     */
    leading?: ReactNode;
    /**
     * Right-rail control next to the amount (e.g. Due → mark paid).
     * Outside the row link so it does not navigate.
     */
    status?: ReactNode;
    /** Soft accent wash when the row is part of an active multi-select. */
    selected?: boolean;
    /** Prefer for pure navigation — enables prefetch + open-in-new-tab. */
    href?: string;
    /** Use only when navigation is conditional or follows another action. */
    onClick?: () => void;
};

/**
 * Shared ledger / bill row: company logo, name, meta chips, amount + optional status.
 */
export function MoneyPartyRow({
    title,
    subtitle,
    mark,
    amount,
    amountClassName,
    badges,
    leading,
    status,
    selected = false,
    href,
    onClick,
}: MoneyPartyRowProps) {
    const mainClass = cn(
        'flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-3.5 text-left transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent',
        selected ? 'bg-accent/8 hover:bg-accent/12' : 'hover:bg-raised',
        leading ? 'pr-5 pl-3' : 'px-5'
    );

    const main = (
        <>
            <VendorMark
                name={mark.name}
                src={mark.src}
                fallbackIcon={mark.fallbackIcon}
                tone={mark.tone}
                size={32}
                className="rounded-lg"
            />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{title}</p>
                {subtitle ? (
                    <p className="mt-0.5 truncate font-mono text-[11px] text-fg-faint">
                        {subtitle}
                    </p>
                ) : null}
                {badges ? (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{badges}</div>
                ) : null}
            </div>
        </>
    );

    return (
        <div
            className={cn(
                'flex w-full items-center border-b border-line last:border-b-0',
                selected && 'bg-accent/8'
            )}>
            {leading ? (
                <div
                    className={cn(
                        'flex shrink-0 items-center self-stretch py-3.5 pl-5',
                        selected && 'bg-accent/8'
                    )}>
                    {leading}
                </div>
            ) : null}
            {href ? (
                <Link href={href} aria-label={title} className={mainClass}>
                    {main}
                </Link>
            ) : (
                <button type="button" aria-label={title} onClick={onClick} className={mainClass}>
                    {main}
                </button>
            )}
            <div className="flex shrink-0 items-center gap-2.5 py-3.5 pr-5">
                <span
                    className={cn(
                        'min-w-[4.5rem] text-right font-mono text-sm whitespace-nowrap text-fg tabular-nums',
                        amountClassName
                    )}>
                    {amount}
                </span>
                {status !== undefined ? (
                    <div className="flex w-[7.25rem] shrink-0 justify-end">{status}</div>
                ) : null}
            </div>
        </div>
    );
}
