'use client';

import { useQuery } from '@tanstack/react-query';

import { useLiveQuery } from '@rumtelo/hooks';
import { toPeriodKey } from '@rumtelo/utils';

import { HouseholdRole, type Dashboard, type WeekCheck } from '@rumtelo/contracts';

import { apiQuery } from '@/app/_lib/api-hooks';
import { isWeekCheckDue } from '@/app/_lib/next-move';
import { isLiveData } from '@/app/_lib/preview';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { shiftWeek, todayIso, weekKeyOf } from '@/app/_lib/week-key';
import { resolveMoneyWeek, weekCheckFactsOf } from '@/app/_lib/week-check-week';
import { useAuth } from '@/components/features/shell/auth-provider';

export type WeekCheckStatus = {
    /** False until the dashboard facts have arrived: render neutral, never a guess. */
    ready: boolean;
    /** `progress.weekCheckDoneThisWeek` as of now. */
    doneThisWeek: boolean;
    /** Due by the shared rule (Fri to Sun, the reminder day, or an open check from last week). */
    due: boolean;
    /** Last week's check was started and is still open (Monday grace). */
    graceOpen: boolean;
    reminderDay: number | null;
    /** The dashboard for the current month, the one "now" read shared with Home. */
    dashboard: Dashboard | undefined;
    /** The dashboard read failed: show an error with Retry, never a guessed state. */
    isError: boolean;
    refetch: () => void;
};

/**
 * The week check's state as of now. It reads `money.dashboard.get` for the current month (the
 * same query key Home and the Money header use, so the cache is shared) plus the household's
 * reminder day. Writers also read the history to know about the Monday grace.
 */
export function useWeekCheckStatus(): WeekCheckStatus {
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const { practicePreview, role } = useBoardWriteAccess();
    const canWrite = !practicePreview && role !== HouseholdRole.VIEWER;

    const now = new Date();
    const periodKey = toPeriodKey(now.getFullYear(), now.getMonth() + 1);
    const dashboardQuery = useQuery({
        ...apiQuery.money.dashboard.get.queryOptions({
            input: { householdId: householdId!, period: periodKey },
        }),
        enabled: live,
    });
    const settingsQuery = useLiveQuery(
        apiQuery.household.settings.queryOptions({ input: { householdId: householdId! } }),
        null,
        live
    );
    const historyQuery = useLiveQuery(
        apiQuery.money.weekCheck.history.queryOptions({ input: { householdId: householdId! } }),
        [] as WeekCheck[],
        live && canWrite
    );

    const today = todayIso();
    const currentWeek = weekKeyOf(today);
    const graceOpen = canWrite
        ? resolveMoneyWeek({
              today,
              lastWeek: weekCheckFactsOf(
                  historyQuery.data.find(row => row.week === shiftWeek(currentWeek, -1))
              ),
              thisWeek: weekCheckFactsOf(historyQuery.data.find(row => row.week === currentWeek)),
          }).graceOpen
        : false;
    const reminderDay = settingsQuery.data?.weekCheck.reminderDay ?? null;
    const dashboard = dashboardQuery.data;

    return {
        ready: dashboard !== undefined,
        doneThisWeek: dashboard?.progress.weekCheckDoneThisWeek ?? false,
        due: isWeekCheckDue(today, reminderDay, graceOpen),
        graceOpen,
        reminderDay,
        dashboard,
        isError: dashboardQuery.isError,
        refetch: () => void dashboardQuery.refetch(),
    };
}
