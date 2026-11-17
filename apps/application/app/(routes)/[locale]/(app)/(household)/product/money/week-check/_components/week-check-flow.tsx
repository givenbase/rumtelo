'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { zodResolver } from '@hookform/resolvers/zod';
import {
    HouseholdRole,
    WeekCheckStage,
    weekCheckWeekFor,
    type WeekCheck,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Button, Form, Eyebrow, Typography } from '@rumtelo/ui';
import { toPeriodKey } from '@rumtelo/utils';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { shiftWeek, todayIso, weekKeyOf, weekRangeOf } from '@/app/_lib/week-key';
import { resolveMoneyWeek, weekCheckFactsOf } from '@/app/_lib/week-check-week';
import {
    createWeekCheckIntendSchema,
    type WeekCheckIntendSchemaValues,
} from '@/components/features/forms/form-zod';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { PageContent } from '@/components/layout/page-content';

import { buildWeekCheckSteps, resumeIndex } from '../_utils/week-check-steps';
import {
    CourseAheadStage,
    CourseBackStage,
    CourseRoutinesStage,
    useCourseAheadTitles,
    useCourseCheckDone,
} from './course-stages';
import { IntendStage, LookStage, RedirectStage, type StageJar } from './money-stages';
import { WeekCheckDone } from './week-check-done';
import { WeekCheckStepper } from './week-check-stepper';
import { WeekCheckSummary } from './week-check-summary';

function weekNumberOf(week: string): number {
    return Number(week.split('-W')[1]);
}

/** Keyed on the household: switching boards mid-flow resets state and never writes to the old one. */
export function WeekCheckRoute() {
    const { householdId } = useAuth();
    return <WeekCheckFlow key={householdId ?? 'none'} />;
}

/**
 * One week check: Money stages, then the Course stages when `courseApplies`. This resolver
 * picks the week (Monday grace), loads the check and the jars, then hands over to the stepper
 * for writers or the read-only summary for a VIEWER / Practice preview.
 */
function WeekCheckFlow() {
    const t = useTranslations('features.money.week_check');
    const tUi = useTranslations();
    const locale = useLocale();
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const { practicePreview, role } = useBoardWriteAccess();
    const canWrite = !practicePreview && role !== HouseholdRole.VIEWER;
    const fromCourse = useSearchParams().get('from') === 'course';
    const { formatMoney } = useHouseholdCurrency();

    const today = todayIso();
    const currentWeek = weekKeyOf(today);
    const previousWeek = shiftWeek(currentWeek, -1);

    // History is the read that never creates a row, so we can look at last week safely.
    const historyQuery = useLiveQuery(
        apiQuery.money.weekCheck.history.queryOptions({ input: { householdId: householdId! } }),
        [] as WeekCheck[],
        live && canWrite
    );
    const weeks = historyQuery.isPending
        ? null
        : resolveMoneyWeek({
              today,
              lastWeek: weekCheckFactsOf(historyQuery.data.find(row => row.week === previousWeek)),
              thisWeek: weekCheckFactsOf(historyQuery.data.find(row => row.week === currentWeek)),
          });
    const moneyWeek = weeks?.moneyWeek ?? currentWeek;

    const checkQuery = useLiveQuery(
        apiQuery.money.weekCheck.current.queryOptions({
            input: { householdId: householdId!, week: moneyWeek },
        }),
        null,
        live && weeks !== null
    );
    const nowDate = new Date();
    const periodKey = toPeriodKey(nowDate.getFullYear(), nowDate.getMonth() + 1);
    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.balances.queryOptions({
            input: { householdId: householdId!, period: periodKey },
        }),
        [],
        live
    );

    const { from, to } = weekRangeOf(moneyWeek);
    const range = new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
    }).formatRange(new Date(`${from}T00:00:00Z`), new Date(`${to}T00:00:00Z`));
    const jars: StageJar[] = jarsQuery.data;

    const header = (
        <div>
            <Eyebrow>{t('page_eyebrow')}</Eyebrow>
            <Typography as="h1" className="mt-2">
                {t('page_title')}
            </Typography>
            <Typography as="p" size="sm" color="muted" className="mt-2">
                {t('week_label', { week: weekNumberOf(moneyWeek), range })}
            </Typography>
            {weeks?.graceOpen ? (
                <Typography as="p" size="sm" color="muted" className="mt-1 max-w-prose">
                    {t('grace_note')}
                </Typography>
            ) : null}
        </div>
    );

    const loadFailed = checkQuery.isError || jarsQuery.isError;
    const check = checkQuery.data;

    let body: React.ReactNode;
    if (loadFailed) {
        body = (
            <div
                role="alert"
                className="grid justify-items-start gap-3 rounded-2xl border border-line bg-raised p-5 text-sm text-fg-muted">
                <p>{t('error_no_jars')}</p>
                <Button
                    type="button"
                    variant="secondary"
                    className="h-12 sm:h-10"
                    onClick={() => {
                        void checkQuery.refetch();
                        void jarsQuery.refetch();
                    }}>
                    {tUi('ui.button.actions.try_again')}
                </Button>
            </div>
        );
    } else if (!check || jarsQuery.isPending || weeks === null) {
        body = (
            <div
                aria-busy="true"
                className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
                <div className="h-14 rounded-xl bg-sunken" />
                {Array.from({ length: 6 }, (_unused, index) => (
                    <div key={index} className="h-14 rounded-xl bg-sunken" />
                ))}
            </div>
        );
    } else if (jars.length === 0) {
        body = (
            <p
                role="alert"
                className="rounded-2xl border border-line bg-raised p-5 text-sm text-fg-muted">
                {t('error_no_jars')}
            </p>
        );
    } else if (!canWrite) {
        const completed = check.completedAt ? new Date(check.completedAt) : null;
        body = (
            <WeekCheckSummary
                check={check}
                jars={jars}
                doneOn={
                    completed
                        ? new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(completed)
                        : null
                }
                formatMoney={formatMoney}
            />
        );
    } else {
        body = (
            <WeekCheckRun
                key={moneyWeek}
                householdId={householdId!}
                check={check}
                jars={jars}
                moneyWeek={moneyWeek}
                courseWeek={weekCheckWeekFor(today)}
                fromCourse={fromCourse}
                formatMoney={formatMoney}
            />
        );
    }

    return (
        <PageContent width="narrow" className="grid scroll-pb-32 gap-6">
            {header}
            {body}
        </PageContent>
    );
}

