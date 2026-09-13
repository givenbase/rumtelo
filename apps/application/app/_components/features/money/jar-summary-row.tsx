'use client';

import Link from 'next/link';

import { cn, jarCoverage } from '@rumtelo/utils';

import { jarKeyToSlug } from '@/app/_lib/jar-slug';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

import { JarProgressBar } from './jar-progress-bar';

export type JarSummaryModel = {
    id: string;
    key: string;
    name: string;
    subtitle: string;
    icon: string;
    color: string;
    percentage: number;
    allocated: number;
    available: number;
    spent: number;
    credited: number;
    committedOut: number;
    overspent: boolean;
    categoryCount: number;
};

/**
 * Compact tappable jar row for the jars list — opens /product/money/jars/{slug}.
 */
export function JarSummaryRow({ jar }: { jar: JarSummaryModel }) {
    const { formatMoney } = useHouseholdCurrency();
    const coverage = jarCoverage({
        allocated: jar.allocated,
        spent: jar.spent,
        credited: jar.credited,
        committedOut: jar.committedOut,
    });
    const activity =
        jar.committedOut > 0 || jar.spent > 0 || jar.credited > 0
            ? [
                  jar.committedOut > 0 ? `${formatMoney(jar.committedOut)} fixed` : null,
                  jar.credited > 0 ? `${formatMoney(jar.credited)} added` : null,
                  jar.spent > 0 ? `${formatMoney(jar.spent)} spent` : null,
                  jar.categoryCount > 0 ? `${jar.categoryCount} categories` : null,
              ]
                  .filter(Boolean)
                  .join(' · ')
            : 'Nothing planned or spent this month';

    return (
        <Link
            href={`/product/money/jars/${jarKeyToSlug(jar.key)}`}
            className="grid gap-2 rounded-xl border border-line bg-card px-4 py-3.5 transition-colors hover:border-line-strong hover:bg-raised">
            <span className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-raised text-base">
                    {jar.icon}
                </span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="truncate font-display text-base font-semibold text-fg">
                            {jar.name}
                        </span>
                        <span className="font-mono text-xs text-fg-faint">{jar.percentage}%</span>
                    </span>
                    <span className="truncate font-mono text-xs tracking-wide text-fg-faint uppercase">
                        {jar.subtitle}
                    </span>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                    <span
                        className={cn(
                            'block font-mono text-sm',
                            coverage.overspent ? 'text-danger' : 'text-fg'
                        )}>
                        {formatMoney(coverage.available)}
                    </span>
                    <span className="font-mono text-xs text-fg-faint">
                        of {formatMoney(jar.allocated + jar.credited)}
                    </span>
                </span>
                <span className="shrink-0 text-xs text-fg-faint" aria-hidden>
                    ›
                </span>
            </span>

            <JarProgressBar
                allocated={jar.allocated}
                spent={jar.spent}
                credited={jar.credited}
                committedOut={jar.committedOut}
                colorClass={jar.color}
            />

            <span className="font-mono text-xs text-fg-faint">{activity}</span>
        </Link>
    );
}
