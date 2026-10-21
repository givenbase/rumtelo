'use client';

import { CourseRhythmKind, type CourseRhythm } from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Icon } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { rhythmPatternLabel } from '@/app/_lib/course-rhythm';

import type { RhythmActions } from '../_utils/use-rhythm-actions';
import { CourseBadge } from './course-badge';

/** Today's routine as one tick. A discipline also shows the count of its period. */
export function RhythmTodayRow({
    rhythm,
    today,
    actions,
}: {
    rhythm: CourseRhythm;
    today: string;
    actions: RhythmActions;
}) {
    const t = useTranslations('features.growth.course.rhythm');
    const locale = useLocale();
    const isTicked = rhythm.ticks.includes(today);
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3">
            <button
                type="button"
                disabled={!rhythm.canEdit || rhythm.isPaused}
                onClick={() => actions.onToggleDay(rhythm, today)}
                aria-pressed={isTicked}
                aria-label={
                    isTicked
                        ? t('untick_today', { name: rhythm.name })
                        : t('tick_today', { name: rhythm.name })
                }
                className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors disabled:cursor-default',
                    isTicked
                        ? 'border-accent bg-accent text-on-accent'
                        : 'border-line-strong text-transparent hover:border-accent'
                )}>
                <Icon name="check" size="sm" aria-hidden />
            </button>
            <div className="grid min-w-0 flex-1 gap-0.5">
                <CourseBadge
                    kind={rhythm.kind === CourseRhythmKind.HABIT ? 'HABIT' : 'DISCIPLINE'}
                    className="justify-self-start"
                />
                <p
                    className={cn(
                        'truncate text-sm font-medium text-fg',
                        isTicked && 'text-fg-muted line-through'
                    )}>
                    {rhythm.name}
                </p>
                <p className="truncate text-xs text-fg-muted">
                    {rhythmPatternLabel(rhythm, locale, t)}
                </p>
            </div>
            {rhythm.kind === CourseRhythmKind.DISCIPLINE ? (
                <span className="font-mono text-xs tracking-wide text-fg-secondary">
                    {rhythm.periodCount}/{rhythm.periodTarget}
                </span>
            ) : null}
        </div>
    );
}
