import type { ReactNode } from 'react';

import Link from 'next/link';

import { AccentCard, Typography } from '@rumtelo/ui';

interface PreviewRow {
    label: string;
    value: string;
    color?: string;
}

/**
 * The 3 Growth/Energy/Soul mini-widgets under the dashboard hero (design:
 * Kluis Finance App.dc.html:468-517) — each a top-accent-bar card with a
 * title, an "open" link, a few label/value rows, and a closing line.
 */
export function PortalPreviewCard({
    tint,
    icon,
    title,
    href,
    openLabel,
    rows,
    line,
}: {
    tint: string;
    icon: ReactNode;
    title: string;
    href: string;
    openLabel: string;
    rows: PreviewRow[];
    line: string;
}) {
    return (
        <AccentCard tint={tint} className="flex flex-1 flex-col gap-3.5 rounded-2xl p-5.5">
            <div className="flex items-center justify-between gap-3">
                <Typography
                    as="span"
                    variant="eyebrow"
                    color="inherit"
                    className="flex items-center gap-2"
                    style={{ color: tint }}>
                    {icon}
                    {title}
                </Typography>
                <Link
                    href={href}
                    className="font-mono text-xs font-medium text-fg-faint hover:text-accent">
                    {openLabel}
                </Link>
            </div>
            <div className="grid">
                {rows.map(row => (
                    <div
                        key={row.label}
                        className="flex items-baseline justify-between gap-3 border-b border-line py-2.5 last:border-b-0">
                        <Typography
                            as="span"
                            variant="eyebrow"
                            color="muted"
                            className="whitespace-nowrap text-fg-faint">
                            {row.label}
                        </Typography>
                        <span
                            className="font-display text-2xl leading-none font-semibold tracking-tight"
                            style={{ color: row.color }}>
                            {row.value}
                        </span>
                    </div>
                ))}
            </div>
            <p className="text-sm leading-relaxed text-fg-muted">{line}</p>
        </AccentCard>
    );
}
