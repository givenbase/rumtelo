'use client';

import type { Goal, IncomeSource, Jar } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { monthlyNetAsOf, toPeriodKey } from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import { pickOverviewGoals, type OverviewRow } from '@/app/_lib/growth-overview-pick';
import { todayIsoDate } from '@/app/_lib/money-input';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

const EMPTY_GOALS: Goal[] = [];
const EMPTY_JARS: Jar[] = [];
const EMPTY_INCOME: IncomeSource[] = [];

/** Shared pick for the Growth hub Focus card and the observe stack. */
export function useGrowthOverviewPick(): {
    goals: readonly Goal[];
    rows: OverviewRow[];
    hold: OverviewRow | undefined;
    currentNet: number;
} {
    const { householdId } = useAuth();
    const { period } = useHouseholdShell();
    const live = isLiveData(householdId);
    const periodKey = toPeriodKey(period.year, period.month);

    const goalsQuery = useLiveQuery(
        apiQuery.money.goals.list.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_GOALS,
        live
    );
    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.list.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_JARS,
        live
    );
    const incomeQuery = useLiveQuery(
        apiQuery.money.income.list.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_INCOME,
        live
    );

    const goals = goalsQuery.data ?? EMPTY_GOALS;
    const currentNet = monthlyNetAsOf(incomeQuery.data ?? EMPTY_INCOME, todayIsoDate());
    const jarById = new Map((jarsQuery.data ?? EMPTY_JARS).map(jar => [jar.id, jar]));
    const rows = pickOverviewGoals(goals, jarById, currentNet, periodKey);
    return { goals, rows, hold: rows[0], currentNet };
}
