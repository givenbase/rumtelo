'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import {
    COURSE_SLOT_SIZE,
    CourseHorizon,
    HouseholdRole,
    VisibilityChoice,
    shiftCoursePeriod,
    weekCheckWeekFor,
    type CourseItem,
    type CoursePeriodView,
    type HouseholdMember,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Button, Icon, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { growthPath } from '@/app/_lib/routes';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

import { periodLabel } from '../_utils/course-route';
import { useCourseActions } from '../_utils/use-course-actions';
import { useRhythmActions } from '../_utils/use-rhythm-actions';
import { CourseItemCard } from './course-item-card';
import { CourseItemDialog, type CourseDialogState } from './course-item-dialog';
import { RhythmSuggestions } from './rhythm-suggestions';

const STEPS = ['back', 'rhythm', 'ahead', 'done'] as const;
type Step = (typeof STEPS)[number];

const EMPTY_MEMBERS: HouseholdMember[] = [];
const EMPTY_SUGGESTIONS: never[] = [];

function emptyView(period: string): CoursePeriodView {
    return {
        horizon: CourseHorizon.WEEK,
        period,
        items: [],
        ancestors: [],
        children: [],
        hiddenCount: 0,
        visibilityOptions: [],
        defaultVisibility: VisibilityChoice.PRIVATE,
        isVisibilityPickerShown: false,
    };
}

/**
 * The Growth week check, short form: look back on last week's three, answer the
 * routine proposals, set the next three, done. On Sunday it plans the coming week.
 */
