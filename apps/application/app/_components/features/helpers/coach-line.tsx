'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';

import Link from 'next/link';

import { useQueryClient } from '@tanstack/react-query';

import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Icon } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { capabilityKeyForPathname } from '@/app/_lib/capability-access';
import {
    selectCoachLineCandidate,
    type CoachLineCandidate,
    type CoachLineCta,
} from '@/app/_lib/coach-line';
import {
    getServerLocalHidden,
    hideLocalLine,
    readLocalHidden,
    showLocalLine,
    subscribeLocalHidden,
} from '@/app/_lib/coach-line-dismiss';
import { isProductEnabled } from '@/app/_lib/launch-products';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';

import { useHelpersEnabled } from './provider';

/** Callback ref: the Undo button takes focus when the line is replaced by the undo row. */
function focusOnMount(node: HTMLButtonElement | null) {
    node?.focus();
}

/** How long "Tip hidden. Undo" stays before a feed tip is dismissed on the server. */
const UNDO_WINDOW_MS = 6000;

type CoachLineProps = {
    /** Ordered by priority; the first one that may render wins. Empty → renders nothing. */
    candidates: readonly CoachLineCandidate[];
    /** Optional trailing link under the line (Home only: "All tips (n)"). */
    footer?: ReactNode;
    className?: string;
};

/**
 * The Coach, once per page, after the household's own data: one sentence, one move (two on
 * the fixed-costs over-split rule), and a Hide button with Undo. No tint, no warning colours.
 * Renders nothing when there is no concrete move, when tips are off (Settings, VIEWER,
 * Practice look-along, closed or future month) or while the feed is loading. Rules:
 * `docs/product/coach-redesign.md` §2–§3.
 */
