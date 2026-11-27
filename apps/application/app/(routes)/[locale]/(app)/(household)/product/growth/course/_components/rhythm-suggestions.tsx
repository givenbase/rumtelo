'use client';

import {
    CourseHorizon,
    CourseRhythmCadence,
    type CourseRhythmSuggestion,
} from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Button } from '@rumtelo/ui';

import { rhythmPatternLabel } from '@/app/_lib/course-rhythm';

import { periodLabel } from '../_utils/course-route';
import type { RhythmActions } from '../_utils/use-rhythm-actions';

/**
 * Proposals for the week being planned. Nothing is copied without a yes: keep going,
 * make it smaller, pause or stop — and renew a milestone whose month has ended.
 */
export function RhythmSuggestions({
    suggestions,
    week,
    actions,
    isBusy,
    isEmbedded = false,
}: {
    suggestions: readonly CourseRhythmSuggestion[];
    /** The week being planned. */
    week: string;
    actions: RhythmActions;
    isBusy: boolean;
    /** Inside the week check: no outer card, the step has its own heading. */
    isEmbedded?: boolean;
}) {
    const t = useTranslations('features.growth.course.rhythm');
    const tCourse = useTranslations('features.growth.course');
    const locale = useLocale();
    if (suggestions.length === 0) return null;

    const labelOf = (period: string) => {
        const horizon = period.includes('W')
            ? CourseHorizon.WEEK
            : period.includes('Q')
              ? CourseHorizon.QUARTER
              : period.length === 4
                ? CourseHorizon.YEAR
                : CourseHorizon.MONTH;
        return periodLabel(horizon, period, locale, {
            quarter: quarter => tCourse('quarter_short', { quarter }),
            week: weekNumber => tCourse('week_short', { week: weekNumber }),
        });
    };

    const list = (
        <ul className="grid gap-2">
            {suggestions.map(
                ({ rhythm, previousCount, previousTarget, previousPeriod, renewal }) => (
                    <li
                        key={rhythm.id}
                        className="grid gap-2 rounded-xl border border-line bg-card px-3 py-3 sm:px-4">
                        {renewal ? (
                            <>
                                <p className="text-sm text-fg">
                                    {t('suggest_renew', {
                                        name: renewal.name,
                                        from: labelOf(renewal.fromPeriod),
                                        to: labelOf(renewal.toPeriod),
                                    })}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={isBusy}
                                        onClick={() => actions.onRenew(rhythm)}>
                                        {renewal.targetCount
                                            ? t('renew_with_count', { count: renewal.targetCount })
                                            : t('renew')}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        disabled={isBusy}
                                        onClick={() => actions.onConfirm(rhythm, week)}>
                                        {t('not_now')}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-fg">
                                    {t('suggest_keep', {
                                        name: rhythm.name,
                                        done: previousCount,
                                        total: previousTarget,
                                        period: labelOf(previousPeriod),
                                        pattern: rhythmPatternLabel(rhythm, locale, t),
                                    })}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={isBusy}
                                        onClick={() => actions.onConfirm(rhythm, week)}>
                                        {t('keep_going')}
                                    </Button>
                                    {rhythm.cadence !== CourseRhythmCadence.DAILY &&
                                    rhythm.target > 1 ? (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="secondary"
                                            disabled={isBusy}
                                            onClick={() => actions.onSmaller(rhythm, week)}>
                                            {t('smaller', { count: rhythm.target - 1 })}
                                        </Button>
                                    ) : null}
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        disabled={isBusy}
                                        onClick={() => actions.onPause(rhythm)}>
                                        {t('action_pause')}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        disabled={isBusy}
                                        onClick={() => actions.onStop(rhythm)}>
                                        {t('action_stop')}
                                    </Button>
                                </div>
                            </>
                        )}
                    </li>
                )
            )}
        </ul>
    );

    if (isEmbedded) return list;

    return (
        <section
            aria-label={t('suggest_title')}
            className="grid gap-3 rounded-2xl border border-accent/40 bg-accent-soft/40 p-4 sm:p-5">
            <div className="grid gap-1">
                <p className="font-mono text-[11px] tracking-wide text-accent uppercase">
                    {t('suggest_eyebrow')}
                </p>
                <h2 className="text-base font-semibold text-fg sm:text-lg">{t('suggest_title')}</h2>
                <p className="text-sm text-fg-muted">{t('suggest_lead')}</p>
            </div>
            {list}
        </section>
    );
}
