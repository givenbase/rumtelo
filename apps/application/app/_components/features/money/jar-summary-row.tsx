'use client';

import Link from 'next/link';

import type { JarBalance } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Typography } from '@rumtelo/ui';
import { cn, jarCoverage, moneyDelta } from '@rumtelo/utils';

import { MoneyDeltaLabel } from '@/components/features/home/money-delta-label';

import { jarKeyToSlug } from '@/app/_lib/jar-slug';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

import { JarProgressBar } from './jar-progress-bar';

/** Compact jars-list row — balance fields + display chrome. */
export type JarSummaryModel = Pick<
    JarBalance,
    | 'id'
    | 'key'
    | 'name'
    | 'percentage'
    | 'allocated'
    | 'available'
    | 'spent'
    | 'credited'
    | 'committedOut'
    | 'overspent'
> & {
    color: string;
    subtitle: string;
    icon: string;
    categoryCount: number;
    /** Live-month allocation when the list is stacked. Null on the current month. */
    baselineAllocated?: number | null;
};

/**
 * Compact tappable jar row for the jars list — opens /product/money/jars/{slug}.
 */
export function JarSummaryRow({ jar }: { jar: JarSummaryModel }) {
    const t = useTranslations('features.money.jars');
    const { formatMoney } = useHouseholdCurrency();
    const coverage = jarCoverage({
        allocated: jar.allocated,
        spent: jar.spent,
        credited: jar.credited,
        committedOut: jar.committedOut,
    });
    const baseline = jar.baselineAllocated;
    const showDelta = baseline !== null && baseline !== undefined && baseline !== jar.allocated;
    const allocationDelta = showDelta ? moneyDelta(baseline, jar.allocated) : null;
    const activity =
        jar.committedOut > 0 || jar.spent > 0 || jar.credited > 0 || jar.categoryCount > 0
            ? [
                  jar.committedOut > 0
                      ? t('activity_fixed', { amount: formatMoney(jar.committedOut) })
                      : null,
                  jar.credited > 0
                      ? t('activity_added', { amount: formatMoney(jar.credited) })
                      : null,
                  jar.spent > 0 ? t('activity_spent', { amount: formatMoney(jar.spent) }) : null,
                  jar.categoryCount > 0
                      ? t('activity_categories', { count: jar.categoryCount })
                      : null,
              ]
                  .filter(Boolean)
                  .join(' · ')
            : t('summary_nothing');

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
                        <Typography as="h4" weight="semibold" className="truncate">
                            {jar.name}
                        </Typography>
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
                    {allocationDelta ? (
                        <MoneyDeltaLabel
                            className="justify-end font-mono text-xs"
                            fromLabel={formatMoney(allocationDelta.from)}
                            toLabel={formatMoney(allocationDelta.to)}
                            deltaLabel={`${allocationDelta.delta > 0 ? '+' : ''}${formatMoney(allocationDelta.delta)}`}
                        />
                    ) : (
                        <span className="font-mono text-xs text-fg-faint">
                            {t('of_amount', {
                                amount: formatMoney(jar.allocated + jar.credited),
                            })}
                        </span>
                    )}
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
