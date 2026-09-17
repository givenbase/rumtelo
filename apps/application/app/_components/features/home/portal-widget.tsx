import Link from 'next/link';

import { AccentCard, Typography } from '@rumtelo/ui';

export interface PortalWidgetStat {
    label: string;
    value: string;
    color?: string;
}

/**
 * Portal preview widget (design: Kluis Finance App.dc.html:468-517).
 *
 * A compact top-accent-bar card showing one portal's key metrics and a
 * single tagline. Used in a row of three on the dashboard (Groei, Energie,
 * Ziel) — the Money portal is handled by HeroKluis higher up on the page.
 */
export function PortalWidget({
    tint,
    icon,
    title,
    href,
    stats,
    tagline,
}: {
    tint: string;
    icon: string;
    title: string;
    href: string;
    stats: PortalWidgetStat[];
    tagline: string;
}) {
    return (
        <AccentCard tint={tint} className="flex h-full min-w-0 flex-col gap-3.5 p-5">
            {/* Header row */}
            <div className="flex items-center justify-between gap-3">
                <Typography
                    as="span"
                    variant="eyebrow"
                    color="inherit"
                    className="flex items-center gap-2"
                    style={{ color: tint }}>
                    <span aria-hidden>{icon}</span>
                    {title}
                </Typography>
                <Link
                    href={href}
                    className="font-mono text-xs font-medium text-fg-faint transition-colors hover:text-accent">
                    Open ▸
                </Link>
            </div>

            {/* Stat rows */}
            <div className="grid">
                {stats.map(stat => (
                    <div
                        key={stat.label}
                        className="flex items-baseline justify-between gap-3 border-b border-line py-2.5 last:border-b-0">
                        <Typography
                            as="span"
                            variant="eyebrow"
                            color="muted"
                            className="whitespace-nowrap text-fg-faint">
                            {stat.label}
                        </Typography>
                        <span
                            className="font-display text-2xl leading-none font-semibold tracking-tight"
                            style={
                                stat.color ? { color: stat.color } : { color: 'var(--color-fg)' }
                            }>
                            {stat.value}
                        </span>
                    </div>
                ))}
            </div>

            {/* Tagline */}
            <p className="text-sm leading-relaxed text-fg-muted">{tagline}</p>
        </AccentCard>
    );
}
