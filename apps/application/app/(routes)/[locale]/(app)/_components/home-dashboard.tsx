'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useSearchParams } from 'next/navigation';

import { useLiveQuery } from '@rumtelo/hooks';
import { Eyebrow } from '@rumtelo/ui';
import { formatPeriod, toPeriodKey, describePeriodTravel } from '@rumtelo/utils';

import type { CoachMessage, CoachRecapItem } from '@/components/features/home/coach-verdict';

import { JAR_META } from '@/app/_lib/jar-meta';
import { jarKeyToSlug } from '@/app/_lib/jar-slug';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { CoachVerdict } from '@/components/features/home/coach-verdict';
import { HeroKluis } from '@/components/features/home/hero-kluis';
import { PortalWidget } from '@/components/features/home/portal-widget';
import { MonthScoreLog } from '@/components/features/home/month-score-log';
import { JarDrilldownTable } from '@/components/features/money/jar-drilldown-table';
import type { JarDrilldownItem } from '@/components/features/money/jar-drilldown-parts';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';

const FALLBACK_RECAP: CoachRecapItem[] = [
    {
        portal: 'Money',
        value: '—',
        what: 'spent this week',
        tint: 'var(--color-jar-give)',
        href: '/product/money/transactions',
    },
    {
        portal: 'Growth',
        value: '—',
        what: 'income growth/year',
        tint: 'var(--color-jar-lts)',
        href: '/product/growth',
    },
    {
        portal: 'Energy',
        value: '—',
        what: 'trained this week',
        tint: 'var(--color-jar-play)',
        href: '/product/energy',
    },
    {
        portal: 'Soul',
        value: '—',
        what: 'stillness today',
        tint: 'var(--color-portal-soul)',
        href: '/product/soul',
    },
];

