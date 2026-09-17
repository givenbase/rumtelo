import type { ReactNode } from 'react';

import Link from 'next/link';

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

/**
 * Dashboard hero card — "de kluis" (design: Kluis Finance App.dc.html:393-421).
 *
 * Shows the gradient allocated-total, a concise income-breakdown line, and a
 * row of three anchor stats. Below the divider, renders whatever is passed as
 * `children` — typically a JarDrilldownTable.
 */
export function HeroKluis({
    total,
    incomeBreakdown,
    stats,
    children,
    incomeHref = '/product/growth/income',
    jarsHref = '/product/money/jars',
    eyebrow = 'Money · Distributed this month',
    totalDelta,
}: {
    total: string;
    incomeBreakdown: string;
    stats: KluisStat[];
    children: ReactNode;
    /** Opens income detail — where this month’s money comes from. */
    incomeHref?: string;
    /** Opens the full jars list. */
    jarsHref?: string;
    /** Override eyebrow for stacked travel (projected / accumulated). */
    eyebrow?: string;
    /** Current → selected delta when period-traveling. */
    totalDelta?: {
        fromLabel: string;
        toLabel: string;
        deltaLabel: string;
        tone?: 'grow' | 'neutral';
    } | null;
}) {
    return (
        <div className="rounded-2xl border border-accent/30 bg-surface p-6 shadow-glow sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-6">
                {/* Hero figure — tap through to income sources */}
                <Link
                    href={incomeHref}
                    className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent/25">
                    <Eyebrow>{eyebrow}</Eyebrow>
                    {totalDelta ? (
                        <div className="mt-2.5">
                            <MoneyDeltaLabel
                                fromLabel={totalDelta.fromLabel}
                                toLabel={totalDelta.toLabel}
                                deltaLabel={totalDelta.deltaLabel}
                                tone={totalDelta.tone ?? 'grow'}
                                className="font-display text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl"
                            />
                        </div>
                    ) : (
                        <HeroNumber className="mt-2.5 text-4xl leading-none transition-colors group-hover:text-accent sm:text-5xl lg:text-6xl">
                            {total}
                        </HeroNumber>
                    )}
                    <Typography
                        as="p"
                        size="sm"
                        color="muted"
                        className="mt-2 group-hover:text-fg-secondary">
                        {incomeBreakdown}
                        <span className="ml-1.5 font-mono text-xs tracking-wide text-fg-faint uppercase group-hover:text-accent">
                            See income ▸
                        </span>
                    </Typography>
                </Link>

                {/* Anchor stats */}
                <div className="flex flex-wrap gap-7">
                    {stats.map(stat => {
                        const valueClass = cn(
                            'font-display text-3xl leading-none font-semibold tracking-tight tabular-nums',
                            stat.tone === 'accent' ? 'text-accent' : 'text-fg'
                        );

                        if (stat.href) {
                            return (
                                <Link
                                    key={stat.label}
                                    href={stat.href}
                                    className="group grid gap-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent/25">
                                    <Eyebrow className="whitespace-nowrap">{stat.label}</Eyebrow>
                                    <p
                                        className={cn(
                                            valueClass,
                                            'transition-colors group-hover:text-accent'
                                        )}>
                                        {stat.value}
                                    </p>
                                </Link>
                            );
                        }

                        return (
                            <div key={stat.label} className="grid gap-1.5">
                                <Eyebrow className="whitespace-nowrap">{stat.label}</Eyebrow>
                                <p className={valueClass}>{stat.value}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="my-6 h-px bg-line" />

            {/* Jar section header */}
            <div className="flex items-center justify-between">
                <Eyebrow>✦ The six jars</Eyebrow>
                <Link
                    href={jarsHref}
                    className="font-mono text-xs font-semibold tracking-wide text-fg-muted uppercase hover:text-accent">
                    See all ▸
                </Link>
            </div>

            <div className="mt-3">{children}</div>
        </div>
    );
}
