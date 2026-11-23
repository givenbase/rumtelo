'use client';

import { useEffect, useState } from 'react';

import { Typography, typographyVariants } from '../Typography';
import { cn } from '@rumtelo/utils';

export type AuthManifestoQuote = {
    eyebrow: string;
    headline: string;
    support: string;
};

export type AuthManifestoStripItem = {
    name: string;
    short: string;
    tone: string;
    share: number;
};

export type AuthManifestoStrip = {
    eyebrow: string;
    line: string;
    items: readonly AuthManifestoStripItem[];
    /** Put each item's share in its tooltip (`Basics 55%`) — for a money split, not for portals. */
    showShare?: boolean;
};

const ROTATE_MS = 7000;

/** Tone/share of the four product portals, in Money · Growth · Energy · Soul order — for callers merging i18n labels. */
export const AUTH_MANIFESTO_PORTAL_VISUALS = [
    { tone: 'bg-jar-give', share: 25 },
    { tone: 'bg-jar-lts', share: 25 },
    { tone: 'bg-jar-play', share: 25 },
    { tone: 'bg-portal-soul', share: 25 },
] as const;

const QUOTE_SHADOW = '0 0 1px rgb(255 255 255 / 0.35), 0 2px 18px rgb(255 255 255 / 0.18)';

/**
 * Setup 1 (locked): full-bleed video + slim strip at the bottom.
 * The caller supplies the strip: product portals, or the three-pot split (`showShare`).
 */
export function AuthManifesto({
    quotes,
    reduceMotion,
    autoRotate = true,
    initialIndex = 0,
    tablistAriaLabel = 'Brand lines',
    strip,
}: {
    quotes: readonly AuthManifestoQuote[];
    reduceMotion: boolean;
    /** When false, stays on the first quote until the user clicks a tick. */
    autoRotate?: boolean;
    /** Which quote to open on (e.g. sign-up leads with how-it-works). */
    initialIndex?: number;
    tablistAriaLabel?: string;
    /** Bottom strip copy + labels (translated by the caller). */
    strip: AuthManifestoStrip;
}) {
    const [quoteIndex, setQuoteIndex] = useState(() => {
        if (quotes.length === 0) return 0;
        return ((initialIndex % quotes.length) + quotes.length) % quotes.length;
    });

    useEffect(() => {
        if (!autoRotate || reduceMotion || quotes.length < 2) return;

        const id = window.setInterval(() => {
            setQuoteIndex(current => (current + 1) % quotes.length);
        }, ROTATE_MS);
        return () => window.clearInterval(id);
    }, [autoRotate, quotes.length, reduceMotion]);

    const quote = quotes[quoteIndex] ?? quotes[0];
    if (!quote) return null;

    return (
        <div className="absolute inset-0 z-10 flex flex-col justify-end">
            <div className="relative px-10 pt-2 pb-4 xl:px-14">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 w-[min(36rem,85%)] bg-linear-to-r from-black/40 via-black/15 to-transparent"
                />

                <div
                    key={quote.headline}
                    className="relative max-w-lg animate-rise"
                    style={{ textShadow: QUOTE_SHADOW }}>
                    <Typography
                        as="p"
                        variant="eyebrow"
                        color="primary"
                        className="text-[11px] tracking-[0.28em] text-accent-hover">
                        {quote.eyebrow}
                    </Typography>
                    <div className="mt-2 h-px w-12 bg-accent" aria-hidden />
                    <p
                        className={cn(
                            typographyVariants({
                                as: 'h2',
                                size: 'default',
                                weight: 'semibold',
                                color: 'white',
                            }),
                            'mt-3 text-[2rem] leading-[1.15] xl:text-[2.25rem]'
                        )}>
                        {quote.headline}
                    </p>
                    <Typography
                        as="p"
                        color="white"
                        className="mt-2.5 max-w-md text-[15px] leading-snug text-white/92">
                        {quote.support}
                    </Typography>
                </div>

                {quotes.length > 1 ? (
                    <div
                        className="relative mt-4 flex gap-2"
                        role="tablist"
                        aria-label={tablistAriaLabel}>
                        {quotes.map((item, index) => {
                            const active = index === quoteIndex;
                            return (
                                <button
                                    key={item.headline}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    aria-label={item.eyebrow}
                                    className={
                                        active
                                            ? 'h-1.5 w-8 rounded-full bg-accent'
                                            : 'h-1.5 w-2.5 rounded-full bg-white/70 ring-1 ring-black/40 transition-colors hover:bg-white'
                                    }
                                    onClick={() => setQuoteIndex(index)}
                                />
                            );
                        })}
                    </div>
                ) : null}
            </div>

            <div className="bg-black/80 px-10 py-3.5 xl:px-14">
                <Typography
                    as="p"
                    variant="eyebrow"
                    color="white"
                    className="text-[10px] tracking-[0.22em] text-white/70">
                    {strip.eyebrow}
                </Typography>
                <Typography as="p" size="sm" weight="medium" color="white" className="mt-0.5">
                    {strip.line}
                </Typography>
                <div className="mt-2 flex gap-0.5">
                    {strip.items.map(item => (
                        <div
                            key={item.short}
                            className="min-w-0"
                            style={{ flexGrow: item.share, flexBasis: 0 }}
                            title={strip.showShare ? `${item.name} ${item.share}%` : item.name}>
                            <div className={cn(item.tone, 'h-2 rounded-sm')} />
                            <p className="mt-1 truncate font-mono text-[8px] tracking-wide text-white/75 uppercase">
                                {item.short}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
