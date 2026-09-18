'use client';

import { useMemo } from 'react';

import type { Goal } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import {
    describePeriodTravel,
    endOfPeriodIso,
    horizonMonths,
    projectGoalsAtHorizon,
    toPeriodKey,
} from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import { pickPortalCoach } from '@/app/_lib/portal-coach';
import { isLiveData } from '@/app/_lib/preview';
import { growthPortalShell } from '@/app/_lib/portal-hubs';
import { PortalHub, type PortalHubProps } from '@/components/features/home/portal-hub';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

export function GrowthPortalHubClient() {
    const { householdId } = useAuth();
    const { period } = useAppShell();
    const { formatMoney } = useHouseholdCurrency();
    const live = isLiveData(householdId);
    const travel = describePeriodTravel(period);
    const traveling = travel.direction !== 'current';
    const horizon = horizonMonths(travel);
    const periodKey = toPeriodKey(period.year, period.month);

    const query = useLiveQuery(
        apiQuery.growth.dashboard.get.queryOptions({
            input: { householdId: householdId! },
        }),
        null,
        live
    );
    const goalsQuery = useLiveQuery(
        apiQuery.money.goals.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live && traveling
    );

    const data = query.data;
    const goalsActive = data?.goalsActive ?? 0;
    const income = data?.incomeMonthly ?? 0;
    const spanIncome = traveling ? income * horizon : income;
    const learn = data?.learnQueued ?? 0;
    const netWorth = data?.netWorth;
    const progress = data?.goalsProgressPct ?? 0;
    const fulfilled = useMemo(() => {
        if (!traveling) return 0;
        const goals = (goalsQuery.data ?? []) as ReadonlyArray<Goal>;
        return projectGoalsAtHorizon({
            monthsDelta: travel.monthsDelta,
            direction: travel.direction,
            selectedPeriodEndIso: endOfPeriodIso(periodKey),
            goals: goals.map(goal => ({
                id: goal.id,
                name: goal.name,
                jarKey: null,
                kind: goal.kind,
                status: goal.status,
                saved: goal.saved,
                target: goal.target,
                monthlyContribution: goal.monthlyContribution,
                targetOn: goal.targetOn,
                fulfilledOn: goal.fulfilledOn,
            })),
        }).filter(row => row.fulfilledByPeriod).length;
    }, [traveling, goalsQuery.data, travel.monthsDelta, travel.direction, periodKey]);

    const props: PortalHubProps = {
        ...growthPortalShell,
        coach: pickPortalCoach(data?.coach ?? [], growthPortalShell.fallbackCoach),
        cards: [
            {
                name: 'Goals',
                value: traveling ? String(fulfilled) : String(goalsActive),
                note: traveling ? `reached by then · ${goalsActive} open now` : 'goals in progress',
                color: 'var(--color-jar-lts)',
                chart: { kind: 'ring', pct: progress },
                href: '/product/growth/goals',
            },
            {
                name: 'Income',
                value: formatMoney(spanIncome),
                note: traveling ? `${formatMoney(income)}/mo · ${horizon} months` : 'per month now',
                color: 'var(--color-accent)',
                chart: { kind: 'bars', bars: [0, 0, 0, 0, 0, 0, 0] },
                delta: traveling
                    ? {
                          mark: '↑',
                          text: `${formatMoney(income)} → ${formatMoney(spanIncome)}`,
                          positive: true,
                      }
                    : undefined,
                href: '/product/growth/income',
            },
            {
                name: 'Learn',
                value: String(learn),
                note: 'books in your queue',
                color: 'var(--color-jar-edu)',
                chart: { kind: 'ring', pct: 0 },
                href: '/product/growth/learn',
            },
            {
                name: 'Net worth',
                value: netWorth === null || netWorth === undefined ? '—' : formatMoney(netWorth),
                note: 'truly yours',
                color: 'var(--color-jar-ff)',
                chart: { kind: 'bars', bars: [0, 0, 0, 0, 0, 0, 0] },
                href: '/product/growth/net-worth',
            },
        ],
    };

    return <PortalHub {...props} />;
}
