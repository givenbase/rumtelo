'use client';

import Link from 'next/link';

import {
    CourseLane,
    CourseRitual,
    CourseScheduleKind,
    minutesToHours,
    type CourseScheduleEntry,
} from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Button, Icon } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { badgeKindOf, monthCloseStateOf } from '../_utils/course-view';
import { CourseBadge } from './course-badge';

/**
 * A ritual or advice row. Rituals link to where they are done; the month close steps
 * from "plan it" to "today" to "still open" and can be snoozed once to its last day.
 * Advice is information, never a task: no tick box.
 */
export function CourseEntryRow({
    entry,
    today,
    showDate,
    onSnooze,
    isBusy,
}: {
    entry: CourseScheduleEntry;
    today: string;
    showDate: boolean;
    onSnooze: (entry: CourseScheduleEntry) => void;
    isBusy: boolean;
}) {
    const t = useTranslations('features.growth.course.entry');
    const locale = useLocale();
    const dateLabel = (iso: string) =>
        new Intl.DateTimeFormat(locale, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            timeZone: 'UTC',
        }).format(new Date(`${iso}T00:00:00Z`));
    const monthLabel = (period: string | null) =>
        period
            ? new Intl.DateTimeFormat(locale, {
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'UTC',
              }).format(new Date(`${period}-01T00:00:00Z`))
            : '';
    const hours = (minutes: number | null) => {
        const value = minutesToHours(minutes ?? 0);
        return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
    };

    let title = '';
    let detail: string | null = null;
    let canSnooze = false;
    switch (entry.kind) {
        case CourseScheduleKind.GROWTH_WEEK_CHECK:
            title = t('growth_week_check');
            detail = entry.isDone ? t('done') : t('growth_week_check_lead');
            break;
        case CourseScheduleKind.MONEY_WEEK_CHECK:
            title = t('money_week_check');
            detail = entry.isDone ? t('done') : t('money_week_check_lead');
            break;
        case CourseScheduleKind.MONTH_CLOSE: {
            const state = monthCloseStateOf(entry, today);
            const month = monthLabel(entry.period);
            title =
                state === 'overdue'
                    ? t('month_close_overdue', { month })
                    : state === 'reminder'
                      ? t('month_close_reminder', { month })
                      : t('month_close', { month });
            detail =
                state === 'done'
                    ? t('done')
                    : state === 'overdue'
                      ? t('month_close_overdue_lead')
                      : state === 'reminder'
                        ? t('month_close_reminder_lead', { date: dateLabel(entry.date) })
                        : state === 'due'
                          ? t('month_close_due_lead')
                          : null;
            canSnooze =
                state === 'reminder' &&
                !entry.isSnoozed &&
                entry.ritual === CourseRitual.MONTH_CLOSE;
            break;
        }
        case CourseScheduleKind.SLEEP: {
            title = t('sleep', { hours: hours(entry.minutes) });
            const isUnder =
                entry.minutes !== null &&
                entry.adviceLowMinutes !== null &&
                entry.minutes < entry.adviceLowMinutes;
            detail = isUnder
                ? t('sleep_under', {
                      low: hours(entry.adviceLowMinutes),
                      high: hours(entry.adviceHighMinutes),
                  })
                : t('sleep_advice', {
                      low: hours(entry.adviceLowMinutes),
                      high: hours(entry.adviceHighMinutes),
                  });
            break;
        }
        default:
            title = entry.names.join(' · ');
    }

    const isAdvice = entry.lane === CourseLane.ADVICE;

    return (
        <div
            className={cn(
                'flex flex-wrap items-center gap-3 rounded-2xl border bg-card px-4 py-3',
                isAdvice ? 'border-dashed border-line-strong' : 'border-line',
                entry.isOverdue && 'border-warning/60'
            )}>
            {isAdvice ? (
                <Icon name="moon" size="sm" className="text-fg-muted" aria-hidden />
            ) : (
                <span
                    aria-hidden
                    className={cn(
                        'grid size-7 shrink-0 place-items-center rounded-full border-2',
                        entry.isDone
                            ? 'border-accent bg-accent text-on-accent'
                            : 'border-line-strong text-transparent'
                    )}>
                    <Icon name="check" size="sm" aria-hidden />
                </span>
            )}
            <div className="grid min-w-0 flex-1 gap-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                    <CourseBadge kind={badgeKindOf(entry)} />
                    {showDate ? (
                        <span className="font-mono text-[10px] tracking-wide text-fg-muted uppercase">
                            {dateLabel(entry.date)}
                        </span>
                    ) : null}
                </div>
                <p className="text-sm font-medium text-fg">{title}</p>
                {detail ? <p className="text-xs text-fg-muted">{detail}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
                {canSnooze ? (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={isBusy}
                        onClick={() => onSnooze(entry)}>
                        {t('snooze')}
                    </Button>
                ) : null}
                {!isAdvice && !entry.isDone ? (
                    <Link
                        href={entry.href}
                        className="inline-flex h-9 items-center gap-1 rounded-full border border-line px-3 text-xs font-medium text-fg hover:bg-raised">
                        {t('open')}
                        <Icon name="arrow-right" size="sm" aria-hidden />
                    </Link>
                ) : null}
            </div>
        </div>
    );
}
