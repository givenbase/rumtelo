'use client';

import type { MonthScoreEvent } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Eyebrow } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { monthScoreLevelLabel } from '@/app/_lib/month-score-copy';

export type { MonthScoreEvent };

/** `YYYY-MM-DD` → day-of-month without a leading zero. */
function dayOfMonth(isoDate: string): number {
    return Number(isoDate.slice(8, 10));
}

/**
 * Month score log (design: dashboard "Month score" section).
 *
 * Displays the current month's score, days left, and the timestamped event log.
 */
export function MonthScoreLog({
    score,
    daysLeft,
    level,
    events,
}: {
    score: number;
    daysLeft: number;
    level: number;
    events: readonly Pick<MonthScoreEvent, 'occurredOn' | 'text' | 'points' | 'kind'>[];
}) {
    const t = useTranslations('pages.dashboard.month_score');
    const tDashboard = useTranslations('pages.dashboard');
    const levelLabel = monthScoreLevelLabel(tDashboard, level);

    return (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-md">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3.5">
                <Eyebrow>{t('eyebrow')}</Eyebrow>
                <span className="flex items-baseline gap-2">
                    <span className="font-mono text-xs font-medium tracking-widest text-fg-faint uppercase">
                        {t('label')}
                    </span>
                    <span className="font-display text-2xl font-semibold tracking-tight text-accent">
                        {score}
                    </span>
                    <span className="font-mono text-xs font-medium tracking-wide text-fg-muted uppercase">
                        {levelLabel}
                    </span>
                    <span className="font-mono text-xs text-fg-faint">
                        {daysLeft === 1
                            ? t('days_left_one')
                            : t('days_left_other', { count: daysLeft })}
                    </span>
                </span>
            </div>

            {/* Event log */}
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
        </div>
    );
}
