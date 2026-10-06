'use client';

import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import {
    describePeriodTravel,
    endOfPeriodIso,
    horizonMonths,
    projectGoalsAtHorizon,
    toPeriodKey,
} from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import { goalDetailHref } from '@/app/_lib/create-routes';
import { overviewGoalCurrent, overviewGoalProgressPct } from '@/app/_lib/growth-overview-pick';
import { pickPortalCoach } from '@/app/_lib/portal-coach';
import { isLiveData } from '@/app/_lib/preview';
import { growthPortalShell } from '@/app/_lib/portal-hubs';
import { useGrowthOverviewPick } from '@/app/_lib/use-growth-overview-pick';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { PortalHub, type PortalHubProps } from '@/components/features/home/portal-hub';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

export function GrowthPortalHubClient() {
    const t = useTranslations();
    const tCoach = useTranslations('features.coach');
    const tc = useTranslations('features.growth.hub.cards');
    const shell = growthPortalShell(t);
    const { householdId } = useAuth();
    const { period } = useHouseholdShell();
    const { formatMoney } = useHouseholdCurrency();
    const live = isLiveData(householdId);
    const travel = describePeriodTravel(period);
    const traveling = travel.direction !== 'current';
    const horizon = horizonMonths(travel);
    const periodKey = toPeriodKey(period.year, period.month);
    const { goals, hold, currentNet } = useGrowthOverviewPick();

    const query = useLiveQuery(
        apiQuery.growth.dashboard.get.queryOptions({
            input: { householdId: householdId! },
        }),
        null,
        live
    );

    const data = query.data;
    const goalsActive = data?.goalsActive ?? 0;
    const income = data?.incomeMonthly ?? 0;
    const spanIncome = traveling ? income * horizon : income;
    const learn = data?.learnQueued ?? 0;
    const learnProgress = data?.learnProgressPct ?? 0;
    const progress = data?.goalsProgressPct ?? 0;
    const fulfilled = traveling
        ? projectGoalsAtHorizon({
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
          }).filter(row => row.fulfilledByPeriod).length
        : 0;

    const holdCard = hold
        ? {
              name: tc('focus.name'),
              value: formatMoney(overviewGoalCurrent(hold.goal, currentNet)),
              color: 'var(--color-jar-ff)',
              chart: {
                  kind: 'ring' as const,
                  pct: overviewGoalProgressPct(hold.goal, currentNet),
              },
              href: goalDetailHref(hold.goal.id),
          }
        : null;

    const cards: PortalHubProps['cards'] = [
        {
            name: tc('goals.name'),
            value: traveling ? String(fulfilled) : String(goalsActive),
            note: traveling ? tc('goals.note_travel', { active: String(goalsActive) }) : undefined,
            color: 'var(--color-jar-lts)',
            chart: { kind: 'ring', pct: progress },
            href: '/product/growth/goals',
        },
        {
            name: tc('income.name'),
            value: formatMoney(spanIncome),
            color: 'var(--color-accent)',
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
            name: tc('learn.name'),
            value: String(learn),
            color: 'var(--color-jar-edu)',
            chart: { kind: 'ring', pct: learnProgress },
            href: '/product/growth/learn',
        },
        ...(holdCard ? [holdCard] : []),
    ];

    return (
        <PortalHub
            {...shell}
            compact
            coach={pickPortalCoach(data?.coach ?? [], shell.fallbackCoach, tCoach, t)}
            cards={cards}
        />
    );
}
