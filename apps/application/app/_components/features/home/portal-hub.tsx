'use client';

import type { ReactNode } from 'react';

import Link from 'next/link';

import { Button, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { capabilityKeyForPathname } from '@/app/_lib/capability-access';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';

interface HubCard {
    name: string;
    value: string;
    note: string;
    color: string;
    chart:
        | { kind: 'bars'; bars: number[] }
        /** `progress` (default): gray → warning → green by pct. `brand`: fixed card color. */
        | { kind: 'ring'; pct: number; tone?: 'progress' | 'brand' };
    delta?: { mark: '↑' | '↓' | '→'; text: string; positive: boolean };
    locked?: boolean;
    href: string;
}

export interface PortalHubProps {
    tint: string;
    icon: ReactNode;
    eyebrow: string;
    title: string;
    line: string;
    coach: { dot: string; kind: string; text: string; cta: string; href: string };
    cards: HubCard[];
}

/**
 * The shared portal-overview template (design: "PORTAL OVERZICHT",
 * Kluis Finance App.dc.html:631-687) — used once each by Money, Growth,
 * Energy and Soul's own overview screen.
 */
export function PortalHub({ tint, icon, eyebrow, title, line, coach, cards }: PortalHubProps) {
    const { isCapabilityLocked } = usePlanCapabilities();
    const coachLocked = isCapabilityLocked(capabilityKeyForPathname(coach.href));

    return (
        <div className="grid animate-rise gap-5">
            <div>
                <span
                    className="flex items-center gap-2 font-mono text-xs font-medium tracking-widest uppercase"
                    style={{ color: tint }}>
                    {icon}
                    {eyebrow}
                </span>
                <Typography as="h1" className="mt-2.5">
                    {title}
                </Typography>
                <Typography as="p" variant="lead" size="default" className="mt-2">
                    {line}
                </Typography>
            </div>

            <div
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-l-4 border-line bg-surface p-4 shadow-md sm:p-5"
                style={{ borderLeftColor: tint }}>
                <div className="grid min-w-0 flex-1 gap-1.5">
                    <span className="flex items-center gap-2">
                        <span
                            className="size-1.75 rounded-full"
                            style={{ background: coach.dot }}
                        />
                        <Typography as="span" variant="eyebrow" color="primary">
                            The Coach
                        </Typography>
                        <span
                            className="font-mono text-xs font-medium tracking-widest uppercase"
                            style={{ color: coach.dot }}>
                            · {coach.kind}
                        </span>
                    </span>
                    <span className="font-display text-base leading-snug font-medium text-pretty text-fg lg:text-lg">
                        {coach.text}
                    </span>
                </div>
                <Button as={Link} href={coach.href} size="sm">
                    {coachLocked ? `🔒 ${coach.cta}` : coach.cta}
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map(card => {
                    const locked =
                        card.locked === true ||
                        isCapabilityLocked(capabilityKeyForPathname(card.href));
                    return (
                        <Link
                            key={card.name}
                            href={card.href}
                            className={cn(
                                'grid content-start gap-2.5 rounded-2xl border border-t-4 border-line bg-surface p-5 shadow-md transition-all hover:-translate-y-px hover:border-accent-hover',
                                locked && 'opacity-70'
                            )}
                            style={{ borderTopColor: card.color }}>
                            <span className="flex items-center justify-between gap-2">
                                <span className="font-mono text-xs font-semibold tracking-widest text-fg-faint uppercase">
                                    {card.name}
                                </span>
                                {locked && <span className="text-xs text-fg-faint">🔒</span>}
                            </span>
                            <span className="flex min-h-13 items-end justify-between gap-3">
                                <span className="font-display text-2xl font-semibold tracking-tight text-fg lg:text-3xl">
                                    {card.value}
                                </span>
                                {card.chart.kind === 'bars' ? (
                                    <span className="flex h-11 items-end gap-0.75">
                                        {card.chart.bars.map((height, barIndex) => {
                                            const weekday =
                                                (
                                                    [
                                                        'mon',
                                                        'tue',
                                                        'wed',
                                                        'thu',
                                                        'fri',
                                                        'sat',
                                                        'sun',
                                                    ] as const
                                                )[barIndex] ?? `b${barIndex}`;
                                            return (
                                                <span
                                                    key={`${card.name}-${weekday}`}
                                                    className="block w-1.5 rounded-sm"
                                                    style={{
                                                        height: `${height}%`,
                                                        minHeight: 4,
                                                        background: card.color,
                                                    }}
                                                />
                                            );
                                        })}
                                    </span>
                                ) : (
                                    <RingChart
                                        pct={card.chart.pct}
                                        brandColor={card.color}
                                        tone={card.chart.tone ?? 'progress'}
                                    />
                                )}
                            </span>
                            <span className="text-sm leading-relaxed text-pretty text-fg-muted">
                                {card.note}
                            </span>
                            {card.delta && (
                                <span className="flex items-center gap-1.5 border-t border-line pt-2.5">
                                    <span
                                        className={cn(
                                            'text-xs',
                                            card.delta.positive ? 'text-success' : 'text-danger'
                                        )}>
                                        {card.delta.mark}
                                    </span>
                                    <span
                                        className={cn(
                                            'font-mono text-xs font-medium tracking-normal',
                                            card.delta.positive ? 'text-success' : 'text-danger'
                                        )}>
                                        {card.delta.text}
                                    </span>
                                </span>
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Ring fill for “higher is better” metrics.
 * 0% muted gray → mid warning amber → 100% success green.
 */
function progressRingColor(pct: number): string {
    const percent = Math.max(0, Math.min(100, pct));
    if (percent <= 0) return 'var(--color-fg-faint)';
    if (percent >= 100) return 'var(--color-success)';
    if (percent < 50) {
        const warningShare = Math.round((percent / 50) * 100);
        return `color-mix(in oklab, var(--color-warning) ${warningShare}%, var(--color-fg-faint))`;
    }
    const successShare = Math.round(((percent - 50) / 50) * 100);
    return `color-mix(in oklab, var(--color-success) ${successShare}%, var(--color-warning))`;
}

function RingChart({
    pct,
    brandColor,
    tone,
}: {
    pct: number;
    brandColor: string;
    tone: 'progress' | 'brand';
}) {
    const clamped = Math.max(0, Math.min(100, pct));
    const color = tone === 'brand' ? brandColor : progressRingColor(clamped);
    const showStroke = clamped > 0;

    return (
        <span className="relative grid size-11.5 flex-none place-items-center">
            <svg viewBox="0 0 36 36" className="size-11.5 -rotate-90" aria-hidden>
                <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="var(--color-sunken)"
                    strokeWidth="3"
                />
                {showStroke ? (
                    <circle
                        cx="18"
                        cy="18"
                        r="15.9"
                        fill="none"
                        stroke={color}
                        strokeWidth="3"
                        strokeDasharray={`${clamped} 100`}
                        strokeLinecap="round"
                        pathLength={100}
                        className="transition-[stroke,stroke-dasharray] duration-500 ease-out"
                    />
                ) : null}
            </svg>
            <span className="absolute font-mono text-xs tabular-nums" style={{ color }}>
                {Math.round(clamped)}%
            </span>
        </span>
    );
}