export function WeekCheckPage() {
    const t = useTranslations('features.growth.course.week_check');
    const tCourse = useTranslations('features.growth.course');
    const locale = useLocale();
    const queryClient = useQueryClient();
    const apiError = useApiError();
    const { showToast } = useHouseholdShell();
    const { householdId, userId } = useAuth();
    const live = isLiveData(householdId);

    const today = new Date().toISOString().slice(0, 10);
    const week = weekCheckWeekFor(today);
    const previousWeek = shiftCoursePeriod(CourseHorizon.WEEK, week, -1);
    const [step, setStep] = useState<Step>('back');

    const membersQuery = useLiveQuery(
        apiQuery.household.members.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_MEMBERS,
        live
    );
    const previousQuery = useLiveQuery(
        apiQuery.growth.course.period.queryOptions({
            input: { householdId: householdId!, horizon: CourseHorizon.WEEK, period: previousWeek },
        }),
        emptyView(previousWeek),
        live
    );
    const aheadQuery = useLiveQuery(
        apiQuery.growth.course.period.queryOptions({
            input: { householdId: householdId!, horizon: CourseHorizon.WEEK, period: week },
        }),
        emptyView(week),
        live
    );
    const suggestionsQuery = useLiveQuery(
        apiQuery.growth.course.rhythm.suggestions.queryOptions({
            input: { householdId: householdId!, week },
        }),
        EMPTY_SUGGESTIONS,
        live
    );
    const checkQuery = useLiveQuery(
        apiQuery.growth.weekCheck.current.queryOptions({
            input: { householdId: householdId!, week },
        }),
        null,
        live
    );

    const layerName = (layer: CourseHorizon) =>
        tCourse(`layer_${layer.toLowerCase()}` as 'layer_week');
    const [dialog, setDialog] = useState<CourseDialogState | null>(null);
    const { actions, isBusy } = useCourseActions({
        householdId: householdId!,
        layerName,
        onEdit: item => setDialog({ mode: 'edit', item }),
    });
    const rhythm = useRhythmActions({ householdId: householdId! });

    const complete = useMutation({
        mutationFn: () => api.growth.weekCheck.complete({ householdId: householdId!, week }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: apiQuery.growth.key() });
            showToast(t('done_toast'), 'success');
            setStep('done');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const members = membersQuery.data;
    const me = members.find(member => member.userId === userId) ?? null;
    const owner = members.find(member => member.role === HouseholdRole.OWNER) ?? null;
    const label = (period: string) =>
        periodLabel(CourseHorizon.WEEK, period, locale, {
            quarter: quarter => tCourse('quarter_short', { quarter }),
            week: weekNumber => tCourse('week_short', { week: weekNumber }),
        });

    const cardProps = (item: CourseItem, view: CoursePeriodView) => {
        const parent = item.parentId ? view.ancestors.find(row => row.id === item.parentId) : null;
        return {
            item,
            why: item.parentId ? (parent ? parent.name : ({ private: true } as const)) : null,
            makerName: null,
            isPickerShown: view.isVisibilityPickerShown,
            children: [],
            layerName,
            actions,
            isBusy,
        };
    };

    const previous = previousQuery.data.items.filter(item => item.isMine);
    const ahead = aheadQuery.data;
    const aheadMine = ahead.items.filter(item => item.isMine);
    const openSlots =
        ahead.visibilityOptions.length > 0 ? Math.max(0, COURSE_SLOT_SIZE - aheadMine.length) : 0;
    const isCompleted = Boolean(checkQuery.data?.completedAt) || step === 'done';
    const stepIndex = STEPS.indexOf(step);
    const goTo = (next: Step) => setStep(next);

    return (
        <div className="mx-auto grid w-full max-w-2xl gap-6">
            <header className="grid gap-1">
                <Typography as="p" variant="eyebrow" color="primary">
                    {tCourse('eyebrow')}
                </Typography>
                <Typography as="h1">{t('title')}</Typography>
                <Typography as="p" size="sm" color="muted">
                    {t('lead', { week: label(week) })}
                </Typography>
            </header>

            <ol className="flex flex-wrap gap-1.5" aria-label={t('steps_aria')}>
                {STEPS.map((key, index) => (
                    <li key={key}>
                        <button
                            type="button"
                            onClick={() => (key === 'done' ? undefined : goTo(key))}
                            disabled={key === 'done' && !isCompleted}
                            aria-current={key === step ? 'step' : undefined}
                            className={cn(
                                'rounded-full px-3 py-1.5 font-mono text-[11px] tracking-wide uppercase',
                                key === step
                                    ? 'bg-accent text-on-accent'
                                    : index < stepIndex
                                      ? 'bg-accent-soft text-accent'
                                      : 'bg-raised text-fg-muted'
                            )}>
                            {index + 1} · {t(`step_${key}`)}
                        </button>
                    </li>
                ))}
            </ol>

            {step === 'back' ? (
                <section className="grid gap-3" aria-label={t('step_back')}>
                    <Typography as="h2" size="lg">
                        {t('back_title', { week: label(previousWeek) })}
                    </Typography>
                    <p className="text-sm text-fg-muted">{t('back_lead')}</p>
                    {previous.length === 0 ? (
                        <p className="rounded-2xl border border-line bg-card px-4 py-3 text-sm text-fg-muted">
                            {t('back_empty')}
                        </p>
                    ) : (
                        previous.map(item => (
                            <CourseItemCard
                                key={item.id}
                                {...cardProps(item, previousQuery.data)}
                            />
                        ))
                    )}
                    <StepNav onNext={() => goTo('rhythm')} nextLabel={t('next')} />
                </section>
            ) : null}

            {step === 'rhythm' ? (
                <section className="grid gap-3" aria-label={t('step_rhythm')}>
                    <Typography as="h2" size="lg">
                        {t('rhythm_title')}
                    </Typography>
                    <p className="text-sm text-fg-muted">{t('rhythm_lead')}</p>
                    {suggestionsQuery.data.length === 0 ? (
                        <p className="rounded-2xl border border-line bg-card px-4 py-3 text-sm text-fg-muted">
                            {t('rhythm_empty')}{' '}
                            <Link
                                href={growthPath('course', week)}
                                className="text-accent hover:underline">
                                {t('rhythm_open')}
                            </Link>
                        </p>
                    ) : (
                        <RhythmSuggestions
                            suggestions={suggestionsQuery.data}
                            week={week}
                            actions={rhythm.actions}
                            isBusy={rhythm.isBusy}
                            isEmbedded
                        />
                    )}
                    <StepNav
                        onBack={() => goTo('back')}
                        backLabel={t('back')}
                        onNext={() => goTo('ahead')}
                        nextLabel={t('next')}
                    />
                </section>
            ) : null}

            {step === 'ahead' ? (
                <section className="grid gap-3" aria-label={t('step_ahead')}>
                    <Typography as="h2" size="lg">
                        {t('ahead_title', { week: label(week) })}
                    </Typography>
                    <p className="text-sm text-fg-muted">{t('ahead_lead')}</p>
                    {aheadMine.map(item => (
                        <CourseItemCard key={item.id} {...cardProps(item, ahead)} />
                    ))}
                    {Array.from({ length: openSlots }, (_unused, index) => (
                        <button
                            // Empty slots are interchangeable placeholders, not items.
                            key={`slot-${index}`}
                            type="button"
                            onClick={() =>
                                setDialog({
                                    mode: 'create',
                                    horizon: CourseHorizon.WEEK,
                                    period: week,
                                })
                            }
                            className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-dashed border-line-strong px-4 text-left text-sm text-fg-muted transition-colors hover:border-accent hover:text-accent">
                            <Icon name="plus" aria-hidden />
                            {tCourse('empty_slot_week')}
                        </button>
                    ))}
                    <StepNav
                        onBack={() => goTo('rhythm')}
                        backLabel={t('back')}
                        onNext={() => complete.mutate()}
                        nextLabel={t('finish')}
                        isBusy={complete.isPending}
                    />
                </section>
            ) : null}

            {step === 'done' ? (
                <section
                    className="grid gap-3 rounded-2xl border border-accent/40 bg-accent-soft/40 p-5"
                    aria-label={t('step_done')}>
                    <Typography as="h2" size="lg">
                        {t('done_title')}
                    </Typography>
                    <p className="text-sm text-fg-muted">{t('done_lead', { week: label(week) })}</p>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href={growthPath('course')}
                            className="inline-flex h-10 items-center rounded-full bg-accent px-4 text-sm font-medium text-on-accent hover:opacity-90">
                            {t('open_today')}
                        </Link>
                        <Link
                            href={growthPath('course', week)}
                            className="inline-flex h-10 items-center rounded-full border border-line bg-card px-4 text-sm font-medium text-fg hover:bg-raised">
                            {t('open_week')}
                        </Link>
                    </div>
                </section>
            ) : null}

            {isCompleted && step !== 'done' ? (
                <p className="font-mono text-xs tracking-wide text-accent uppercase">
                    {t('already_done')}
                </p>
            ) : null}

            {householdId ? (
                <CourseItemDialog
                    state={dialog}
                    onClose={() => setDialog(null)}
                    householdId={householdId}
                    visibilityOptions={ahead.visibilityOptions}
                    defaultVisibility={ahead.defaultVisibility}
                    isPickerShown={ahead.isVisibilityPickerShown}
                    ownerName={
                        owner && owner.accountId !== me?.accountId ? owner.displayName : null
                    }
                    layerName={layerName}
                />
            ) : null}
        </div>
    );
}

function StepNav({
    onBack,
    backLabel,
    onNext,
    nextLabel,
    isBusy = false,
}: {
    onBack?: () => void;
    backLabel?: string;
    onNext: () => void;
    nextLabel: string;
    isBusy?: boolean;
}) {
    return (
        <div className="flex justify-between gap-2 pt-2">
            {onBack ? (
                <Button type="button" variant="ghost" onClick={onBack}>
                    {backLabel}
                </Button>
            ) : (
                <span />
            )}
            <Button type="button" onClick={onNext} disabled={isBusy}>
                {nextLabel}
            </Button>
        </div>
    );
}