export function HomeDashboardClient() {
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { period, showToast, openOnboarding } = useAppShell();
    const { formatMoney } = useHouseholdCurrency();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get('onboarding') === '1' && !householdId) {
            openOnboarding();
        }
    }, [searchParams, householdId, openOnboarding]);
    const periodKey = toPeriodKey(period.year, period.month);
    const live = isLiveData(householdId);

    const emptyDashboard = {
        period: periodKey,
        allocatedTotal: 0,
        incomeTotal: 0,
        spentTotal: 0,
        avgLeftOver: 0,
        safePerDay: 0,
        playLeft: 0,
        inboxCount: 0,
        jarsOnTrack: 0,
        jarsTotal: 0,
        fixedCostsMonthly: 0,
        debtFreeOn: null as string | null,
        debtMonthsRemaining: null as number | null,
        why: null as string | null,
    };

    const emptyMonthScore = {
        period: periodKey,
        score: 0,
        maxScore: 100,
        daysLeft: 0,
        level: 1,
        levelLabel: 'Beginner',
        events: [] as Array<{ day: number; text: string; points: number; kind: string }>,
    };

    const dashboardQuery = useLiveQuery(
        apiQuery.money.dashboard.get.queryOptions({
            input: { householdId: householdId!, period: periodKey },
        }),
        emptyDashboard as never,
        live
    );

    const closeMonthScoreMutation = useMutation({
        mutationFn: async () => {
            if (!householdId) throw new Error('No household');
            return api.money.monthScore.close({ householdId, period: periodKey });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.dashboard.get.key() });
            showToast('Month closed', 'success');
        },
        onError: () => showToast('Close failed', 'error'),
    });

    const liveData = dashboardQuery.data;
    const dashboard = liveData ?? emptyDashboard;
    const jars: JarDrilldownItem[] = (liveData?.jars ?? []).map(jar => {
        const meta = JAR_META.find(entry => entry.key === jar.key);
        return {
            id: jar.id,
            key: jar.key,
            name: jar.name,
            subtitle: jar.subtitle ?? meta?.subtitle ?? '',
            icon: jar.icon ?? meta?.icon ?? '◇',
            color: meta?.color ?? 'bg-jar-nec',
            allocated: jar.allocated,
            available: jar.available,
            spent: jar.spent,
            committedOut: jar.committedOut,
            overspent: jar.overspent,
            categories: jar.categories ?? [],
            href: `/product/money/jars/${jarKeyToSlug(jar.key)}`,
        };
    });
    const monthScore = liveData?.monthScore ?? emptyMonthScore;
    const periodLabel = liveData?.periodLabel ?? formatPeriod(periodKey, 'en-US');
    const coach: CoachMessage[] =
        live && liveData?.coach?.length
            ? liveData.coach.map((message: (typeof liveData.coach)[number]) => ({
                  id: message.id,
                  kind: message.kind,
                  text: message.text,
                  ctaLabel: message.ctaLabel ?? 'Open',
                  ctaHref: message.ctaHref ?? '/',
              }))
            : [];

    const travel = describePeriodTravel(period);

    return (
        <div className="grid gap-6">
            <div>
                <Eyebrow>
                    ✦ {formatPeriod(dashboard.period ?? periodKey, 'en-US')}
                    {travel.direction !== 'current' ? ` · ${travel.relativeLabel}` : ''}
                </Eyebrow>
                <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg lg:text-4xl">
                    {periodLabel}
                </h1>
                {travel.direction !== 'current' && travel.daysLabel ? (
                    <p className="mt-1 text-sm text-fg-muted">{travel.daysLabel}</p>
                ) : null}
            </div>

            <CoachVerdict
                messages={
                    coach.length
                        ? coach
                        : [
                              {
                                  id: 'fallback',
                                  kind: 'NUDGE',
                                  text: dashboard.inboxCount
                                      ? `${dashboard.inboxCount} transaction${dashboard.inboxCount === 1 ? '' : 's'} waiting for a jar.`
                                      : 'All sorted — time for intention.',
                                  ctaLabel: dashboard.inboxCount ? 'Sort inbox' : 'Week check',
                                  ctaHref: dashboard.inboxCount
                                      ? '/product/money/transactions'
                                      : '/product/money/week-check',
                              },
                          ]
                }
                recap={FALLBACK_RECAP}
            />

            <HeroKluis
                total={formatMoney(dashboard.allocatedTotal ?? 0)}
                incomeBreakdown={`Distributed across ${jars.length} jar${jars.length === 1 ? '' : 's'}`}
                stats={[
                    {
                        label: 'Avg left/month',
                        value: formatMoney(dashboard.avgLeftOver ?? 0),
                        tone: 'accent',
                    },
                    {
                        label: 'Safe per day',
                        value: formatMoney(dashboard.safePerDay ?? 0),
                        tone: 'accent',
                    },
                    {
                        label: 'Left in Play',
                        value: formatMoney(dashboard.playLeft ?? 0),
                        href: `/product/money/jars/${jarKeyToSlug('PLAY')}`,
                    },
                ]}>
                <JarDrilldownTable jars={jars} />
            </HeroKluis>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <PortalWidget
                    tint="var(--color-jar-lts)"
                    icon="↗"
                    title="Growth"
                    href="/product/growth"
                    stats={[
                        {
                            label: 'INCOME THIS MONTH',
                            value: formatMoney(dashboard.incomeTotal ?? 0),
                        },
                        { label: 'INBOX', value: String(dashboard.inboxCount ?? 0) },
                    ]}
                    tagline="Cutting costs has a floor; raising income does not."
                />
                <PortalWidget
                    tint="var(--color-jar-play)"
                    icon={'✳\uFE0E'}
                    title="Energy"
                    href="/product/energy"
                    stats={[
                        { label: 'TRAINED THIS WEEK', value: '—' },
                        { label: 'SLEEP SCORE', value: '—' },
                    ]}
                    tagline="A tired mind spends; a rested mind directs."
                />
                <PortalWidget
                    tint="var(--color-portal-soul)"
                    icon="✦"
                    title="Soul"
                    href="/product/soul"
                    stats={[
                        { label: 'STILLNESS TODAY', value: '—' },
                        { label: 'WHY', value: dashboard.why ? '✓' : '—' },
                    ]}
                    tagline="A calm mind directs money. A restless one spends it."
                />
            </div>

            <MonthScoreLog
                score={monthScore.score}
                daysLeft={monthScore.daysLeft}
                events={monthScore.events}
            />

            {live && liveData?.monthScore && !liveData.monthScore.isClosed && (
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => closeMonthScoreMutation.mutate()}
                        disabled={closeMonthScoreMutation.isPending}
                        className="rounded-full border border-line-strong px-5 py-2.5 font-mono text-xs font-medium tracking-wide text-fg-muted uppercase transition-colors hover:border-accent-hover hover:text-accent disabled:opacity-50">
                        {closeMonthScoreMutation.isPending ? 'Working…' : 'Close month'}
                    </button>
                </div>
            )}
        </div>
    );
}
