'use client';

import type { ReactNode } from 'react';

import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

type JarMonthPotAmountsProps = {
    available: number;
    potBalance: number;
    overspent?: boolean;
    /**
     * `line` — third muted line under “of …” (home drilldown — strak).
     * `inline` — pot badge beside “of …” (avoid on dense grids).
     * `none` — month only; caller shows pot elsewhere (e.g. list footer).
     * `stack` — labeled blocks (detail-style).
     */
    pot?: 'line' | 'inline' | 'none' | 'stack';
    className?: string;
    /** Optional middle line (e.g. “of €X” or period delta). */
    children?: ReactNode;
};

/** Compact pot pill — accent so it doesn’t blend with other meta badges. */
export function JarPotBadge({ amount, className }: { amount: number; className?: string }) {
    const t = useTranslations('features.money.jars');
    const { formatMoney } = useHouseholdCurrency();
    const formatted = formatMoney(amount);

    return (
        <span
            className={cn(
                'inline-flex max-w-full items-center gap-1 rounded-full border border-accent/45 bg-accent-soft px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-wide text-accent sm:px-2 sm:text-xs',
                className
            )}
            aria-label={t('in_pot_amount', { amount: formatted })}>
            <span className="uppercase" aria-hidden>
                {t('in_pot_short')}
            </span>
            <span className="tabular-nums" aria-hidden>
                {formatted}
            </span>
        </span>
    );
}

/**
 * Month envelope (+ optional pot).
 * Amounts come from the API (`available` / `potBalance`); no client-side pot math.
 */
export function JarMonthPotAmounts({
    available,
    potBalance,
    overspent = false,
    pot = 'line',
    className,
    children,
}: JarMonthPotAmountsProps) {
    const t = useTranslations('features.money.jars');
    const { formatMoney } = useHouseholdCurrency();
    const potLine = t('in_pot_amount', { amount: formatMoney(potBalance) });

    if (pot === 'stack') {
        return (
            <div
                className={cn(
                    'w-auto max-w-[48%] shrink-0 text-right tabular-nums sm:max-w-none sm:min-w-[7.5rem]',
                    className
                )}>
                <div className="grid justify-items-end gap-1">
                    <div>
                        <p className="font-mono text-xs tracking-wide text-fg-muted uppercase">
                            {t('this_month')}
                        </p>
                        <p
                            className={cn(
                                'font-mono text-sm font-medium sm:text-base',
                                overspent ? 'text-danger' : 'text-fg'
                            )}>
                            {formatMoney(available)}
                        </p>
                    </div>
                    {children}
                    <JarPotBadge amount={potBalance} />
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'w-auto max-w-[46%] shrink-0 text-right tabular-nums sm:max-w-none sm:min-w-[7.5rem]',
                className
            )}>
            <div className="grid min-w-0 justify-items-end gap-0.5">
                <p
                    className={cn(
                        'font-mono text-sm leading-none font-medium',
                        overspent ? 'text-danger' : 'text-fg'
                    )}>
                    {formatMoney(available)}
                </p>
                {pot === 'inline' ? (
                    <div className="flex max-w-full flex-wrap items-center justify-end gap-x-1.5 gap-y-0.5">
                        {children}
                        <JarPotBadge amount={potBalance} />
                    </div>
                ) : (
                    <>
                        {children ? (
                            <div className="max-w-full truncate font-mono text-[11px] leading-tight text-fg-muted sm:text-xs">
                                {children}
                            </div>
                        ) : null}
                        {pot === 'line' ? (
                            <p className="max-w-full truncate font-mono text-[11px] leading-tight text-fg-faint">
                                {potLine}
                            </p>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    );
}
