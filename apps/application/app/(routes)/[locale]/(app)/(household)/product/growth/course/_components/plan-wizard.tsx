'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { type Jar, type WorkSituation, type YearIntention } from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Button, Form, Icon } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

import { monthName } from '../_utils/course-goals';
import { courseHref } from '../_utils/course-route';
import { createPlanFormSchema, type PlanFormValues } from '../_utils/plan-form';
import {
    PLAN_SKIPPABLE_STEPS,
    PLAN_STEPS,
    buildChain,
    planMonthOf,
    type PlanStep,
} from '../_utils/plan-year';
import { usePlanSave } from '../_utils/use-plan-save';
import { PlanStepAreas } from './plan-step-areas';
import { PlanStepBreak } from './plan-step-break';
import { PlanStepGoals } from './plan-step-goals';
import { PlanStepNow } from './plan-step-now';
import { PlanStepSave } from './plan-step-save';

/**
 * "Plan your year": five calm screens over one form — you now, areas, goals, break it
 * down, balance and save. The draft lives in the form, so back and next lose nothing.
 * Saving runs goal by goal and shows what was saved; a failure keeps the rest and offers
 * to try again.
 */
export function PlanWizard({
    householdId,
    year,
    boardMonth,
    initial,
    jars,
    canAmounts,
    isLive,
}: {
    householdId: string;
    year: string;
    /** The month the Goals tab shows; where "Save" lands. */
    boardMonth: string;
    initial: { workSituation: WorkSituation | null; yearIntention: YearIntention | null };
    /** Jars a goal may draw on. */
    jars: readonly Jar[];
    canAmounts: boolean;
    isLive: boolean;
}) {
    const t = useTranslations('features.growth.course.plan');
    const tUi = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const queryClient = useQueryClient();
    const apiError = useApiError();
    const { showToast } = useHouseholdShell();

    const month = planMonthOf(year);
    const [stepIndex, setStepIndex] = useState(0);
    const step: PlanStep = PLAN_STEPS[stepIndex]!;

    const form = useForm<PlanFormValues>({
        resolver: zodResolver(createPlanFormSchema(code => t(`error.${code}`))),
        defaultValues: {
            workSituation: initial.workSituation,
            yearIntention: initial.yearIntention,
            areas: [],
            goals: [],
        },
    });
    const areas = useWatch({ control: form.control, name: 'areas' });
    const goals = useWatch({ control: form.control, name: 'goals' });

    const { progress, isSaving, run } = usePlanSave({ householdId, year });
    const hasStartedSaving = Object.keys(progress).length > 0;

    // Step change: the heading remounts (keyed by step) and takes focus, so keyboard and
    // screen reader users land on the new question. Not on the very first screen.
    const hasMoved = useRef(false);
    const focusHeading = useCallback((node: HTMLHeadingElement | null) => {
        if (node && hasMoved.current) node.focus();
    }, []);

    const saveProfile = useMutation({
        mutationFn: (values: Pick<PlanFormValues, 'workSituation' | 'yearIntention'>) =>
            api.account.updateSettings(values),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: apiQuery.account.settings.key() }),
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const goTo = (index: number) => {
        hasMoved.current = true;
        setStepIndex(Math.max(0, Math.min(PLAN_STEPS.length - 1, index)));
    };

    const next = async () => {
        if (step === 'now') {
            const { workSituation, yearIntention } = form.getValues();
            // Saved quietly in the background; the flow never waits for it.
            if (
                workSituation !== initial.workSituation ||
                yearIntention !== initial.yearIntention
            ) {
                saveProfile.mutate({ workSituation, yearIntention });
            }
        }
        if (step === 'areas') {
            // Goals of an area that was let go of leave the draft; the others stay.
            const kept = form.getValues('goals').filter(goal => areas.includes(goal.areaKey));
            if (kept.length !== goals.length) form.setValue('goals', kept);
        }
        if (step === 'goals') {
            const valid = await form.trigger(
                goals.flatMap((_goal, index) => [
                    `goals.${index}.name` as const,
                    `goals.${index}.amount` as const,
                    `goals.${index}.jarId` as const,
                ])
            );
            if (!valid) return;
        }
        if (step === 'break') {
            const valid = await form.trigger(
                goals.flatMap((_goal, index) => [
                    `goals.${index}.step` as const,
                    `goals.${index}.routineName` as const,
                    `goals.${index}.routineTarget` as const,
                ])
            );
            if (!valid) return;
        }
        goTo(stepIndex + 1);
    };

    /** "Skip" on step 4: no first steps and no routines. */
    const skipBreakdown = () => {
        goals.forEach((_goal, index) => {
            form.setValue(`goals.${index}.step`, '');
            form.setValue(`goals.${index}.routineOn`, false);
        });
        goTo(stepIndex + 1);
    };

    const save = async () => {
        if (!isLive) {
            showToast(tUi('common.message.entity.sign_in_goals'), 'error');
            return;
        }
        if (!(await form.trigger())) {
            goTo(2);
            return;
        }
        const chains = form.getValues('goals').map(goal => buildChain(goal, { year, month }));
        const { isFinished, amountsMissed } = await run(chains);
        if (isFinished) {
            // The goals are in; an amount that did not save is said once, then left behind.
            showToast(
                amountsMissed > 0 ? t('done_amount_missed') : t('done_toast'),
                amountsMissed > 0 ? 'info' : 'success'
            );
            router.push(courseHref(boardMonth));
        }
    };

    const isSkippable = PLAN_SKIPPABLE_STEPS.includes(step);
    const canContinue =
        step === 'areas' ? areas.length > 0 : step === 'goals' ? goals.length > 0 : true;
    const hasFailure = hasStartedSaving && !isSaving;
    const stepName = t(`step_${step}`);
    const monthLabel = monthName(month, locale, 'long');

    return (
        <Form {...form}>
            <form
                className="grid gap-6"
                noValidate
                onSubmit={event => {
                    event.preventDefault();
                    if (step === 'save') void save();
                    else void next();
                }}>
                <div className="grid gap-3">
                    <ol className="flex gap-2" aria-label={t('steps_aria')}>
                        {PLAN_STEPS.map((key, index) => (
                            <li
                                key={key}
                                aria-current={key === step ? 'step' : undefined}
                                className={cn(
                                    'h-2 flex-1 rounded-full',
                                    index < stepIndex
                                        ? 'bg-accent'
                                        : index === stepIndex
                                          ? 'bg-accent-soft ring-2 ring-accent'
                                          : 'bg-raised'
                                )}>
                                <span className="sr-only">{t(`step_${key}`)}</span>
                            </li>
                        ))}
                    </ol>
                    <p className="font-mono text-xs tracking-wide text-fg-muted uppercase">
                        {t('progress', { current: stepIndex + 1, total: PLAN_STEPS.length })} ·{' '}
                        {stepName}
                    </p>
                </div>

                <header className="grid gap-1.5">
                    <h2
                        key={step}
                        ref={focusHeading}
                        tabIndex={-1}
                        className="text-2xl leading-tight font-semibold text-fg outline-none sm:text-3xl">
                        {t(`${step}_title`, { year, month: monthLabel })}
                    </h2>
                    <p className="text-sm text-fg-muted sm:text-base">
                        {t(`${step}_lead`, { year, month: monthLabel })}
                    </p>
                </header>

                {step === 'now' ? <PlanStepNow year={year} /> : null}
                {step === 'areas' ? <PlanStepAreas /> : null}
                {step === 'goals' ? (
                    <PlanStepGoals year={year} month={month} jars={jars} canAmounts={canAmounts} />
                ) : null}
                {step === 'break' ? <PlanStepBreak month={month} /> : null}
                {step === 'save' ? (
                    <PlanStepSave
                        year={year}
                        month={month}
                        progress={progress}
                        isSaving={isSaving}
                        onAddGoal={() => goTo(1)}
                    />
                ) : null}

                {step === 'goals' && goals.length === 0 ? (
                    <p className="text-sm text-fg-muted">{t('goals_none')}</p>
                ) : null}

                <nav
                    aria-label={t('nav_aria')}
                    className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                    {stepIndex > 0 && !hasStartedSaving ? (
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={isSaving}
                            onClick={() => goTo(stepIndex - 1)}
                            iconLeft={<Icon name="chevron-left" size="sm" aria-hidden />}>
                            {t('back')}
                        </Button>
                    ) : (
                        <span />
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                        {isSkippable ? (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={
                                    step === 'break' ? skipBreakdown : () => goTo(stepIndex + 1)
                                }>
                                {t('skip')}
                            </Button>
                        ) : null}
                        {step === 'save' ? (
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? t('saving') : hasFailure ? t('retry') : t('save')}
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                disabled={!canContinue}
                                iconRight={<Icon name="chevron-right" size="sm" aria-hidden />}>
                                {t('next')}
                            </Button>
                        )}
                    </div>
                </nav>
            </form>
        </Form>
    );
}