type Phase = 'run' | 'done' | 'look';

function WeekCheckRun({
    householdId,
    check,
    jars,
    moneyWeek,
    courseWeek,
    fromCourse,
    formatMoney,
}: {
    householdId: string;
    check: WeekCheck;
    jars: readonly StageJar[];
    moneyWeek: string;
    courseWeek: string;
    fromCourse: boolean;
    formatMoney: (minor: number) => string;
}) {
    const t = useTranslations('features.money.week_check');
    const tForm = useTranslations('ui.form');
    const tUi = useTranslations();
    const queryClient = useQueryClient();
    const apiError = useApiError();
    const { showToast } = useHouseholdShell();

    // Fixed at mount: the stage list must not reshuffle under the user mid-flow.
    const [hasSurplus] = useState(check.surplus > 0);
    const [hasCourse] = useState(check.courseApplies);
    const allSteps = useMemo(
        () => buildWeekCheckSteps({ hasSurplus, hasCourse }),
        [hasSurplus, hasCourse]
    );
    const [courseOnly, setCourseOnly] = useState(false);
    const steps = courseOnly ? allSteps.filter(step => step.group === 'course') : allSteps;

    const alreadyDone = Boolean(check.completedAt) || check.stage === WeekCheckStage.DONE;
    const [phase, setPhase] = useState<Phase>(alreadyDone ? 'done' : 'run');
    const [stepIndex, setStepIndex] = useState(() =>
        resumeIndex({ steps: allSteps, moneyStage: check.stage, fromCourse })
    );
    const [redirectJarId, setRedirectJarId] = useState<string | null>(
        check.allocations[0]?.jarId ?? null
    );
    const [busy, setBusy] = useState(false);
    const [saveFailed, setSaveFailed] = useState(false);
    // Course finished but the Money `DONE` write failed: Retry re-sends only the Money call.
    const [courseCompleted, setCourseCompleted] = useState(false);

    const intendSchema = useMemo(() => createWeekCheckIntendSchema(tForm), [tForm]);
    const form = useForm<WeekCheckIntendSchemaValues>({
        defaultValues: { intention: check.intention ?? '' },
        resolver: zodResolver(intendSchema),
    });
    const intentionText = useWatch({ control: form.control, name: 'intention' }) ?? '';

    const headingRef = useRef<HTMLHeadingElement>(null);
    const mounted = useRef(false);
    useEffect(() => {
        if (!mounted.current) {
            mounted.current = true;
            return;
        }
        headingRef.current?.focus({ preventScroll: false });
    }, [stepIndex, phase, courseOnly]);

    const courseDone = useCourseCheckDone(courseWeek, hasCourse);
    const nextThree = useCourseAheadTitles(courseWeek, hasCourse && courseDone === true);

    const safeIndex = Math.min(stepIndex, steps.length - 1);
    const step = steps[safeIndex]!;
    const onCourse = step.group === 'course';

    async function advance(payload: {
        stage: WeekCheckStage;
        intention?: string;
        allocations?: { jarId: string; amount: number }[];
    }) {
        await api.money.weekCheck.advance({ householdId, week: moneyWeek, ...payload });
    }

    function refreshAfterWrite() {
        void queryClient.invalidateQueries({ queryKey: apiQuery.money.weekCheck.current.key() });
        void queryClient.invalidateQueries({ queryKey: apiQuery.money.weekCheck.history.key() });
        void queryClient.invalidateQueries({ queryKey: apiQuery.money.dashboard.get.key() });
        void queryClient.invalidateQueries({ queryKey: apiQuery.money.progress.key() });
        void queryClient.invalidateQueries({ queryKey: apiQuery.growth.key() });
    }

    function finish(toastKey: 'toast_done' | 'skip_course_toast') {
        refreshAfterWrite();
        showToast(t(toastKey), 'success');
        setPhase('done');
    }

    async function onNext() {
        setSaveFailed(false);
        setBusy(true);
        try {
            switch (step.key) {
                case 'LOOK':
                    await advance({ stage: WeekCheckStage.LOOK });
                    // Nothing to redirect: close that stage on the server too.
                    if (!hasSurplus) await advance({ stage: WeekCheckStage.REDIRECT });
                    refreshAfterWrite();
                    setStepIndex(safeIndex + 1);
                    break;
                case 'REDIRECT':
                    await advance({
                        stage: WeekCheckStage.REDIRECT,
                        allocations: redirectJarId
                            ? [{ jarId: redirectJarId, amount: check.surplus }]
                            : undefined,
                    });
                    refreshAfterWrite();
                    setStepIndex(safeIndex + 1);
                    break;
                case 'INTEND': {
                    if (!(await form.trigger())) return;
                    const intention = form.getValues('intention').trim();
                    if (hasCourse) {
                        await advance({ stage: WeekCheckStage.INTEND, intention });
                        refreshAfterWrite();
                        setStepIndex(safeIndex + 1);
                    } else {
                        await advance({ stage: WeekCheckStage.DONE, intention });
                        finish('toast_done');
                    }
                    break;
                }
                case 'COURSE_BACK':
                case 'COURSE_ROUTINES':
                    setStepIndex(safeIndex + 1);
                    break;
                case 'COURSE_AHEAD':
                    if (!courseCompleted) {
                        await api.growth.weekCheck.complete({ householdId, week: courseWeek });
                        setCourseCompleted(true);
                    }
                    // Money is already DONE when Course is planned afterwards ("Plan Course anyway").
                    if (!courseOnly) await advance({ stage: WeekCheckStage.DONE });
                    finish('toast_done');
                    break;
            }
        } catch (error) {
            setSaveFailed(true);
            showToast(apiError(error), 'error');
        } finally {
            setBusy(false);
        }
    }

    async function onSkipCourse() {
        setSaveFailed(false);
        setBusy(true);
        try {
            await advance({ stage: WeekCheckStage.DONE });
            finish('skip_course_toast');
        } catch (error) {
            setSaveFailed(true);
            showToast(apiError(error), 'error');
        } finally {
            setBusy(false);
        }
    }

    if (phase === 'done') {
        const intention = (check.intention ?? form.getValues('intention')).trim();
        return (
            <WeekCheckDone
                weekNumber={weekNumberOf(moneyWeek)}
                allocations={check.allocations.map(allocation => ({
                    jarId: allocation.jarId,
                    name: jars.find(jar => jar.id === allocation.jarId)?.name ?? '',
                    amount: allocation.amount,
                }))}
                intention={intention}
                nextThree={nextThree}
                offerCourse={hasCourse && courseDone === false}
                formatMoney={formatMoney}
                onPlanCourse={() => {
                    setCourseOnly(true);
                    setStepIndex(0);
                    setPhase('run');
                }}
                onLookAgain={() => setPhase('look')}
            />
        );
    }

    if (phase === 'look') {
        return (
            <div className="grid gap-5">
                <p className="text-sm text-fg-muted">{t('look_again_note')}</p>
                <div className="rounded-2xl border border-line bg-surface p-5 shadow-md sm:p-6">
                    <LookStage
                        jars={jars}
                        canAct={false}
                        formatMoney={formatMoney}
                        headingRef={headingRef}
                    />
                </div>
                <div className="flex justify-end">
                    <Button
                        type="button"
                        variant="secondary"
                        className="h-12 sm:h-10"
                        onClick={() => setPhase('done')}>
                        {t('back_to_summary')}
                    </Button>
                </div>
            </div>
        );
    }

    const nextLabel = saveFailed
        ? tUi('ui.button.actions.try_again')
        : busy
          ? tForm('working')
          : step.key === 'COURSE_AHEAD' || (step.key === 'INTEND' && !hasCourse)
            ? t('finish')
            : t('next');

    return (
        <Form {...form}>
            <div className="grid gap-5">
                <WeekCheckStepper
                    steps={steps}
                    current={safeIndex}
                    moneyWeekNumber={weekNumberOf(moneyWeek)}
                    courseWeekNumber={weekNumberOf(courseWeek)}
                    onGoBackTo={index => {
                        setSaveFailed(false);
                        setStepIndex(index);
                    }}
                />

                <div className="animate-rise rounded-2xl border border-line bg-surface p-5 shadow-md sm:p-6">
                    {step.key === 'LOOK' ? (
                        <LookStage
                            jars={jars}
                            canAct
                            formatMoney={formatMoney}
                            headingRef={headingRef}
                        />
                    ) : null}
                    {step.key === 'REDIRECT' ? (
                        <RedirectStage
                            jars={jars}
                            surplus={check.surplus}
                            selectedJarId={redirectJarId}
                            onSelect={setRedirectJarId}
                            formatMoney={formatMoney}
                            headingRef={headingRef}
                        />
                    ) : null}
                    {step.key === 'INTEND' ? (
                        <IntendStage intentionText={intentionText} headingRef={headingRef} />
                    ) : null}
                    {step.key === 'COURSE_BACK' ? (
                        <CourseBackStage courseWeek={courseWeek} headingRef={headingRef} />
                    ) : null}
                    {step.key === 'COURSE_ROUTINES' ? (
                        <CourseRoutinesStage courseWeek={courseWeek} headingRef={headingRef} />
                    ) : null}
                    {step.key === 'COURSE_AHEAD' ? (
                        <CourseAheadStage courseWeek={courseWeek} headingRef={headingRef} />
                    ) : null}
                    {hasCourse &&
                    step.key === 'COURSE_BACK' &&
                    (check.intention ?? intentionText).trim() ? (
                        <p className="mt-4 text-sm text-fg-muted">
                            {t('intend_saved', {
                                intention: (check.intention ?? intentionText).trim(),
                            })}
                        </p>
                    ) : null}
                </div>

                {onCourse && !courseOnly ? (
                    <div>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onSkipCourse()}
                            className="inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                            {t('skip_course')}
                        </button>
                    </div>
                ) : null}

                {saveFailed ? (
                    <p role="alert" className="text-sm text-fg-muted">
                        {t('save_failed')}
                    </p>
                ) : null}

                <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 flex items-center justify-between gap-3 border-t border-line bg-surface/95 py-3 backdrop-blur md:bottom-0">
                    {safeIndex > 0 ? (
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={busy}
                            className="h-12 sm:h-10"
                            onClick={() => {
                                setSaveFailed(false);
                                setStepIndex(safeIndex - 1);
                            }}>
                            {t('back')}
                        </Button>
                    ) : (
                        <span />
                    )}
                    <Button
                        type="button"
                        disabled={busy}
                        aria-busy={busy}
                        className="h-12 sm:h-10"
                        onClick={() => void onNext()}>
                        {nextLabel}
                    </Button>
                </div>
            </div>
        </Form>
    );
}
