'use client';

import Link from 'next/link';

import type { JarBalance } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Typography } from '@rumtelo/ui';
import { jarCoverage, moneyDelta } from '@rumtelo/utils';

import { MoneyDeltaLabel } from '@/components/features/home/money-delta-label';

import { jarKeyToSlug } from '@/app/_lib/jar-slug';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

import { JarMonthMeta, jarMonthMetaAria } from './jar-month-meta';
import { JarMonthPotAmounts } from './jar-month-pot-amounts';
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
    | 'potBalance'
    | 'overspent'
> & {
    color: string;
    subtitle: string;
    icon: string;
    /** Live-month allocation when the list is stacked. Null on the current month. */
    baselineAllocated?: number | null;
    /** Open fixed costs this period — optional list signal. */
    openCount?: number;
};

/**
 * Compact tappable jar row — month left on the right, pot (+ open) under the bar.
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
    const metaFacts = {
        potBalance: jar.potBalance,
        openCount: jar.openCount,
    };
    const ariaLabel = [
        t('summary_open_aria', {
            name: jar.name,
            available: formatMoney(coverage.available),
            pot: formatMoney(jar.potBalance),
        }),
        jarMonthMetaAria(metaFacts, t, formatMoney),
    ].join('. ');

    return (
        <Link
            href={`/product/money/jars/${jarKeyToSlug(jar.key)}`}
            aria-label={ariaLabel}
            className="grid min-w-0 gap-2 rounded-xl border border-line bg-card px-3 py-3 transition-colors outline-none hover:border-line-strong hover:bg-raised focus-visible:ring-2 focus-visible:ring-accent/25 sm:px-4">
            <span className="flex min-w-0 items-start gap-2 sm:items-center sm:gap-3">
                <span
                    className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-raised text-base"
                    aria-hidden>
                    {jar.icon}
                </span>
                <span className="grid min-w-0 flex-1 gap-0.5 pt-0.5 sm:pt-0">
                    <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <Typography as="h4" weight="semibold" className="min-w-0 truncate">
                            {jar.name}
                        </Typography>
                        <span className="shrink-0 font-mono text-xs text-fg-faint">
                            {jar.percentage}%
                        </span>
                    </span>
                    <span className="truncate font-mono text-xs tracking-wide text-fg-faint uppercase">
                        {jar.subtitle}
                    </span>
                </span>
                <JarMonthPotAmounts
                    available={coverage.available}
                    potBalance={jar.potBalance}
                    overspent={coverage.overspent}
                    pot="none">
                    {allocationDelta ? (
                        <MoneyDeltaLabel
                            className="justify-end font-mono text-[11px] sm:text-xs"
                            fromLabel={formatMoney(allocationDelta.from)}
                            toLabel={formatMoney(allocationDelta.to)}
                            deltaLabel={`${allocationDelta.delta > 0 ? '+' : ''}${formatMoney(allocationDelta.delta)}`}
                        />
                    ) : (
                        <span className="font-mono text-[11px] text-fg-muted sm:text-xs">
                            {t('of_amount', {
                                amount: formatMoney(jar.allocated + jar.credited),
                            })}
                        </span>
                    )}
                </JarMonthPotAmounts>
                <span className="shrink-0 pt-1 text-xs text-fg-faint sm:pt-0" aria-hidden>
                    ›
                </span>
            </span>

            <JarProgressBar
                allocated={jar.allocated}
                spent={jar.spent}
                credited={jar.credited}
                committedOut={jar.committedOut}
                colorClass={jar.color}
                className="w-full"
            />

            <JarMonthMeta facts={metaFacts} />
        </Link>
    );
}
