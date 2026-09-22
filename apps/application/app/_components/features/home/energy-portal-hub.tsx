'use client';

import { useTranslations } from '@rumtelo/i18n';
import { useLiveQuery } from '@rumtelo/hooks';

import { apiQuery } from '@/app/_lib/api-hooks';
import { pickPortalCoach } from '@/app/_lib/portal-coach';
import { isLiveData } from '@/app/_lib/preview';
import { energyPortalShell } from '@/app/_lib/portal-hubs';
import { PortalHub, type PortalHubProps } from '@/components/features/home/portal-hub';
import { useAuth } from '@/components/features/shell/auth-provider';

function scoreLabel(score: number | null | undefined): string {
    if (score === null || score === undefined) return '—';
    return String(Math.round(score));
}

export function EnergyPortalHubClient() {
    const t = useTranslations();
    const tCoach = useTranslations('features.coach');
    const tc = useTranslations('features.energy.hub.cards');
    const shell = energyPortalShell(t);
    const { householdId } = useAuth();
    const live = isLiveData(householdId);

    const query = useLiveQuery(
        apiQuery.energy.dashboard.get.queryOptions({
            input: { householdId: householdId! },
        }),
        null,
        live
    );

    const data = query.data;
    const sleep = data?.sleepScore7d;
    const food = data?.foodScore7d;
    const sessions = data?.trainSessionsThisWeek ?? 0;
    const weekDone = data?.weekCheckCompleted === true;

    const props: PortalHubProps = {
        ...shell,
        coach: pickPortalCoach(data?.coach ?? [], shell.fallbackCoach, tCoach, t),
        cards: [
            {
                name: tc('week.name'),
                value: weekDone ? tc('week.done') : tc('week.open'),
                note: tc('week.note'),
                color: 'var(--color-accent)',
                chart: { kind: 'ring', pct: weekDone ? 100 : 0 },
                href: '/product/energy/week',
            },
            {
                name: tc('sleep.name'),
                value: scoreLabel(sleep),
                note: tc('sleep.note'),
                color: 'var(--color-jar-lts)',
                chart: {
                    kind: 'bars',
                    bars:
                        sleep === null || sleep === undefined
                            ? [0, 0, 0, 0, 0, 0, 0]
                            : Array(7).fill(Math.round(sleep)),
                },
                href: '/product/energy/sleep',
            },
            {
                name: tc('training.name'),
                value: String(sessions),
                note: tc('training.note'),
                color: 'var(--color-jar-ff)',
                chart: { kind: 'ring', pct: Math.min(100, sessions * 25) },
                href: '/product/energy/training',
            },
            {
                name: tc('food.name'),
                value: scoreLabel(food),
                note: tc('food.note'),
                color: 'var(--color-jar-play)',
                chart: {
                    kind: 'ring',
                    pct: food === null || food === undefined ? 0 : Math.round(food),
                },
                href: '/product/energy/food',
            },
        ],
    };

    return <PortalHub {...props} />;
}
