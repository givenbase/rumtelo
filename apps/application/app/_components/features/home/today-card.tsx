'use client';

import Link from 'next/link';

import {
    CourseLane,
    CourseScheduleKind,
    addDays,
    minutesToHours,
    type CourseScheduleEntry,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { AccentCard, Icon, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import { CAPABILITIES } from '@/app/_lib/plan';
import { isLiveData } from '@/app/_lib/preview';
import { growthPath } from '@/app/_lib/routes';
import { useAuth } from '@/components/features/shell/auth-provider';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';

/**
 * Home › "Today": what Course › Schedule holds for today — your three, today's
 * routines, the next ritual and the sleep advice. Reads only; one link opens Schedule.
 */
export function TodayCard() {
    const t = useTranslations('features.growth.course.home_card');
    const locale = useLocale();
    const { householdId } = useAuth();
    const { hasCapability } = usePlanCapabilities();
    const live = isLiveData(householdId);
    // All of Course is Plus and Max; without it Home stays as it was.
    const hasCourse = hasCapability(CAPABILITIES.growthCourse);

    const today = new Date().toISOString().slice(0, 10);
    const scheduleQuery = useLiveQuery(
        apiQuery.growth.course.schedule.list.queryOptions({
            input: { householdId: householdId!, from: today, to: addDays(today, 6) },
        }),
        null,
        live && hasCourse
    );

    if (!hasCourse) return null;

    const entries = scheduleQuery.data?.entries ?? [];
    const focus = entries.find(
        entry =>
            entry.isMine &&
            (entry.kind === CourseScheduleKind.FOCUS_DAY ||
                (entry.kind === CourseScheduleKind.FOCUS_WEEK &&
                    entry.date <= today &&
                    entry.endDate >= today))
    );
    const rhythms = entries.filter(
        entry => entry.kind === CourseScheduleKind.RHYTHM && entry.date === today && entry.isMine
    );
    const nextCheck = entries.find(entry => entry.lane === CourseLane.CHECK && !entry.isDone);
    const sleep = entries.find(
        entry => entry.kind === CourseScheduleKind.SLEEP && entry.date === today
    );

    return (
        <AccentCard tint="var(--color-accent)" className="grid gap-3.5 p-5">
            <div className="flex items-center justify-between gap-3">
                <Typography
                    as="span"
                    variant="eyebrow"
                    color="primary"
                    className="flex items-center gap-2">
                    <Icon name="calendar-days" size="sm" aria-hidden />
                    {t('eyebrow')}
                </Typography>
                <Link
                    href={growthPath('course')}
                    className="font-mono text-xs font-medium text-fg-faint transition-colors hover:text-accent">
                    {t('open')}
                </Link>
            </div>

            {focus && focus.names.length > 0 ? (
                <ul className="grid gap-1.5" aria-label={t('focus_aria')}>
                    {focus.names.map((name, index) => (
                        <li
                            key={focus.sourceIds[index] ?? name}
                            className="flex items-center gap-2.5 text-sm">
                            <span aria-hidden className="size-2 shrink-0 rounded-full bg-accent" />
                            <span className="min-w-0 truncate text-fg">{name}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-fg-muted">{t('empty')}</p>
            )}

            {rhythms.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5" aria-label={t('rhythm_aria')}>
                    {rhythms.map(entry => (
                        <RhythmChip key={entry.key} entry={entry} />
                    ))}
                </ul>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 font-mono text-[11px] tracking-wide text-fg-muted uppercase">
                <span>
                    {focus && focus.totalCount
                        ? t('done', {
                              done: focus.doneCount ?? 0,
                              total: focus.totalCount,
                          })
                        : ''}
                </span>
                {nextCheck ? (
                    <span className={cn(nextCheck.isOverdue && 'text-fg')}>
                        {t('next_check', {
                            check: t(`check_${nextCheck.kind}`),
                            when:
                                nextCheck.date === today
                                    ? t('today')
                                    : new Intl.DateTimeFormat(locale, {
                                          weekday: 'long',
                                          timeZone: 'UTC',
                                      }).format(new Date(`${nextCheck.date}T00:00:00Z`)),
                        })}
                    </span>
                ) : null}
                {sleep && sleep.minutes !== null ? (
                    <span>
                        {t('sleep', {
                            hours: new Intl.NumberFormat(locale, {
                                maximumFractionDigits: 1,
                            }).format(minutesToHours(sleep.minutes)),
                        })}
                    </span>
                ) : null}
            </div>
        </AccentCard>
    );
}

function RhythmChip({ entry }: { entry: CourseScheduleEntry }) {
    return (
        <li
            className={cn(
                'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
                entry.isDone
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line text-fg-secondary'
            )}>
            <Icon name={entry.isDone ? 'check' : 'circle'} size="sm" aria-hidden />
            {entry.names[0]}
        </li>
    );
}
