'use client';

import { useFormContext, useWatch } from 'react-hook-form';

import { CourseRhythmCadence, CourseRhythmKind, coursePresetByKey } from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Field, FormControl, FormField, FormItem, FormMessage, Input, Toggle } from '@rumtelo/ui';

import { monthName } from '../_utils/course-goals';
import type { PlanFormValues } from '../_utils/plan-form';

/**
 * Step 4 · Break it down: per goal, one small first step for this month (the preset's,
 * editable, empty for your own goals) and an optional routine (the preset's rhythm, on or
 * off, with an editable name and target).
 */
export function PlanStepBreak({ month }: { month: string }) {
    const t = useTranslations('features.growth.course.plan');
    const locale = useLocale();
    const { control, setValue } = useFormContext<PlanFormValues>();
    const goals = useWatch({ control, name: 'goals' });

    return (
        <ul className="grid gap-4">
            {goals.map((goal, index) => {
                const hasRoutine = Boolean(
                    goal.presetKey && coursePresetByKey(goal.presetKey)?.rhythm
                );
                const isDaily =
                    goal.routineKind === CourseRhythmKind.HABIT ||
                    goal.routineCadence === CourseRhythmCadence.DAILY;
                const id = (field: string) => `plan-break-${goal.uid}-${field}`;
                return (
                    <li
                        key={goal.uid}
                        className="grid gap-4 rounded-3xl border border-line bg-card p-4 sm:p-5">
                        <h3 className="text-base leading-snug font-semibold text-fg">
                            {goal.name}
                        </h3>

                        <FormField
                            control={control}
                            name={`goals.${index}.step`}
                            render={({ field }) => (
                                <FormItem>
                                    <Field
                                        label={t('step_label', {
                                            month: monthName(month, locale, 'long'),
                                        })}
                                        hint={t('step_hint')}
                                        htmlFor={id('step')}>
                                        <FormControl>
                                            <Input
                                                id={id('step')}
                                                {...field}
                                                autoComplete="off"
                                                maxLength={140}
                                            />
                                        </FormControl>
                                    </Field>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {hasRoutine ? (
                            <div className="grid gap-3 border-t border-line pt-2">
                                <Toggle
                                    checked={goal.routineOn}
                                    label={t('routine_toggle')}
                                    hint={t('routine_hint')}
                                    onCheckedChange={next =>
                                        setValue(`goals.${index}.routineOn`, next, {
                                            shouldDirty: true,
                                        })
                                    }
                                />
                                {goal.routineOn ? (
                                    <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                                        <FormField
                                            control={control}
                                            name={`goals.${index}.routineName`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <Field
                                                        label={t('routine_name')}
                                                        htmlFor={id('routine')}>
                                                        <FormControl>
                                                            <Input
                                                                id={id('routine')}
                                                                {...field}
                                                                autoComplete="off"
                                                                maxLength={140}
                                                            />
                                                        </FormControl>
                                                    </Field>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        {isDaily ? (
                                            <p className="self-end pb-2 text-sm text-fg-muted">
                                                {t('routine_daily')}
                                            </p>
                                        ) : (
                                            <FormField
                                                control={control}
                                                name={`goals.${index}.routineTarget`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <Field
                                                            label={t(
                                                                `routine_target_${goal.routineCadence}`
                                                            )}
                                                            htmlFor={id('target')}>
                                                            <FormControl>
                                                                <Input
                                                                    id={id('target')}
                                                                    {...field}
                                                                    inputMode="numeric"
                                                                    autoComplete="off"
                                                                    maxLength={2}
                                                                    className="w-24"
                                                                />
                                                            </FormControl>
                                                        </Field>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </li>
                );
            })}
        </ul>
    );
}
