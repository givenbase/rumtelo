'use client';

import { useState } from 'react';

import Link from 'next/link';

import type { CoachMessage } from '@rumtelo/contracts';
import { Button, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

/** Display fields for the rotating coach card (full DTO may omit CTA when informational). */
export type CoachVerdictMessage = Pick<
    CoachMessage,
    'id' | 'kind' | 'text' | 'ctaLabel' | 'ctaHref'
>;

export interface CoachRecapItem {
    portal: string;
    value: string;
    what: string;
    tint: string;
    href: string;
}

const KIND_META: Record<string, { label: string; dot: string }> = {
    NUDGE: { label: 'Attention', dot: 'var(--color-warning)' },
    WIN: { label: 'Win', dot: 'var(--color-success)' },
    ON_TRACK: { label: 'On track', dot: 'var(--color-success)' },
    ALERT: { label: 'Alert', dot: 'var(--color-danger)' },
};

/**
 * Dashboard coach card (design: Kluis Finance App.dc.html:346-387) —
 * dot-paginated rotating coach messages with a kind badge, a cross-portal
 * recap strip, and a single CTA that changes per slide.
 *
 * Replaces the old CoachCarousel with English user-facing copy and a type that
 * matches the mockCoach / contract.coach shape directly.
 */
export function CoachVerdict({
    messages,
    recap,
}: {
    messages: readonly CoachVerdictMessage[];
    recap: CoachRecapItem[];
}) {
    const [index, setIndex] = useState(0);
    const msg = messages[index] ?? messages[0];
    if (!msg) return null;
    const meta = KIND_META[msg.kind] ?? { label: msg.kind, dot: 'var(--color-accent)' };

    const prev = () => setIndex(previous => (previous - 1 + messages.length) % messages.length);
    const next = () => setIndex(previous => (previous + 1) % messages.length);

    return (
        <div className="overflow-hidden rounded-2xl border border-accent/40 bg-surface shadow-md">
            {/* Slide body */}
            <div className="grid gap-3.5 px-5 pt-4.5 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Typography as="span" variant="eyebrow" color="primary">
                        ✦ The Coach
                    </Typography>
                    <span className="flex items-center gap-2">
                        <span className="size-1.75 rounded-full" style={{ background: meta.dot }} />
                        <Typography
                            as="span"
                            variant="eyebrow"
                            color="inherit"
                            style={{ color: meta.dot }}>
                            {meta.label}
                        </Typography>
                    </span>
                </div>

                <Typography
                    as="h3"
                    size="lg"
                    weight="medium"
                    className="max-w-prose leading-snug text-pretty lg:text-2xl">
                    {msg.text}
                </Typography>

                <div className="flex flex-wrap items-center gap-3.5">
                    {/* Dot pagination */}
                    <span className="flex items-center gap-1.5">
                        {messages.map((message, i) => (
                            <button
                                key={message.text}
                                type="button"
                                onClick={() => setIndex(i)}
                                aria-label={`Message ${i + 1}`}
                                className={cn(
                                    'h-1 rounded-full transition-all duration-300',
                                    i === index ? 'w-6 bg-accent' : 'w-2.5 bg-line-strong'
                                )}
                            />
                        ))}
                    </span>

                    {/* Prev / count / next */}
                    <span className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={prev}
                            aria-label="Previous"
                            className="grid size-6.5 place-items-center rounded-full border border-line text-fg-muted transition-colors hover:border-accent-hover hover:text-accent">
                            ←
                        </button>
                        <span className="font-mono text-xs font-medium text-fg-faint">
                            {index + 1} / {messages.length}
                        </span>
                        <button
                            type="button"
                            onClick={next}
                            aria-label="Next"
                            className="grid size-6.5 place-items-center rounded-full border border-line text-fg-muted transition-colors hover:border-accent-hover hover:text-accent">
                            →
                        </button>
                    </span>

                    <span className="ml-auto flex items-center gap-2">
                        <button
                            type="button"
                            className="rounded-full border border-line-strong px-4 py-2.5 font-mono text-xs font-medium tracking-wide text-fg-secondary uppercase transition-colors hover:border-accent-hover hover:text-accent"
                            onClick={() => {
                                if (typeof navigator !== 'undefined' && navigator.share) {
                                    void navigator.share({
                                        title: 'Rumtelo',
                                        text: msg.text,
                                        url: window.location.href,
                                    });
                                }
                            }}>
                            Share
                        </button>
                        <Button as={Link} href={msg.ctaHref ?? '/'} size="sm">
                            {msg.ctaLabel ?? 'Open'}
                        </Button>
                    </span>
                </div>
            </div>

            {/* Cross-portal recap strip */}
            <div className="grid grid-cols-2 border-t border-line bg-bg-app sm:flex sm:flex-wrap">
                {recap.map(row => (
                    <Link
                        key={row.portal}
                        href={row.href}
                        className="grid min-w-0 gap-1 border-t-2 border-r border-b border-line px-3 py-2.5 transition-colors last:border-r-0 hover:bg-raised sm:flex-1 sm:border-b-0 sm:px-4"
                        style={{ borderTopColor: row.tint }}>
                        <Typography
                            as="span"
                            variant="eyebrow"
                            weight="semibold"
                            color="inherit"
                            style={{ color: row.tint }}>
                            {row.portal}
                        </Typography>
                        <span className="flex min-w-0 flex-wrap items-baseline gap-1.5">
                            <span className="font-mono text-xs text-fg">{row.value}</span>
                            <span className="text-xs text-fg-faint">{row.what}</span>
                        </span>
                    </Link>
                ))}
                <Link
                    href="/product/coach"
                    className="col-span-2 flex items-center justify-center border-t border-line px-4.5 py-2.5 transition-colors hover:text-accent sm:col-span-1 sm:ml-auto sm:border-t-0 sm:border-l">
                    <Typography as="span" variant="eyebrow" color="muted" className="text-fg-faint">
                        Detail
                    </Typography>
                </Link>
            </div>
        </div>
    );
}