export function CoachLine({ candidates, footer, className }: CoachLineProps) {
    const t = useTranslations('features.coach.line');
    const queryClient = useQueryClient();
    const apiError = useApiError();
    const labelId = useId();
    const { householdId } = useAuth();
    const { showToast } = useHouseholdShell();
    const { isCapabilityLocked } = usePlanCapabilities();
    const helpersEnabled = useHelpersEnabled();
    const live = isLiveData(householdId);
    const settingsQuery = useLiveQuery(
        apiQuery.household.settings.queryOptions({ input: { householdId: householdId! } }),
        null,
        live
    );
    const coachOn = helpersEnabled && settingsQuery.data?.features.isCoachEnabled !== false;
    const localHidden = useSyncExternalStore(
        subscribeLocalHidden,
        () => readLocalHidden(householdId),
        getServerLocalHidden
    );

    // The hidden line waits here for the undo window; `settled` keeps a second line from
    // appearing right after the first one is gone.
    const [undo, setUndo] = useState<CoachLineCandidate | null>(null);
    const [settled, setSettled] = useState(false);
    const pending = useRef<{ candidate: CoachLineCandidate; timer: number } | null>(null);

    function dismissFeed(messageId: string) {
        if (!householdId) return;
        api.coach
            .dismiss({ householdId, id: messageId })
            .then(() => queryClient.invalidateQueries({ queryKey: apiQuery.coach.feed.key() }))
            .then(() =>
                queryClient.invalidateQueries({ queryKey: apiQuery.money.dashboard.get.key() })
            )
            .catch((error: unknown) => showToast(apiError(error), 'error'));
    }
    // The unmount cleanup below must call the latest closure, not the first render's.
    const dismissFeedRef = useRef(dismissFeed);
    useEffect(() => {
        dismissFeedRef.current = dismissFeed;
    });

    // Leaving the page inside the undo window still commits the hide.
    useEffect(
        () => () => {
            const waiting = pending.current;
            if (!waiting) return;
            window.clearTimeout(waiting.timer);
            if (waiting.candidate.dismiss.kind === 'feed') {
                dismissFeedRef.current(waiting.candidate.dismiss.messageId);
            }
        },
        []
    );

    // After the line is gone, focus goes to the page heading, never to the body.
    function focusPageHeading() {
        const active = document.activeElement;
        if (active && active !== document.body) return;
        const heading = document.querySelector<HTMLElement>('main h1');
        if (!heading) return;
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
    }

    function hide(candidate: CoachLineCandidate) {
        setUndo(candidate);
        // Local rules hide at once (and Undo restores); feed tips wait out the undo window,
        // because there is no "un-dismiss" on the server.
        if (candidate.dismiss.kind === 'local' && householdId) {
            hideLocalLine(householdId, candidate.id, candidate.dismiss.fingerprint);
        }
        const timer = window.setTimeout(() => {
            pending.current = null;
            if (candidate.dismiss.kind === 'feed') dismissFeed(candidate.dismiss.messageId);
            setUndo(null);
            setSettled(true);
            // Wait for the undo row to unmount before reading the focus.
            window.setTimeout(focusPageHeading, 0);
        }, UNDO_WINDOW_MS);
        pending.current = { candidate, timer };
    }

    function undoHide() {
        const waiting = pending.current;
        if (waiting) {
            window.clearTimeout(waiting.timer);
            pending.current = null;
        }
        if (undo?.dismiss.kind === 'local' && householdId) showLocalLine(householdId, undo.id);
        setUndo(null);
    }

    if (!coachOn) return null;

    if (undo) {
        return (
            <aside
                role="status"
                className={cn(
                    'flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl border border-line bg-surface px-4 py-2',
                    className
                )}>
                <p className="min-w-0 text-sm text-fg-muted">{t('hidden')}</p>
                <button
                    type="button"
                    ref={focusOnMount}
                    onClick={undoHide}
                    className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                    {t('undo')}
                </button>
            </aside>
        );
    }

    if (settled) return null;

    const candidate = selectCoachLineCandidate(candidates, { localHidden, isProductEnabled });
    if (!candidate) return null;

    function renderCta(cta: CoachLineCta, primary: boolean) {
        const locked = isCapabilityLocked(
            capabilityKeyForPathname(cta.href.split(/[?#]/)[0] ?? '')
        );
        return (
            <Link
                key={cta.href}
                href={cta.href}
                className={cn(
                    'inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-semibold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                    primary ? 'text-accent' : 'text-fg-secondary hover:text-accent'
                )}>
                <span className="min-w-0 wrap-anywhere">{cta.label}</span>
                {locked ? (
                    <>
                        <Icon name="lock" size="sm" aria-hidden className="shrink-0" />
                        <span className="font-mono text-xs font-medium text-fg-muted">
                            · {t('locked_suffix')}
                        </span>
                    </>
                ) : (
                    <span aria-hidden>→</span>
                )}
            </Link>
        );
    }

    return (
        <div className={cn('grid gap-1', className)} data-coach-guide="line">
            <aside
                aria-labelledby={labelId}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-line bg-surface p-4">
                <p
                    id={labelId}
                    className="order-1 font-mono text-[10px] font-bold tracking-[0.14em] text-accent uppercase">
                    <span aria-hidden>✦ </span>
                    {t('label')}
                </p>
                <button
                    type="button"
                    onClick={() => hide(candidate)}
                    aria-label={t('hide')}
                    className="order-2 -my-2 -mr-2 ml-auto grid size-11 shrink-0 place-items-center rounded-full text-fg-muted transition-colors outline-none hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:order-5">
                    <Icon name="x" size="sm" aria-hidden />
                </button>
                <p className="order-3 w-full min-w-0 text-sm text-pretty wrap-anywhere text-fg lg:w-auto lg:flex-1">
                    {candidate.text}
                </p>
                <div className="order-4 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-0 lg:shrink-0">
                    {renderCta(candidate.cta, true)}
                    {candidate.secondaryCta ? renderCta(candidate.secondaryCta, false) : null}
                </div>
            </aside>
            {footer}
        </div>
    );
}
