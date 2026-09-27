'use client';

import Link from 'next/link';

import type { MonthCloseBlockers, MonthScoreEvent } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Eyebrow } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { monthScoreLevelLabel } from '@/app/_lib/month-score-copy';
import { ConfirmActionButton } from '@/components/features/forms/confirm-action-button';

export type { MonthScoreEvent };

/** `YYYY-MM-DD` → day-of-month without a leading zero. */
function dayOfMonth(isoDate: string): number {
    return Number(isoDate.slice(8, 10));
}

function closeReady(blockers: MonthCloseBlockers | null | undefined): boolean {
    if (!blockers) return true;
    return blockers.inboxCount === 0 && blockers.dueBillCount === 0;
}

/**
 * Month score log — score, close gate, optional period-travel note, event log.
 * Looking-back / looking-ahead copy lives here (not as a separate Coach slide).
 */
export function MonthScoreLog({
    score,
    daysLeft,
    level,
    events,
    isClosed = false,
    closeBlockers = null,
    periodNote = null,
    onCloseMonth,
    closeMonthPending = false,
    canCloseMonth = false,
    /** Coach quiet-state: score + close gate, no event log. */
    compact = false,
}: {
    score: number;
    daysLeft: number;
    level: number;
    events?: readonly Pick<MonthScoreEvent, 'occurredOn' | 'text' | 'points' | 'kind'>[];
    isClosed?: boolean;
    closeBlockers?: MonthCloseBlockers | null;
    /** Compact looking-back / looking-ahead line for stacked periods. */
    periodNote?: string | null;
    /** Close the open month score — shown in the header when available. */
    onCloseMonth?: () => void;
    closeMonthPending?: boolean;
    canCloseMonth?: boolean;
    compact?: boolean;
}) {
    const t = useTranslations('pages.dashboard.month_score');
    const tDashboard = useTranslations('pages.dashboard');
    const levelLabel = monthScoreLevelLabel(tDashboard, level);
    const ready = closeReady(closeBlockers);
    const blockerLines: string[] = [];
    if (closeBlockers && !ready) {
        if (closeBlockers.inboxCount === 1) {
            blockerLines.push(tDashboard('close_blocked_inbox_one'));
        } else if (closeBlockers.inboxCount > 1) {
            blockerLines.push(
                tDashboard('close_blocked_inbox_other', { count: closeBlockers.inboxCount })
            );
        }
        if (closeBlockers.dueBillCount > 0) {
            const names =
                closeBlockers.dueBillNames.length > 0
                    ? tDashboard('close_blocked_bill_names', {
                          list: closeBlockers.dueBillNames.join(', '),
                      })
                    : '';
            blockerLines.push(
                closeBlockers.dueBillCount === 1
                    ? tDashboard('close_blocked_bills_one', { names })
                    : tDashboard('close_blocked_bills_other', {
                          count: closeBlockers.dueBillCount,
                          names,
                      })
            );
        }
    }

    return (
        <div
            className={cn(
                'rounded-2xl border bg-surface p-6 shadow-md',
                isClosed ? 'border-success/35 ring-1 ring-success/15' : 'border-line'
            )}>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3.5">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                    <Eyebrow>{t('eyebrow')}</Eyebrow>
                    <span className="flex flex-wrap items-baseline gap-2">
                        <span className="font-mono text-xs font-medium tracking-widest text-fg-faint uppercase">
                            {t('label')}
                        </span>
                        <span className="font-display text-2xl font-semibold tracking-tight text-accent">
                            {score}
                        </span>
                        <span className="font-mono text-xs font-medium tracking-wide text-fg-muted uppercase">
                            {levelLabel}
                        </span>
                        {isClosed ? (
                            <span className="rounded-full bg-success/15 px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.12em] text-success uppercase">
                                {t('closed_badge')}
                            </span>
                        ) : (
                            <span className="font-mono text-xs text-fg-faint">
                                {daysLeft === 1
                                    ? t('days_left_one')
                                    : t('days_left_other', { count: daysLeft })}
                            </span>
                        )}
                    </span>
                </div>
                {canCloseMonth && onCloseMonth ? (
                    <ConfirmActionButton
                        size="sm"
                        label={tDashboard('close_month')}
                        confirmLabel={tDashboard('close_month_confirm')}
                        pendingLabel={tDashboard('closing')}
                        pending={closeMonthPending}
                        disabled={!ready}
                        onConfirm={onCloseMonth}
                    />
                ) : null}
            </div>

            {periodNote ? (
                <p className="mt-3 text-sm text-pretty text-fg-secondary">{periodNote}</p>
            ) : null}

            {isClosed ? (
                <p
                    className={cn(
                        'text-sm text-pretty text-fg-secondary',
                        periodNote ? 'mt-1.5' : 'mt-3'
                    )}>
                    {t('closed_hint')}
                </p>
            ) : canCloseMonth ? (
                <p
                    className={cn(
                        'text-sm text-pretty text-fg-muted',
                        periodNote ? 'mt-1.5' : 'mt-3'
                    )}>
                    {t('close_explain')}
                </p>
            ) : null}

            {!isClosed && blockerLines.length > 0 ? (
                <div className="mt-3 rounded-xl border border-warning/30 bg-warning/8 px-3.5 py-3">
                    <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-warning uppercase">
                        {tDashboard('close_blocked_title')}
                    </p>
                    <ul className="mt-2 grid gap-1.5 text-sm text-fg-secondary">
                        {blockerLines.map(line => (
                            <li key={line}>· {line}</li>
                        ))}
                    </ul>
                    <div className="mt-2.5 flex flex-wrap gap-3 font-mono text-xs font-medium tracking-wide uppercase">
                        {closeBlockers && closeBlockers.inboxCount > 0 ? (
                            <Link
                                href="/product/money/transactions"
                                className="text-accent transition-colors hover:text-accent-hover">
                                {tDashboard('coach.sort_inbox')} ▸
                            </Link>
                        ) : null}
                        {closeBlockers && closeBlockers.dueBillCount > 0 ? (
                            <Link
                                href="/product/money/fixed-costs"
                                className="text-accent transition-colors hover:text-accent-hover">
                                {tDashboard('close_blocked_open_bills')}
                            </Link>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {!compact && events && events.length > 0 ? (
                <div className="mt-4.5 grid gap-0">
                    {events.map(entry => (
                        <div
                            key={`${entry.occurredOn}-${entry.text}`}
                            className="flex items-baseline gap-2.5 border-b border-line py-3 last:border-b-0 last:pb-0">
                            <span className="w-14 shrink-0 font-mono text-xs text-fg-faint">
                                {dayOfMonth(entry.occurredOn)}
                            </span>
                            <span className="min-w-0 flex-1 text-sm text-pretty text-fg-secondary">
                                {entry.text}
                            </span>
                            <span
                                className={cn(
                                    'shrink-0 font-mono text-xs',
                                    entry.points < 0 ? 'text-danger' : 'text-success'
                                )}>
                                {entry.points > 0 ? `+${entry.points}` : entry.points}
                            </span>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
