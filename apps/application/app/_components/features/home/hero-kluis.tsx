'use client';

import type { ReactNode } from 'react';

import Link from 'next/link';

import { useTranslations } from '@rumtelo/i18n';
import { Eyebrow, HeroNumber, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { MoneyDeltaLabel } from '@/components/features/home/money-delta-label';

interface KluisStat {
    label: string;
    value: string;
    tone?: 'accent' | 'default';
    /** When set, the stat becomes a tap-through (e.g. Left in Play → Play jar). */
    href?: string;
}

type SideMetricProps = {
    label: string;
    value: string;
    footnote?: ReactNode;
    href?: string;
    accent?: boolean;
    className?: string;
};

const focusRing =
    'outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/**
 * Secondary kluis metric — shared label / value / footnote rows so the four
 * side figures stay vertically aligned with each other.
 */
function SideMetric({ label, value, footnote, href, accent, className }: SideMetricProps) {
    const body = (
        <>
            <Eyebrow className="block min-h-[2.5rem] overflow-hidden text-pretty break-words hyphens-auto">
                {label}
            </Eyebrow>
            <p
                className={cn(
                    'metric-value mt-1.5 min-h-8 font-display text-xl leading-none font-semibold tracking-tight tabular-nums transition-colors sm:text-2xl',
                    accent ? 'text-accent' : 'text-fg'
                )}>
                {value}
            </p>
            <div className="mt-1.5 min-h-[2.25rem] font-mono text-[10px] leading-snug tracking-wide text-fg-faint uppercase">
                {footnote ?? '\u00a0'}
            </div>
        </>
    );

    if (href) {
        return (
            <Link
                href={href}
                className={cn(
                    'group block min-w-0',
                    focusRing,
                    'hover:[&_.metric-value]:text-accent',
                    className
                )}>
                {body}
            </Link>
        );
    }

    return <div className={cn('min-w-0', className)}>{body}</div>;
}

/**
 * Dashboard hero card — "de kluis".
 *
 * Large allocated figure (only big number) + compact aligned side metrics, then jars.
 */
export function HeroKluis({
    total,
    potTotal,
    incomeBreakdown,
    stats,
    children,
    incomeHref = '/product/growth/income',
    jarsHref = '/product/money',
    eyebrow,
    totalDelta,
}: {
    total: string;
    /** Sum of jar pot balances — stock across all pots. */
    potTotal: string;
    incomeBreakdown: string;
    stats: KluisStat[];
    children: ReactNode;
    /** Opens income detail — where this month’s money comes from. */
    incomeHref?: string;
    /** Opens the full jars list. */
    jarsHref?: string;
    /** Eyebrow from i18n (pages.dashboard.hero.*). */
    eyebrow: string;
    /** Current → selected delta when period-traveling. */
    totalDelta?: {
        fromLabel: string;
        toLabel: string;
        deltaLabel: string;
        tone?: 'grow' | 'neutral';
    } | null;
}) {
    const t = useTranslations('pages.dashboard.hero');

    const sideMetrics: SideMetricProps[] = [
        {
            label: t('in_pots_label'),
            value: potTotal,
            footnote: t('in_pots_hint'),
            href: jarsHref,
        },
        ...stats.map(stat => ({
            label: stat.label,
            value: stat.value,
            href: stat.href,
            accent: stat.tone === 'accent',
        })),
    ];

    return (
        <div className="border border-accent/30 bg-surface p-5 shadow-glow sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.85fr)] lg:items-start lg:gap-6">
                {/* Only this figure stays hero-sized */}
                <Link href={incomeHref} className={cn('group block min-w-0', focusRing)}>
                    <Eyebrow>{eyebrow}</Eyebrow>
                    {totalDelta ? (
                        <div className="mt-2.5">
                            <MoneyDeltaLabel
                                fromLabel={totalDelta.fromLabel}
                                toLabel={totalDelta.toLabel}
                                deltaLabel={totalDelta.deltaLabel}
                                tone={totalDelta.tone ?? 'grow'}
                                className="font-display text-3xl font-semibold tracking-tight sm:text-4xl"
                            />
                        </div>
                    ) : (
                        <HeroNumber className="mt-2.5 text-4xl leading-none transition-colors group-hover:text-accent sm:text-5xl">
                            {total}
                        </HeroNumber>
                    )}
                    <Typography
                        as="p"
                        size="sm"
                        color="muted"
                        className="mt-2 text-pretty group-hover:text-fg-secondary">
                        {incomeBreakdown}
                        <span className="ml-1.5 font-mono text-xs tracking-wide text-fg-faint uppercase group-hover:text-accent">
                            {t('see_income')}
                        </span>
                    </Typography>
                </Link>

                {/* Side metrics: 2×2 on mobile, 4-col aligned strip on lg */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:gap-x-5 lg:grid-cols-4 lg:gap-0 lg:border-l lg:border-line lg:pl-5">
                    {sideMetrics.map((metric, index) => (
                        <SideMetric
                            key={metric.label}
                            {...metric}
                            className={cn(
                                'min-w-0',
                                index > 0 && 'lg:border-l lg:border-line lg:pl-4',
                                index < sideMetrics.length - 1 && 'lg:pr-4'
                            )}
                        />
                    ))}
                </div>
            </div>

            <div className="my-5 h-px bg-line" />

            <div className="flex items-center justify-between gap-3">
                <Eyebrow>{t('six_jars')}</Eyebrow>
                <Link
                    href={jarsHref}
                    className={cn(
                        'shrink-0 font-mono text-xs font-semibold tracking-wide text-fg-muted uppercase hover:text-accent',
                        focusRing
                    )}>
                    {t('see_all_jars')}
                </Link>
            </div>

            <div className="mt-3">{children}</div>
        </div>
    );
}
