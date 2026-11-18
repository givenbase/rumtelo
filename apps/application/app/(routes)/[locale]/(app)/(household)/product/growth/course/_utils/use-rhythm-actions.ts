'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
    CourseHorizon,
    ancestorPeriodOf,
    coursePeriodOf,
    choiceOf,
    type CourseRhythm,
    type CourseRhythmWeekView,
} from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

/** Everything a routine row, a proposal card or Schedule can do with a routine. */
export interface RhythmActions {
    onToggleDay: (rhythm: CourseRhythm, date: string) => void;
    onPause: (rhythm: CourseRhythm) => void;
    onResume: (rhythm: CourseRhythm) => void;
    onStop: (rhythm: CourseRhythm) => void;
    onConfirm: (rhythm: CourseRhythm, week: string) => void;
    onSmaller: (rhythm: CourseRhythm, week: string) => void;
    onRenew: (rhythm: CourseRhythm) => void;
    /** One of this week's three, under the same parent when that parent holds this week. */
    onMakeFocus: (rhythm: CourseRhythm) => void;
}

/**
 * Routine mutations. Every write refreshes all of Course (items, rhythm, schedule),
 * so a tick here moves the counter on the milestone and the row in Schedule at once.
 * Ticking is optimistic — the box fills before the server answers.
 */
export function useRhythmActions({ householdId }: { householdId: string }): {
    actions: RhythmActions;
    isBusy: boolean;
} {
    const t = useTranslations('features.growth.course.rhythm');
    const queryClient = useQueryClient();
    const apiError = useApiError();
    const { showToast } = useHouseholdShell();

    const refresh = () => queryClient.invalidateQueries({ queryKey: apiQuery.growth.course.key() });
    const onError = (error: unknown) => {
        showToast(apiError(error), 'error');
        void refresh();
    };

    const toggle = useMutation({
        mutationFn: ({
            rhythm,
            date,
            isTicked,
        }: {
            rhythm: CourseRhythm;
            date: string;
            isTicked: boolean;
        }) =>
            isTicked
                ? api.growth.course.rhythm.untick({ householdId, id: rhythm.id, date })
                : api.growth.course.rhythm.tick({ householdId, id: rhythm.id, date }),
        onMutate: async ({ rhythm, date, isTicked }) => {
            const key = apiQuery.growth.course.rhythm.list.key();
            await queryClient.cancelQueries({ queryKey: key });
            queryClient.setQueriesData<CourseRhythmWeekView>({ queryKey: key }, view =>
                view
                    ? {
                          ...view,
                          rhythms: view.rhythms.map(row =>
                              row.id !== rhythm.id
                                  ? row
                                  : {
                                        ...row,
                                        ticks: isTicked
                                            ? row.ticks.filter(tick => tick !== date)
                                            : [...row.ticks, date],
                                        periodCount: Math.max(
                                            0,
                                            row.periodCount + (isTicked ? -1 : 1)
                                        ),
                                    }
                          ),
                      }
                    : view
            );
        },
        onSettled: refresh,
        onError,
    });
    const simple = (label: string) => ({
        onSuccess: async () => {
            await refresh();
            showToast(label, 'success');
        },
        onError,
    });
    const pause = useMutation({
        mutationFn: (rhythm: CourseRhythm) =>
            api.growth.course.rhythm.pause({ householdId, id: rhythm.id }),
        ...simple(t('paused_toast')),
    });
    const resume = useMutation({
        mutationFn: (rhythm: CourseRhythm) =>
            api.growth.course.rhythm.resume({ householdId, id: rhythm.id }),
        ...simple(t('resumed_toast')),
    });
    const stop = useMutation({
        mutationFn: (rhythm: CourseRhythm) =>
            api.growth.course.rhythm.remove({ householdId, id: rhythm.id }),
        ...simple(t('stopped_toast')),
    });
    const confirm = useMutation({
        mutationFn: ({ rhythm, week }: { rhythm: CourseRhythm; week: string }) =>
            api.growth.course.rhythm.confirm({ householdId, id: rhythm.id, week }),
        ...simple(t('confirmed_toast')),
    });
    const smaller = useMutation({
        mutationFn: async ({ rhythm, week }: { rhythm: CourseRhythm; week: string }) => {
            await api.growth.course.rhythm.update({
                householdId,
                id: rhythm.id,
                target: Math.max(1, rhythm.target - 1),
                // Fewer times means fewer fixed days: drop the last one.
                ...(rhythm.weekdays && rhythm.weekdays.length >= rhythm.target
                    ? { weekdays: rhythm.weekdays.slice(0, Math.max(1, rhythm.target - 1)) }
                    : {}),
            });
            return api.growth.course.rhythm.confirm({ householdId, id: rhythm.id, week });
        },
        ...simple(t('smaller_toast')),
    });
    const renew = useMutation({
        mutationFn: (rhythm: CourseRhythm) =>
            api.growth.course.rhythm.renew({ householdId, id: rhythm.id }),
        ...simple(t('renewed_toast')),
    });
    const makeFocus = useMutation({
        mutationFn: (rhythm: CourseRhythm) => {
            const week = coursePeriodOf(CourseHorizon.WEEK, new Date());
            const holdsWeek =
                rhythm.parentId !== null &&
                rhythm.parentHorizon !== null &&
                ancestorPeriodOf(CourseHorizon.WEEK, week, rhythm.parentHorizon) ===
                    rhythm.parentPeriod;
            return api.growth.course.create({
                householdId,
                horizon: CourseHorizon.WEEK,
                period: week,
                name: rhythm.name,
                parentId: holdsWeek ? rhythm.parentId : null,
                // Under the same parent: the routine's own choice is allowed there.
                ...(holdsWeek ? { visibility: choiceOf(rhythm) } : {}),
            });
        },
        ...simple(t('focus_toast')),
    });

    return {
        actions: {
            onToggleDay: (rhythm, date) =>
                toggle.mutate({ rhythm, date, isTicked: rhythm.ticks.includes(date) }),
            onPause: rhythm => pause.mutate(rhythm),
            onResume: rhythm => resume.mutate(rhythm),
            onStop: rhythm => stop.mutate(rhythm),
            onConfirm: (rhythm, week) => confirm.mutate({ rhythm, week }),
            onSmaller: (rhythm, week) => smaller.mutate({ rhythm, week }),
            onRenew: rhythm => renew.mutate(rhythm),
            onMakeFocus: rhythm => makeFocus.mutate(rhythm),
        },
        isBusy:
            pause.isPending ||
            resume.isPending ||
            stop.isPending ||
            confirm.isPending ||
            smaller.isPending ||
            renew.isPending ||
            makeFocus.isPending,
    };
}
