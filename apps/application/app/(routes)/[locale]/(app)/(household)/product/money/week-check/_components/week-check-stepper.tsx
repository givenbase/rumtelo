'use client';

import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import type { StepKey, WeekCheckStep } from '../_utils/week-check-steps';

const LABEL_KEYS: Record<
    StepKey,
    | 'look_label'
    | 'direct_label'
    | 'intend_label'
    | 'step_course_back'
    | 'step_course_routines'
    | 'step_course_ahead'
> = {
    LOOK: 'look_label',
    REDIRECT: 'direct_label',
    INTEND: 'intend_label',
    COURSE_BACK: 'step_course_back',
    COURSE_ROUTINES: 'step_course_routines',
    COURSE_AHEAD: 'step_course_ahead',
};

/**
 * Where you are in the week check. Phone: a segmented bar plus the current stage name.
 * `sm`+: grouped chips. Done steps go back; steps to come are plain items, never skippable.
 */
export function WeekCheckStepper({
    steps,
    current,
    moneyWeekNumber,
    courseWeekNumber,
    onGoBackTo,
}: {
    steps: readonly WeekCheckStep[];
    current: number;
    moneyWeekNumber: number;
    courseWeekNumber: number;
    onGoBackTo: (index: number) => void;
}) {
    const t = useTranslations('features.money.week_check');
    const stepLabel = (step: WeekCheckStep) => t(LABEL_KEYS[step.key]);
    const groups = (['money', 'course'] as const)
        .map(group => ({
            group,
            items: steps
                .map((step, index) => ({ step, index }))
                .filter(item => item.step.group === group),
        }))
        .filter(entry => entry.items.length > 0);
    const currentStep = steps[current];

    return (
        <div className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
            <p role="status" className="text-xs text-fg-muted">
                {t('progress', { current: current + 1, total: steps.length })}
            </p>

            {/* Phone: segments */}
            <div className="grid gap-2 sm:hidden">
                <div className="flex gap-3" aria-hidden="true">
                    {groups.map(entry => (
                        <div key={entry.group} className="grid min-w-0 flex-1 gap-1.5">
                            <span className="font-mono text-[10px] tracking-widest text-fg-muted uppercase">
                                {entry.group === 'money'
                                    ? t('group_money', { week: moneyWeekNumber })
                                    : t('group_course', { week: courseWeekNumber })}
                            </span>
                            <span className="flex gap-1">
                                {entry.items.map(item => (
                                    <span
                                        key={item.step.key}
                                        className={cn(
                                            'h-1.5 flex-1 rounded-full',
                                            item.index <= current ? 'bg-accent' : 'bg-line',
                                            item.index === current && 'ring-2 ring-accent/30'
                                        )}
                                    />
                                ))}
                            </span>
                        </div>
                    ))}
                </div>
                {currentStep ? (
                    <p className="text-sm font-semibold text-fg">{stepLabel(currentStep)}</p>
                ) : null}
            </div>

            {/* sm+: grouped chips */}
            <ol aria-label={t('steps_aria')} className="hidden flex-wrap gap-x-6 gap-y-3 sm:flex">
                {groups.map(entry => (
                    <li key={entry.group} className="grid gap-1.5">
                        <span className="font-mono text-[10px] tracking-widest text-fg-muted uppercase">
                            {entry.group === 'money'
                                ? t('group_money', { week: moneyWeekNumber })
                                : t('group_course', { week: courseWeekNumber })}
                        </span>
                        <ol className="flex flex-wrap gap-1.5">
                            {entry.items.map(item => {
                                const isCurrent = item.index === current;
                                const isDone = item.index < current;
                                const chip = cn(
                                    'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium',
                                    isCurrent
                                        ? 'border-accent bg-accent text-on-accent'
                                        : isDone
                                          ? 'border-accent/30 bg-accent-soft text-accent'
                                          : 'border-line bg-raised text-fg-muted'
                                );
                                const text = `${item.index + 1} · ${stepLabel(item.step)}`;
                                return (
                                    <li key={item.step.key}>
                                        {isDone ? (
                                            <button
                                                type="button"
                                                onClick={() => onGoBackTo(item.index)}
                                                aria-label={t('step_go_back', {
                                                    step: stepLabel(item.step),
                                                })}
                                                className={cn(
                                                    chip,
                                                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
                                                )}>
                                                {text}
                                            </button>
                                        ) : (
                                            <span
                                                aria-current={isCurrent ? 'step' : undefined}
                                                className={chip}>
                                                {text}
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    </li>
                ))}
            </ol>
        </div>
    );
}
