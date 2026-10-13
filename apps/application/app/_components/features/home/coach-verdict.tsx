'use client';

import { useState, type ReactNode } from 'react';

import Link from 'next/link';

import type { CoachMessage } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Button, Typography } from '@rumtelo/ui';
import { cn, localStorageUtil, storageKey } from '@rumtelo/utils';

import { coachKindDisplay } from '@/app/_lib/coach-kind-label';
import { resolveCoachMessage } from '@/app/_lib/coach-message-copy';
import { useHelpersEnabled } from '@/components/features/helpers';

/** Display fields for the rotating coach card (full DTO may omit CTA when informational). */
export type CoachVerdictMessage = Pick<
    CoachMessage,
    'id' | 'key' | 'kind' | 'text' | 'ctaLabel' | 'ctaHref'
>;

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
/** Device-local only — not a household setting. Expires after 1 day. */
const COLLAPSED_KEY = storageKey('coach', 'verdict-collapsed');

/**
 * Dashboard coach card — rotating advice slides + optional month-score slide.
 * Collapse keeps a slim bar so the coach stays findable without the full panel.
 * Preference is localStorage for 24h (not Settings); new attention re-opens it.
 */
export function CoachVerdict({
    messages,
    scoreSlide,
    hasAttention = false,
}: {
    messages: readonly CoachVerdictMessage[];
    /** Month score advice as the last slide (embedded MonthScoreLog). */
    scoreSlide?: ReactNode;
    /** Inbox / week check / month-close work waiting — drives collapsed chip. */
    hasAttention?: boolean;
}) {
    const t = useTranslations('features.coach.verdict');
    const tCoach = useTranslations('features.coach');
    const tRoot = useTranslations();
    const helpersEnabled = useHelpersEnabled();
    const hasScore = Boolean(scoreSlide);
    const slideCount = messages.length + (hasScore ? 1 : 0);
    const [index, setIndex] = useState(0);
    const [collapsed, setCollapsed] = useState(
        () => localStorageUtil.getItem<boolean>(COLLAPSED_KEY) === true
    );
    const [prevAttention, setPrevAttention] = useState(hasAttention);

    // Fresh attention (false → true) re-opens the panel (adjust state while rendering).
    if (hasAttention !== prevAttention) {
        setPrevAttention(hasAttention);
        if (hasAttention && !prevAttention) {
            localStorageUtil.removeItem(COLLAPSED_KEY);
            setCollapsed(false);
        }
    }

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

    function toggleCollapsed() {
        setCollapsed(previous => {
            const nextCollapsed = !previous;
            if (nextCollapsed) {
                localStorageUtil.setItem(COLLAPSED_KEY, true, { expiryDays: 1 });
            } else {
                localStorageUtil.removeItem(COLLAPSED_KEY);
            }
            return nextCollapsed;
        });
    }

    const collapsedSummary = hasAttention
        ? messages.length > 0
            ? t('collapsed_waiting', { count: messages.length + (hasScore ? 1 : 0) })
            : t('collapsed_attention')
        : t('collapsed_clear');

    return (
        <div className="overflow-hidden rounded-2xl border border-accent bg-surface shadow-md">
            <div
                className={cn(
                    'flex flex-wrap items-center justify-between gap-3 px-5',
                    collapsed ? 'py-3' : 'pt-4.5 pb-0'
                )}>
                <Typography as="span" variant="eyebrow" color="primary">
                    {t('eyebrow')}
                </Typography>
                <span className="flex flex-wrap items-center gap-2">
                    {!collapsed ? (
                        <span className="flex items-center gap-2">
                            <span
                                className="size-1.75 rounded-full"
                                style={{ background: meta.dot }}
                            />
                            <Typography
                                as="span"
                                variant="eyebrow"
                                color="inherit"
                                style={{ color: meta.dot }}>
                                {meta.label}
                            </Typography>
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <span
                                className="size-1.75 rounded-full"
                                style={{
                                    background: hasAttention
                                        ? 'var(--color-warning)'
                                        : 'var(--color-success)',
                                }}
                            />
                            <Typography
                                as="span"
                                size="sm"
                                color="muted"
                                className="max-w-[16rem] truncate sm:max-w-none">
                                {collapsedSummary}
                            </Typography>
                        </span>
                    )}
                    <Link
                        href="/product/coach"
                        className="rounded-full border border-line px-3 py-1.5 font-mono text-[0.65rem] font-medium tracking-wide text-fg-faint uppercase transition-colors hover:border-accent-hover hover:text-accent">
                        {t('detail')}
                    </Link>
                    <button
                        type="button"
                        onClick={toggleCollapsed}
                        aria-expanded={!collapsed}
                        className="rounded-full border border-line px-3 py-1.5 font-mono text-[0.65rem] font-medium tracking-wide text-fg-secondary uppercase transition-colors hover:border-accent-hover hover:text-accent">
                        {collapsed ? t('expand') : t('collapse')}
                    </button>
                </span>
            </div>

            {!collapsed ? (
                <div className="grid gap-3.5 px-5 pt-3.5 pb-4">
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
                        {slideCount > 1 ? (
                            <>
                                <span className="flex items-center gap-1.5">
                                    {Array.from({ length: slideCount }, (_, i) => {
                                        const scoreDot = hasScore && i === messages.length;
                                        return (
                                            <button
                                                key={
                                                    scoreDot
                                                        ? 'month-score'
                                                        : (messages[i]?.id ?? i)
                                                }
                                                type="button"
                                                onClick={() => setIndex(i)}
                                                aria-label={
                                                    scoreDot
                                                        ? t('month_score_slide')
                                                        : t('message_n', { n: i + 1 })
                                                }
                                                className={cn(
                                                    'h-1 rounded-full transition-all duration-300',
                                                    i === safeIndex
                                                        ? 'w-6 bg-accent'
                                                        : 'w-2.5 bg-line-strong'
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
                            </>
                        ) : null}

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
                                {msg.ctaHref ? (
                                    <Button as={Link} href={msg.ctaHref} size="sm">
                                        {copy.ctaLabel ?? t('open')}
                                    </Button>
                                ) : null}
                            </span>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
