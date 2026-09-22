'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { TimeTemplate } from '@rumtelo/contracts';
import { TimeDayKind } from '@rumtelo/contracts';
import { Button, Eyebrow } from '@rumtelo/ui';
import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import { useApiError } from '@/app/_lib/api-error-messages';
import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useAppShell } from '@/components/features/shell/app-shell-context';

import type { DayMinutes } from '../_utils/day-shape';
import {
    DEFAULT_SHAPE,
    DEFAULT_WEEKDAYS,
    dayOffFromWorkday,
    describeShape,
    finalizeDay,
    overDay,
    shapeFromMinutes,
    weekdayShort,
} from '../_utils/day-shape';
import { ShapeEditor } from './shape-editor';

type Step = 'weekdays' | 'workday' | 'dayOff';
const STEPS: readonly Step[] = ['weekdays', 'workday', 'dayOff'];

type Props = {
    householdId: string;
    /** Existing templates when re-running the wizard. */
    templates: ReadonlyArray<TimeTemplate>;
    onDone: () => void;
    onCancel?: () => void;
};

/**
 * "How does your week mostly look?" Three screens, about ninety seconds. Produces
 * the two shapes the daily check-in copies from.
 */
export function WeekSetupWizard({ householdId, templates, onDone, onCancel }: Props) {
    const t = useTranslations();
    const tw = useTranslations('features.energy.week.setup');
    const ts = useTranslations('features.energy.week.shape');
    const apiError = useApiError();
    const weekdays = weekdayShort(ts);
    const queryClient = useQueryClient();
    const { showToast } = useAppShell();

    const existing = (kind: TimeDayKind) => templates.find(template => template.kind === kind);

    const [step, setStep] = useState<Step>('weekdays');
    const [workdays, setWorkdays] = useState<number[]>(
        () => existing(TimeDayKind.WORKDAY)?.weekdays ?? DEFAULT_WEEKDAYS[TimeDayKind.WORKDAY]
    );
    const [workday, setWorkday] = useState<DayMinutes>(() => {
        const template = existing(TimeDayKind.WORKDAY);
        return template ? shapeFromMinutes(template.minutes) : DEFAULT_SHAPE[TimeDayKind.WORKDAY];
    });
    // Null until the day-off screen opens: it is then derived from the workday just described.
    const [dayOffDraft, setDayOffDraft] = useState<DayMinutes | null>(() => {
        const template = existing(TimeDayKind.DAY_OFF);
        return template ? shapeFromMinutes(template.minutes) : null;
    });
    const dayOff =
        dayOffDraft ??
        (workdays.length > 0 ? dayOffFromWorkday(workday) : DEFAULT_SHAPE[TimeDayKind.DAY_OFF]);
    const setDayOff = (next: DayMinutes) => setDayOffDraft(next);

    const daysOff = [1, 2, 3, 4, 5, 6, 7].filter(day => !workdays.includes(day));
    const stepIndex = STEPS.indexOf(step);

    const saveMutation = useMutation({
        mutationFn: () =>
            api.energy.timeTemplates.create({
                householdId,
                templates: [
                    {
                        kind: TimeDayKind.WORKDAY,
                        weekdays: workdays,
                        minutes: finalizeDay(workday),
                    },
                    { kind: TimeDayKind.DAY_OFF, weekdays: daysOff, minutes: finalizeDay(dayOff) },
                ],
            }),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: apiQuery.energy.timeTemplates.list.key(),
                }),
                queryClient.invalidateQueries({ queryKey: apiQuery.coach.feed.key() }),
                queryClient.invalidateQueries({ queryKey: apiQuery.energy.dashboard.get.key() }),
            ]);
            showToast(t('common.message.entity.week_set'), 'success');
            onDone();
        },
        onError: (error: Error) => showToast(apiError(error), 'error'),
    });

    const canContinue =
        step === 'weekdays' ? true : step === 'workday' ? !overDay(workday) : !overDay(dayOff);

    return (
        <div className="grid gap-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <Eyebrow>{tw('eyebrow')}</Eyebrow>
                    <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
                        {step === 'weekdays'
                            ? tw('lead_weekdays')
                            : step === 'workday'
                              ? tw('lead_workday')
                              : workdays.length === 0
                                ? tw('lead_dayoff_none')
                                : tw('lead_dayoff')}
                    </p>
                </div>
                <ol className="flex items-center gap-1.5" aria-label={tw('progress_aria')}>
                    {STEPS.map((candidate, index) => (
                        <li
                            key={candidate}
                            aria-current={candidate === step ? 'step' : undefined}
                            className={cn(
                                'h-1.5 w-8 rounded-full',
                                index <= stepIndex ? 'bg-accent' : 'bg-sunken'
                            )}
                        />
                    ))}
                </ol>
            </div>

            {step === 'weekdays' ? (
                <fieldset className="grid gap-3">
                    <legend className="text-sm font-medium text-fg">{tw('weekdays_legend')}</legend>
                    <div className="flex flex-wrap gap-2">
                        {weekdays.map((name, index) => {
                            const day = index + 1;
                            const on = workdays.includes(day);
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() =>
                                        setWorkdays(current =>
                                            on
                                                ? current.filter(value => value !== day)
                                                : [...current, day].sort(
                                                      (left, right) => left - right
                                                  )
                                        )
                                    }
                                    className={cn(
                                        'h-10 w-14 rounded-xl border font-mono text-xs transition-colors',
                                        on
                                            ? 'border-accent bg-accent text-on-accent'
                                            : 'border-line bg-raised text-fg-secondary hover:border-line-strong'
                                    )}>
                                    {name}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-xs text-fg-muted">
                        {workdays.length === 0
                            ? tw('weekdays_none')
                            : workdays.length === 7
                              ? tw('weekdays_all')
                              : tw('weekdays_mixed', {
                                    workdays: workdays.length,
                                    off: daysOff.length,
                                })}
                    </p>
                </fieldset>
            ) : step === 'workday' ? (
                <ShapeEditor key="work" idPrefix="tpl-work" value={workday} onChange={setWorkday} />
            ) : (
                <ShapeEditor
                    key="off"
                    idPrefix="tpl-off"
                    value={dayOff}
                    onChange={setDayOff}
                    variant="dayOff"
                    reference={workdays.length > 0 ? workday : undefined}
                />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <span className="font-mono text-xs text-fg-muted">
                    {step === 'workday'
                        ? describeShape(workday, ts)
                        : step === 'dayOff'
                          ? describeShape(dayOff, ts)
                          : ''}
                </span>
                <div className="flex items-center gap-2">
                    {stepIndex > 0 ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setStep(STEPS[stepIndex - 1]!)}>
                            {t('ui.button.actions.back')}
                        </Button>
                    ) : onCancel ? (
                        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                            {t('ui.button.actions.cancel')}
                        </Button>
                    ) : null}
                    {step === 'dayOff' ? (
                        <Button
                            type="button"
                            disabled={!canContinue || saveMutation.isPending}
                            onClick={() => saveMutation.mutate()}>
                            {saveMutation.isPending ? t('ui.form.saving') : tw('save_typical')}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            disabled={!canContinue}
                            onClick={() => {
                                // Skip the workday screen for people who never work.
                                if (step === 'weekdays' && workdays.length === 0) setStep('dayOff');
                                else if (step === 'workday' && daysOff.length === 0)
                                    saveMutation.mutate();
                                else setStep(STEPS[stepIndex + 1]!);
                            }}>
                            {t('ui.button.actions.continue')}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
