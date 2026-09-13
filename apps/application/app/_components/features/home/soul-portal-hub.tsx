'use client';

import { GoalKind, GoalStatus } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { formatMoney } from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import { pickPortalCoach } from '@/app/_lib/portal-coach';
import { isLiveData } from '@/app/_lib/preview';
import { soulPortalShell } from '@/app/_lib/portal-hubs';
import { PortalHub, type PortalHubProps } from '@/components/features/home/portal-hub';
import { useAuth } from '@/components/features/shell/auth-provider';

export function SoulPortalHubClient() {
    const { householdId } = useAuth();
    const live = isLiveData(householdId);

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
    const pledge = (
        (goalsQuery.data ?? []) as ReadonlyArray<{
            kind?: string;
            status?: string;
            target: number;
            saved: number;
        }>
    ).find(
        goal =>
            goal.kind === GoalKind.GIVE &&
            (goal.status === GoalStatus.ACTIVE || goal.status === GoalStatus.REACHED)
    );

    const data = query.data;
    const streak = data?.stillnessStreakDays;
    const thanks = data?.gratitudeThisWeek ?? 0;
    const intention = data?.intention;
    const centres = data?.centresNamedToday ?? 0;

    const props: PortalHubProps = {
        ...soulPortalShell,
        coach: pickPortalCoach(data?.coach ?? [], soulPortalShell.fallbackCoach),
        cards: [
            {
                name: 'Stillness',
                value: streak === null || streak === undefined ? '—' : `${streak}d`,
                note: 'days in a row',
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
                name: 'Gratitude',
                value: String(thanks),
                note: 'things noted this week',
                color: 'var(--color-jar-give)',
                chart: { kind: 'ring', pct: Math.min(100, thanks * 20) },
                href: '/product/soul/gratitude',
            },
            {
                name: 'Giving',
                value: pledge ? formatMoney(pledge.saved) : '—',
                note: pledge
                    ? `of ${formatMoney(pledge.target)} pledged this year`
                    : 'no pledge yet',
                color: 'var(--color-jar-give)',
                chart: {
                    kind: 'ring',
                    pct:
                        pledge && pledge.target > 0
                            ? Math.min(100, Math.round((pledge.saved / pledge.target) * 100))
                            : 0,
                },
                href: '/product/soul/giving',
            },
            {
                name: 'Intent',
                value: intention ? 'Set' : '—',
                note: intention ? intention.slice(0, 42) : 'for this week',
                color: 'var(--color-accent)',
                chart: { kind: 'ring', pct: intention ? 100 : 0 },
                href: '/product/soul/intent',
            },
            {
                name: 'Centres',
                value: String(centres),
                note: 'centres named today',
                color: 'var(--color-jar-edu)',
                chart: { kind: 'ring', pct: 0 },
                href: '/product/soul/centres',
            },
        ],
    };

    return <PortalHub {...props} />;
}
