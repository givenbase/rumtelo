'use client';

import { useState, type ReactNode } from 'react';

import Link from 'next/link';

import type { CoachMessage } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Button, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { coachKindDisplay } from '@/app/_lib/coach-kind-label';
import { resolveCoachMessage } from '@/app/_lib/coach-message-copy';
import { useHelpersEnabled } from '@/components/features/helpers';

/** Display fields for the rotating coach card (full DTO may omit CTA when informational). */
export type CoachVerdictMessage = Pick<
    CoachMessage,
    'id' | 'key' | 'kind' | 'text' | 'ctaLabel' | 'ctaHref'
>;

export interface CoachRecapItem {
    portal: string;
    value: string;
    what: string;
    tint: string;
    href: string;
}

const KIND_DOTS: Record<string, string> = {
    NUDGE: 'var(--color-warning)',
    WIN: 'var(--color-success)',
    WARNING: 'var(--color-danger)',
    INSIGHT: 'var(--color-accent)',
    WEEK_CHECK: 'var(--color-accent)',
    ON_TRACK: 'var(--color-success)',
    ALERT: 'var(--color-danger)',
};

const SCORE_SLIDE_DOT = 'var(--color-accent)';

/**
 * Dashboard coach card — rotating advice slides + optional month-score slide
 * (score is coach advice: close, blockers), then a cross-portal recap strip.
 */
export function CoachVerdict({
    messages,
    recap,
    scoreSlide,
}: {
    messages: readonly CoachVerdictMessage[];
    recap: CoachRecapItem[];
    /** Month score advice as the last slide (embedded MonthScoreLog). */
    scoreSlide?: ReactNode;
}) {
    const t = useTranslations('features.coach.verdict');
    const tCoach = useTranslations('features.coach');
    const tRoot = useTranslations();
    const helpersEnabled = useHelpersEnabled();
    const hasScore = Boolean(scoreSlide);
    const slideCount = messages.length + (hasScore ? 1 : 0);
    const [index, setIndex] = useState(0);

    if (!helpersEnabled || slideCount === 0) return null;

    const safeIndex = Math.min(Math.max(0, index), slideCount - 1);
    const isScoreSlide = hasScore && safeIndex >= messages.length;
    const msg = isScoreSlide ? null : (messages[safeIndex] ?? null);
    const copy = msg ? resolveCoachMessage(msg, tCoach, tRoot) : null;
    const meta = isScoreSlide
        ? { label: t('month_score_badge'), dot: SCORE_SLIDE_DOT }
        : msg
          ? {
                label: coachKindDisplay(msg.kind, t),
                dot: KIND_DOTS[msg.kind] ?? 'var(--color-accent)',
            }
          : { label: '', dot: SCORE_SLIDE_DOT };

    const prev = () => setIndex(previous => (previous - 1 + slideCount) % slideCount);
    const next = () => setIndex(previous => (previous + 1) % slideCount);

    return (
        <div className="overflow-hidden rounded-2xl border border-accent bg-surface shadow-md">
            <div className="grid gap-3.5 px-5 pt-4.5 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Typography as="span" variant="eyebrow" color="primary">
                        {t('eyebrow')}
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

                {isScoreSlide ? (
                    <div className="min-w-0">{scoreSlide}</div>
                ) : copy && msg ? (
                    <Typography
                        as="h3"
                        size="lg"
                        weight="medium"
                        className="max-w-prose leading-snug text-pretty lg:text-2xl">
                        {copy.text}
                    </Typography>
                ) : null}

                <div className="flex flex-wrap items-center gap-3.5">
                    <span className="flex items-center gap-1.5">
                        {Array.from({ length: slideCount }, (_, i) => {
                            const scoreDot = hasScore && i === messages.length;
                            return (
                                <button
                                    key={scoreDot ? 'month-score' : (messages[i]?.id ?? i)}
                                    type="button"
                                    onClick={() => setIndex(i)}
                                    aria-label={
                                        scoreDot
                                            ? t('month_score_slide')
                                            : t('message_n', { n: i + 1 })
                                    }
                                    className={cn(
                                        'h-1 rounded-full transition-all duration-300',
                                        i === safeIndex ? 'w-6 bg-accent' : 'w-2.5 bg-line-strong'
                                    )}
                                />
                            );
                        })}
                    </span>

                    <span className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={prev}
                            aria-label={t('previous')}
                            className="grid size-6.5 place-items-center rounded-full border border-line text-fg-muted transition-colors hover:border-accent-hover hover:text-accent">
                            ←
                        </button>
                        <span className="font-mono text-xs font-medium text-fg-faint">
                            {safeIndex + 1} / {slideCount}
                        </span>
                        <button
                            type="button"
                            onClick={next}
                            aria-label={t('next')}
                            className="grid size-6.5 place-items-center rounded-full border border-line text-fg-muted transition-colors hover:border-accent-hover hover:text-accent">
                            →
                        </button>
                    </span>

                    {!isScoreSlide && copy && msg ? (
                        <span className="ml-auto flex flex-wrap items-center justify-end gap-2">
                            <button
                                type="button"
                                className="rounded-full border border-line-strong px-4 py-2.5 font-mono text-xs font-medium tracking-wide text-fg-secondary uppercase transition-colors hover:border-accent-hover hover:text-accent"
                                onClick={() => {
                                    if (typeof navigator !== 'undefined' && navigator.share) {
                                        void navigator.share({
                                            title: 'Rumtelo',
                                            text: copy.text,
                                            url: window.location.href,
                                        });
                                    }
                                }}>
                                {t('share')}
                            </button>
                            <Button as={Link} href={msg.ctaHref ?? '/'} size="sm">
                                {copy.ctaLabel ?? t('open')}
                            </Button>
                        </span>
                    ) : null}
                </div>
            </div>

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
                        {t('detail')}
                    </Typography>
                </Link>
            </div>
        </div>
    );
}
