'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { TimeTemplate } from '@rumtelo/contracts';
import { TimeDayKind } from '@rumtelo/contracts';
import { Button, Eyebrow } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useAppShell } from '@/components/features/shell/app-shell-context';

import type { DayMinutes } from './day-shape';
import {
    DEFAULT_SHAPE,
    DEFAULT_WEEKDAYS,
    WEEKDAY_SHORT,
    dayOffFromWorkday,
    describeShape,
    finalizeDay,
    overDay,
    shapeFromMinutes,
} from './day-shape';
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
            await queryClient.invalidateQueries({
                queryKey: apiQuery.energy.timeTemplates.list.key(),
            });
            showToast('Your typical week is set', 'success');
            onDone();
        },
        onError: (error: Error) => showToast(error.message || 'Could not save', 'error'),
    });

    const canContinue =
        step === 'weekdays' ? true : step === 'workday' ? !overDay(workday) : !overDay(dayOff);

    return (
        <div className="grid gap-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <Eyebrow>How does your week mostly look?</Eyebrow>
                    <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
                        {step === 'weekdays'
                            ? 'Three quick screens. Afterwards, logging a day is one question.'
                            : step === 'workday'
                              ? 'A typical workday. Rough answers are fine — you correct the days that differ.'
                              : workdays.length === 0
                                ? 'A typical day. Most of it is yours to steer, so that comes first.'
                                : 'A typical day off. We started from your workday — no work, an hour more sleep, half the travel. Most of the day is now yours to steer, so that comes first; below it, change what else differs.'}
                    </p>
                </div>
                <ol className="flex items-center gap-1.5" aria-label="Progress">
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
                    <legend className="text-sm font-medium text-fg">
                        Which days do you usually work?
                    </legend>
                    <div className="flex flex-wrap gap-2">
                        {WEEKDAY_SHORT.map((name, index) => {
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
                            ? 'No workdays — every day uses your day-off shape.'
                            : workdays.length === 7
                              ? 'Seven workdays — every day uses your workday shape.'
                              : `${workdays.length} workdays, ${daysOff.length} days off. Shift work? Pick whatever is most common; single days are easy to flip later.`}
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
                        ? describeShape(workday)
                        : step === 'dayOff'
                          ? describeShape(dayOff)
                          : ''}
                </span>
                <div className="flex items-center gap-2">
                    {stepIndex > 0 ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setStep(STEPS[stepIndex - 1]!)}>
                            Back
                        </Button>
                    ) : onCancel ? (
                        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                            Cancel
                        </Button>
                    ) : null}
                    {step === 'dayOff' ? (
                        <Button
                            type="button"
                            disabled={!canContinue || saveMutation.isPending}
                            onClick={() => saveMutation.mutate()}>
                            {saveMutation.isPending ? 'Saving…' : 'Save my typical week'}
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
                            Continue
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
