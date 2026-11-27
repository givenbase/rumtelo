'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { CourseRitual, type CourseScheduleEntry } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

import { CourseEntryRow } from './course-entry-row';

/**
 * Check and advice rows. A check opens where it is done; a month-close reminder can be
 * snoozed once ("not now"), which moves it to the last day of the month.
 */
export function CourseEntryList({
    entries,
    day,
    isDateShown,
}: {
    entries: readonly CourseScheduleEntry[];
    /** The day the rows are read for (month-close state). */
    day: string;
    isDateShown: (entry: CourseScheduleEntry) => boolean;
}) {
    const t = useTranslations('features.growth.course.entry');
    const queryClient = useQueryClient();
    const apiError = useApiError();
    const { showToast } = useHouseholdShell();
    const { householdId } = useAuth();

    const snooze = useMutation({
        mutationFn: (entry: CourseScheduleEntry) =>
            api.growth.course.schedule.snooze({
                householdId: householdId!,
                ritual: entry.ritual ?? CourseRitual.MONTH_CLOSE,
                period: entry.period ?? day.slice(0, 7),
            }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: apiQuery.growth.course.key() });
            showToast(t('snoozed_toast'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    return entries.map(entry => (
        <CourseEntryRow
            key={entry.key}
            entry={entry}
            today={day}
            showDate={isDateShown(entry)}
            onSnooze={value => snooze.mutate(value)}
            isBusy={snooze.isPending}
        />
    ));
}
