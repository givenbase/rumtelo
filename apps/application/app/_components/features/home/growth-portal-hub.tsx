'use client';

import { useLiveQuery } from '@rumtelo/hooks';

import { apiQuery } from '@/app/_lib/api-hooks';
import { pickPortalCoach } from '@/app/_lib/portal-coach';
import { isLiveData } from '@/app/_lib/preview';
import { growthPortalShell } from '@/app/_lib/portal-hubs';
import { PortalHub, type PortalHubProps } from '@/components/features/home/portal-hub';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

export function GrowthPortalHubClient() {
    const { householdId } = useAuth();
    const { formatMoney } = useHouseholdCurrency();
    const live = isLiveData(householdId);

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
    const learn = data?.learnQueued ?? 0;
    const netWorth = data?.netWorth;
    const progress = data?.goalsProgressPct ?? 0;

    const props: PortalHubProps = {
        ...growthPortalShell,
        coach: pickPortalCoach(data?.coach ?? [], growthPortalShell.fallbackCoach),
        cards: [
            {
                name: 'Goals',
                value: String(goalsActive),
                note: 'goals in progress',
                color: 'var(--color-jar-lts)',
                chart: { kind: 'ring', pct: progress },
                href: '/product/growth/goals',
            },
            {
                name: 'Income',
                value: formatMoney(income),
                note: 'per month now',
                color: 'var(--color-accent)',
                chart: { kind: 'bars', bars: [0, 0, 0, 0, 0, 0, 0] },
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
