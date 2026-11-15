import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import { monthName, monthsOfYear } from '../_utils/course-goals';

/**
 * Twelve months of one goal: a filled segment means the month has a step under it, the
 * viewed month wears a ring. Each segment says the same in words for screen readers.
 */
export function CourseGoalTimeline({
    year,
    filled,
    currentMonth,
    locale,
}: {
    year: string;
    filled: readonly boolean[];
    currentMonth: string;
    locale: string;
}) {
    const t = useTranslations('features.growth.course.goal');
    return (
        <ol aria-label={t('timeline_aria', { year })} className="grid grid-cols-12 gap-1.5">
            {monthsOfYear(year).map((month, index) => {
                const isFilled = filled[index] === true;
                const isCurrent = month === currentMonth;
                return (
                    <li key={month} className="grid justify-items-center gap-1">
                        <span
                            className={cn(
                                'h-2.5 w-full rounded-full',
                                isFilled ? 'bg-accent' : 'bg-raised',
                                isCurrent && 'ring-2 ring-fg ring-offset-2 ring-offset-card'
                            )}
                        />
                        <span
                            aria-hidden
                            className={cn(
                                'font-mono text-[10px] uppercase',
                                isCurrent ? 'font-semibold text-fg' : 'text-fg-muted'
                            )}>
                            {monthName(month, locale, 'narrow')}
                        </span>
                        <span className="sr-only">
                            {`${monthName(month, locale, 'long')}: ${isFilled ? t('timeline_step') : t('timeline_no_step')}`}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}
