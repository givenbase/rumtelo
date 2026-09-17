import type { ReactNode } from 'react';

import Link from 'next/link';

import { Eyebrow, HeroNumber, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

interface Stat {
    label: string;
    value: string;
    tone?: 'accent' | 'default';
    href?: string;
}

/**
 * Dashboard hero (design: Kluis Finance App.dc.html:393-421) — the gradient
 * "allocated this month" figure, the 3-stat row, and the header above the
 * jar list (rendered as `children`, via JarDrilldownRow).
 */
export function HeroCard({
    total,
    incomeBreakdown,
    stats,
    children,
    incomeHref = '/product/growth/income',
    jarsHref = '/product/money/jars',
}: {
    total: string;
    incomeBreakdown: string;
    stats: Stat[];
    children: ReactNode;
    incomeHref?: string;
    jarsHref?: string;
}) {
    return (
        <div className="rounded-2xl border border-accent-hover bg-surface p-6 shadow-glow sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-6">
                <Link
                    href={incomeHref}
                    className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent/25">
                    <Eyebrow>Money · Allocated this month</Eyebrow>
                    <HeroNumber className="mt-2.5 text-4xl leading-none transition-colors group-hover:text-accent sm:text-5xl">
                        {total}
                    </HeroNumber>
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
                <div className="flex flex-wrap gap-7">
                    {stats.map(stat => {
                        const valueClass = cn(
                            'font-display text-3xl leading-none font-semibold tracking-tight',
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
