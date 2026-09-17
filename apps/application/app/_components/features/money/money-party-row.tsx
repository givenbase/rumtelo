'use client';

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
    onClick: () => void;
};

/**
 * Shared ledger / bill row: company logo, name, jar + pay-day chips, amount.
 */
export function MoneyPartyRow({
    title,
    subtitle,
    mark,
    amount,
    amountClassName,
    badges,
    onClick,
}: MoneyPartyRowProps) {
    return (
        <button
            type="button"
            aria-label={title}
            onClick={onClick}
            className="flex w-full cursor-pointer items-center gap-3 border-b border-line px-5 py-3.5 text-left last:border-b-0 hover:bg-raised">
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
            <span
                className={cn(
                    'shrink-0 font-mono text-sm whitespace-nowrap text-fg',
                    amountClassName
                )}>
                {amount}
            </span>
        </button>
    );
}
