'use client';

import type { Goal } from '@rumtelo/contracts';
import { GoalKind, GoalStatus } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import {
    describePeriodTravel,
    endOfPeriodIso,
    projectGoalsAtHorizon,
    toPeriodKey,
} from '@rumtelo/utils';
import { useMemo } from 'react';

import { useTranslations } from '@rumtelo/i18n';

import { apiQuery } from '@/app/_lib/api-hooks';
import { pickPortalCoach } from '@/app/_lib/portal-coach';
import { isLiveData } from '@/app/_lib/preview';
import { soulPortalShell } from '@/app/_lib/portal-hubs';
import { PortalHub, type PortalHubProps } from '@/components/features/home/portal-hub';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

type PledgeGoal = Pick<
    Goal,
    | 'id'
    | 'name'
    | 'kind'
    | 'status'
    | 'target'
    | 'saved'
    | 'monthlyContribution'
    | 'targetOn'
    | 'fulfilledOn'
>;

export function SoulPortalHubClient() {
    const t = useTranslations();
    const tCoach = useTranslations('features.coach');
    const tc = useTranslations('features.soul.hub.cards');
    const shell = soulPortalShell(t);
    const { householdId } = useAuth();
    const { period } = useAppShell();
    const { formatMoney } = useHouseholdCurrency();
    const live = isLiveData(householdId);
    const travel = describePeriodTravel(period);
    const traveling = travel.direction !== 'current';
    const periodKey = toPeriodKey(period.year, period.month);

    const query = useLiveQuery(
        apiQuery.soul.dashboard.get.queryOptions({
            input: { householdId: householdId! },
        }),
        null,
        live
    );

    // Giving lives in Money's ledger; Soul only reads the pledge.
    const goalsQuery = useLiveQuery(
        apiQuery.money.goals.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
    const pledge = ((goalsQuery.data ?? []) as ReadonlyArray<PledgeGoal>).find(
        goal =>
            goal.kind === GoalKind.GIVE &&
            (goal.status === GoalStatus.ACTIVE || goal.status === GoalStatus.REACHED)
    );
    const pledgeAt = useMemo(() => {
        if (!traveling || !pledge) return null;
        return (
            projectGoalsAtHorizon({
                monthsDelta: travel.monthsDelta,
                direction: travel.direction,
                selectedPeriodEndIso: endOfPeriodIso(periodKey),
                goals: [
                    {
                        id: pledge.id,
                        name: pledge.name,
                        jarKey: null,
                        kind: pledge.kind,
                        status: pledge.status,
                        saved: pledge.saved,
                        target: pledge.target,
                        monthlyContribution: pledge.monthlyContribution,
                        targetOn: pledge.targetOn,
                        fulfilledOn: pledge.fulfilledOn,
                    },
                ],
            })[0] ?? null
        );
    }, [traveling, pledge, travel.monthsDelta, travel.direction, periodKey]);
    const pledgeSaved = pledgeAt?.projectedSaved ?? pledge?.saved ?? 0;

    const data = query.data;
    const streak = data?.stillnessStreakDays;
    const thanks = data?.gratitudeThisWeek ?? 0;
    const intention = data?.intention;
    const centres = data?.centresNamedToday ?? 0;

    const givingNote = pledge
        ? pledgeAt?.fulfilledByPeriod
            ? tc('giving.reached_by_then', { target: formatMoney(pledge.target) })
            : traveling
              ? tc('giving.now_of_target', {
                    saved: formatMoney(pledge.saved),
                    target: formatMoney(pledge.target),
                })
              : tc('giving.pledged_this_year', { target: formatMoney(pledge.target) })
        : tc('giving.no_pledge');

    const props: PortalHubProps = {
        ...shell,
        coach: pickPortalCoach(data?.coach ?? [], shell.fallbackCoach, tCoach, t),
        cards: [
            {
                name: tc('stillness.name'),
                value: streak === null || streak === undefined ? '—' : String(streak),
                note: tc('stillness.note'),
                color: 'var(--color-portal-soul)',
                chart: {
                    kind: 'bars',
                    bars:
                        streak === null || streak === undefined
                            ? [0, 0, 0, 0, 0, 0, 0]
                            : Array(7)
                                  .fill(0)
                                  .map((_, day) => (day < Math.min(7, streak) ? 70 : 12)),
                },
                href: '/product/soul/stillness',
            },
            {
                name: tc('gratitude.name'),
                value: String(thanks),
                note: tc('gratitude.note'),
                color: 'var(--color-jar-give)',
                chart: { kind: 'ring', pct: Math.min(100, thanks * 20) },
                href: '/product/soul/gratitude',
            },
            {
                name: tc('giving.name'),
                value: pledge ? formatMoney(pledgeSaved) : '—',
                note: givingNote,
                color: 'var(--color-jar-give)',
                chart: {
                    kind: 'ring',
                    pct:
                        pledge && pledge.target > 0
                            ? Math.min(100, Math.round((pledgeSaved / pledge.target) * 100))
                            : 0,
                },
                delta:
                    traveling && pledge && pledgeAt && pledgeAt.projectedSaved !== pledge.saved
                        ? {
                              mark: '↑',
                              text: `${formatMoney(pledge.saved)} → ${formatMoney(pledgeAt.projectedSaved)}`,
                              positive: true,
                          }
                        : undefined,
                href: '/product/soul/giving',
            },
            {
                name: tc('intent.name'),
                value: intention ? tc('intent.set') : '—',
                note: intention ? intention.slice(0, 42) : tc('intent.note_empty'),
                color: 'var(--color-accent)',
                chart: { kind: 'ring', pct: intention ? 100 : 0 },
                href: '/product/soul/intent',
            },
            {
                name: tc('centres.name'),
                value: String(centres),
                note: tc('centres.note'),
                color: 'var(--color-jar-edu)',
                chart: { kind: 'ring', pct: 0 },
                href: '/product/soul/centres',
            },
        ],
    };

    return <PortalHub {...props} />;
}
