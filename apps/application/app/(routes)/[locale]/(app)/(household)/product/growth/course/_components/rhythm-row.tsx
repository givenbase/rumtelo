'use client';

import {
    CourseHorizon,
    CourseRhythmKind,
    coursePeriodOf,
    isoWeekdayOf,
    type CourseRhythm,
} from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Icon,
} from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { rhythmPatternLabel } from '@/app/_lib/course-rhythm';
import { VisibilityBadge } from '@/components/features/household/visibility-badge';

import type { RhythmActions } from '../_utils/use-rhythm-actions';
import { CourseBadge } from './course-badge';

/**
 * One routine: name, the goal it feeds, its pattern and seven day boxes. A discipline
 * also shows the count of its period; a habit only asks "done?". Counting, never
 * scoring: an empty box is a day, not a failure — no streaks, no red.
 */
export function RhythmRow({
    rhythm,
    days,
    today,
    makerName,
    isPickerShown,
    actions,
    isBusy,
    onEdit,
}: {
    rhythm: CourseRhythm;
    /** Monday … Sunday of the week on screen. */
    days: readonly string[];
    today: string;
    makerName: string | null;
    isPickerShown: boolean;
    actions: RhythmActions;
    isBusy: boolean;
    onEdit?: (rhythm: CourseRhythm) => void;
}) {
    const t = useTranslations('features.growth.course.rhythm');
    const locale = useLocale();
    const ticks = new Set(rhythm.ticks);
    const pattern = new Set(rhythm.weekdays ?? []);
    const parentNow =
        rhythm.parentHorizon !== null ? coursePeriodOf(rhythm.parentHorizon, new Date()) : null;
    const isRenewable =
        rhythm.canEdit &&
        rhythm.parentPeriod !== null &&
        parentNow !== null &&
        rhythm.parentPeriod < parentNow;
    const isHabit = rhythm.kind === CourseRhythmKind.HABIT;
    const countLabel =
        rhythm.periodHorizon === CourseHorizon.MONTH
            ? t('count_month', { done: rhythm.periodCount, total: rhythm.periodTarget })
            : t('count_week', { done: rhythm.periodCount, total: rhythm.periodTarget });

    return (
        <article
            className={cn(
                'grid gap-3 rounded-2xl border border-line bg-card p-4 sm:p-5',
                rhythm.isPaused && 'opacity-70'
            )}>
            <div className="flex items-start gap-3">
                <div className="grid min-w-0 flex-1 gap-1">
                    {rhythm.parentName || rhythm.isParentHidden ? (
                        <p className="truncate text-xs text-fg-muted">
                            <span aria-hidden>← </span>
                            {rhythm.parentName ?? t('private_parent')}
                        </p>
                    ) : null}
                    <h3 className="text-base leading-snug font-semibold text-fg">{rhythm.name}</h3>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
                        <CourseBadge kind={isHabit ? 'HABIT' : 'DISCIPLINE'} />
                        <span>{rhythmPatternLabel(rhythm, locale, t)}</span>
                        {rhythm.isPaused ? (
                            <span className="rounded-full bg-raised px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase">
                                {t('paused')}
                            </span>
                        ) : null}
                        {isPickerShown ? (
                            <VisibilityBadge
                                accountId={rhythm.accountId}
                                visibility={rhythm.visibility}
                                makerName={rhythm.isMine ? null : makerName}
                            />
                        ) : null}
                    </div>
                </div>

                {rhythm.canEdit ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            disabled={isBusy}
                            aria-label={t('menu_aria', { name: rhythm.name })}
                            className="grid size-9 shrink-0 place-items-center rounded-full text-fg-muted hover:bg-raised hover:text-fg">
                            <Icon name="ellipsis" aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {onEdit ? (
                                <DropdownMenuItem onSelect={() => onEdit(rhythm)}>
                                    {t('action_edit')}
                                </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem onSelect={() => actions.onMakeFocus(rhythm)}>
                                {t('action_focus')}
                            </DropdownMenuItem>
                            {rhythm.isPaused ? (
                                <DropdownMenuItem onSelect={() => actions.onResume(rhythm)}>
                                    {t('action_resume')}
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem onSelect={() => actions.onPause(rhythm)}>
                                    {t('action_pause')}
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => actions.onStop(rhythm)}>
                                {t('action_stop')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <ul className="flex gap-1.5" aria-label={t('days_aria', { name: rhythm.name })}>
                    {days.map(day => {
                        const isTicked = ticks.has(day);
                        const isFuture = day > today;
                        const isPatternDay = pattern.size === 0 || pattern.has(isoWeekdayOf(day));
                        const label = new Intl.DateTimeFormat(locale, {
                            weekday: 'short',
                            day: 'numeric',
                            timeZone: 'UTC',
                        }).format(new Date(`${day}T00:00:00Z`));
                        return (
                            <li key={day}>
                                <button
                                    type="button"
                                    disabled={!rhythm.canEdit || isFuture || rhythm.isPaused}
                                    onClick={() => actions.onToggleDay(rhythm, day)}
                                    aria-pressed={isTicked}
                                    aria-label={
                                        isTicked
                                            ? t('untick_day', { day: label })
                                            : t('tick_day', { day: label })
                                    }
                                    className={cn(
                                        'grid size-9 place-items-center rounded-lg border font-mono text-[10px] uppercase transition-colors disabled:cursor-default sm:size-10',
                                        isTicked
                                            ? 'border-accent bg-accent text-on-accent'
                                            : isPatternDay
                                              ? 'border-line-strong text-fg-secondary hover:border-accent'
                                              : 'border-dashed border-line text-fg-faint hover:border-accent',
                                        day === today && !isTicked && 'ring-2 ring-accent/30',
                                        isFuture && 'opacity-50'
                                    )}>
                                    {isTicked ? (
                                        <Icon name="check" size="sm" aria-hidden />
                                    ) : (
                                        label.slice(0, 2)
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
                {isHabit ? null : (
                    <p className="font-mono text-xs tracking-wide text-fg-secondary">
                        {countLabel}
                    </p>
                )}
            </div>

            {isRenewable ? (
                <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => actions.onRenew(rhythm)}
                    className="justify-self-start text-sm font-medium text-accent hover:underline">
                    {t('renew_inline', { name: rhythm.parentName ?? '' })}
                </button>
            ) : null}
        </article>
    );
}
