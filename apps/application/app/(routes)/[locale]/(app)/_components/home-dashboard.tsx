'use client';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { useSearchParams } from 'next/navigation';

import { CoachKind, type MonthScore } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Eyebrow, Typography } from '@rumtelo/ui';
import { formatPeriod, toPeriodKey, describePeriodTravel, cn } from '@rumtelo/utils';

import type { CoachVerdictMessage, CoachRecapItem } from '@/components/features/home/coach-verdict';

import { resolveJarSubtitle } from '@/app/_lib/jar-copy';
import { monthScoreRecapHeadline } from '@/app/_lib/month-score-copy';
import { jarChrome } from '@/app/_lib/jar-meta';
import { buildPeriodTravelCoachText } from '@/app/_lib/period-travel-coach-copy';
import { formatPeriodTravelLabels } from '@/app/_lib/period-travel-i18n';
import { isProductEnabled } from '@/app/_lib/launch-products';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { jarKeyToSlug } from '@/app/_lib/jar-slug';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useCategoryTemplates } from '@/components/features/forms/catalog-helpers';
import { CoachVerdict } from '@/components/features/home/coach-verdict';
import { HeroKluis } from '@/components/features/home/hero-kluis';
import { PortalWidget } from '@/components/features/home/portal-widget';
import { MonthScoreLog } from '@/components/features/home/month-score-log';
import { JarDrilldownTable } from '@/components/features/money/jar-drilldown-table';
import type { JarDrilldownItem } from '@/components/features/money/jar-drilldown-parts';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';

export function HomeDashboardClient() {
    const t = useTranslations();
    const tCoach = useTranslations('features.coach');
    const tDashboard = useTranslations('pages.dashboard');
    const tJars = useTranslations('features.money.jars');
    const tShell = useTranslations('pages.shell');
    const locale = useLocale();
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { period, showToast, openOnboarding } = useAppShell();
    const apiError = useApiError();
    const { formatMoney } = useHouseholdCurrency();
    const searchParams = useSearchParams();

    const fallbackRecap = useMemo((): CoachRecapItem[] => {
        const items = [
            {
                product: 'money',
                portalKey: 'pages.nav.pills.money',
                whatKey: 'pages.dashboard.recap.money_what',
                tint: 'var(--color-jar-give)',
                href: '/product/money/transactions',
            },
            {
                product: 'growth',
                portalKey: 'pages.nav.pills.growth',
                whatKey: 'pages.dashboard.recap.growth_what',
                tint: 'var(--color-jar-lts)',
                href: '/product/growth',
            },
            {
                product: 'energy',
                portalKey: 'pages.nav.pills.energy',
                whatKey: 'pages.dashboard.recap.energy_what',
                tint: 'var(--color-jar-play)',
                href: '/product/energy',
            },
            {
                product: 'soul',
                portalKey: 'pages.nav.pills.soul',
                whatKey: 'pages.dashboard.recap.soul_what',
                tint: 'var(--color-portal-soul)',
                href: '/product/soul',
            },
        ] as const;

        return items
            .filter(item => isProductEnabled(item.product))
            .map(item => ({
                portal: t(item.portalKey),
                value: '—',
                what: t(item.whatKey),
                tint: item.tint,
                href: item.href,
            }));
    }, [t]);

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
        travel: {
            direction: 'current' as const,
            monthsHorizon: 1,
            mode: 'snapshot' as const,
            relativeLabel: t('pages.shell.period_options.this_month'),
            daysLabel: null as string | null,
        },
        goalsAtPeriod: [] as const,
        debtsAtPeriod: null,
        baselineAllocatedTotal: null as number | null,
        baselineJars: null,
    };

    const emptyMonthScore: MonthScore = {
        householdId: householdId ?? '00000000-0000-4000-8000-000000000000',
        period: periodKey,
        score: 0,
        maxScore: 100,
        daysLeft: 0,
        isClosed: false,
        level: 1,
        events: [],
    };

    const { byKey: catalogByKey } = useJarCatalog();
    const categoryTemplatesQuery = useCategoryTemplates(live);

    const dashboardQuery = useLiveQuery(
        apiQuery.money.dashboard.get.queryOptions({
            input: { householdId: householdId!, period: periodKey },
        }),
        emptyDashboard as never,
        live
    );

    const byJarQuery = useLiveQuery(
        apiQuery.money.fixedCosts.byJar.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );

    const periodTxQuery = useLiveQuery(
        apiQuery.money.transactions.list.queryOptions({
            input: { householdId: householdId!, period: periodKey, limit: 200 },
        }),
        { items: [], nextCursor: null },
        live
    );

    const merchantsQuery = useLiveQuery(
        apiQuery.money.catalogs.merchantPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [] as never,
        live
    );

    const givingOrgsQuery = useLiveQuery(
        apiQuery.money.catalogs.givingOrganisations.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [] as never,
        live
    );

    const closeMonthScoreMutation = useMutation({
        mutationFn: async () => {
            if (!householdId) throw new Error('No household');
            return api.money.monthScore.close({ householdId, period: periodKey });
        },
        onSuccess: recap => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.dashboard.get.key() });
            showToast(
                monthScoreRecapHeadline(tDashboard, recap.headlineKey, formatMoney, recap.leftOver),
                'success'
            );
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const liveData = dashboardQuery.data;
    const dashboard = liveData ?? emptyDashboard;
    const baselineById = new Map(
        (liveData?.baselineJars ?? []).map(jar => [jar.id, jar.allocated] as const)
    );
    const jars: JarDrilldownItem[] = (liveData?.jars ?? []).map(jar => {
        const catalog = catalogByKey.get(jar.key);
        return {
            id: jar.id,
            key: jar.key,
            name: jar.name,
            subtitle: resolveJarSubtitle(tJars, jar.key, jar.subtitle, catalog?.subtitle),
            icon: jar.icon ?? catalog?.icon ?? '◇',
            color: jarChrome(jar.key).color,
            allocated: jar.allocated,
            available: jar.available,
            spent: jar.spent,
            committedOut: jar.committedOut,
            overspent: jar.overspent,
            categories: jar.categories ?? [],
            href: `/product/money/jars/${jarKeyToSlug(jar.key)}`,
            baselineAllocated: baselineById.get(jar.id) ?? null,
        };
    });
    const monthScore = liveData?.monthScore ?? emptyMonthScore;
    const periodLabel = formatPeriod(dashboard.period ?? periodKey, locale);
    const travelMeta = liveData?.travel ?? emptyDashboard.travel;
    const stacked = travelMeta.mode === 'stacked';
    const travel = describePeriodTravel(period);
    const travelLabels = formatPeriodTravelLabels(travel, tShell);
    const goalsAtPeriod = liveData?.goalsAtPeriod ?? [];
    const periodTravelCoachText = stacked
        ? buildPeriodTravelCoachText({
              period: periodKey,
              locale,
              travel,
              monthsHorizon: travelMeta.monthsHorizon,
              stackedTotal: dashboard.allocatedTotal ?? 0,
              formatMoney,
              goalsAtPeriod,
              jarHighlights: (liveData?.jars ?? []).slice(0, 2).map(jar => ({
                  name: jar.name,
                  from: baselineById.get(jar.id) ?? jar.allocated,
                  to: jar.allocated,
              })),
              tCoach,
              tShell,
          })
        : null;
    const travelCoach: CoachVerdictMessage | null = periodTravelCoachText
        ? {
              id: 'period-travel',
              key: null,
              kind: CoachKind.WIN,
              text: periodTravelCoachText,
              ctaLabel: t('pages.dashboard.coach.see_jars'),
              ctaHref: '/product/money/jars',
          }
        : null;
    const coach: readonly CoachVerdictMessage[] = (() => {
        const feed =
            live && liveData?.coach?.length
                ? liveData.coach
                : [
                      {
                          id: 'fallback',
                          key: null,
                          kind: CoachKind.NUDGE,
                          text: dashboard.inboxCount
                              ? t(
                                    dashboard.inboxCount === 1
                                        ? 'pages.dashboard.coach.inbox_one'
                                        : 'pages.dashboard.coach.inbox_many',
                                    { count: dashboard.inboxCount }
                                )
                              : t('pages.dashboard.coach.all_sorted'),
                          ctaLabel: dashboard.inboxCount
                              ? t('pages.dashboard.coach.sort_inbox')
                              : t('pages.dashboard.coach.week_check'),
                          ctaHref: dashboard.inboxCount
                              ? '/product/money/transactions'
                              : '/product/money/week-check',
                      },
                  ];
        return travelCoach ? [travelCoach, ...feed] : feed;
    })();

    const horizon = travelMeta.monthsHorizon;
    const baselineTotal = dashboard.baselineAllocatedTotal;
    const totalDelta =
        stacked && baselineTotal !== null && baselineTotal !== undefined
            ? {
                  fromLabel: formatMoney(baselineTotal),
                  toLabel: formatMoney(dashboard.allocatedTotal ?? 0),
                  deltaLabel: t('pages.dashboard.travel.delta_months', {
                      delta: `${dashboard.allocatedTotal - baselineTotal >= 0 ? '+' : ''}${formatMoney(dashboard.allocatedTotal - baselineTotal)}`,
                      months: horizon,
                  }),
                  tone: 'grow' as const,
              }
            : null;

    const debtsAtPeriod = liveData?.debtsAtPeriod ?? null;
    const fulfilledGoals = goalsAtPeriod.filter(goal => goal.fulfilledByPeriod).length;
    const travelStrip =
        stacked && (goalsAtPeriod.length > 0 || debtsAtPeriod)
            ? [
                  goalsAtPeriod.length
                      ? t('pages.dashboard.travel.goals_on_track', {
                            fulfilled: fulfilledGoals,
                            total: goalsAtPeriod.length,
                        })
                      : null,
                  debtsAtPeriod
                      ? debtsAtPeriod.clearedByPeriod
                          ? t('pages.dashboard.travel.debt_cleared')
                          : t('pages.dashboard.travel.debt_shift', {
                                from: formatMoney(debtsAtPeriod.totalOriginal),
                                to: formatMoney(debtsAtPeriod.totalRemaining),
                            })
                      : null,
              ]
                  .filter(Boolean)
                  .join(' · ')
            : null;

    const heroEyebrow = stacked
        ? travel.direction === 'past'
            ? t('pages.dashboard.hero.money_accumulated', {
                  period: formatPeriod(periodKey, locale),
              })
            : horizon === 1
              ? t('pages.dashboard.hero.money_put_through_one')
              : t('pages.dashboard.hero.money_put_through', { months: horizon })
        : t('pages.dashboard.hero.money_distributed');

    const incomeBreakdown = stacked
        ? jars.length === 1
            ? t('pages.dashboard.hero.income_span_one_jar', { months: horizon })
            : t('pages.dashboard.hero.income_span', { months: horizon, jars: jars.length })
        : jars.length === 1
          ? t('pages.dashboard.hero.income_month_one_jar')
          : t('pages.dashboard.hero.income_month', { jars: jars.length });

    return (
        <div className="grid gap-6">
            <div>
                <Eyebrow>
                    ✦ {formatPeriod(dashboard.period ?? periodKey, locale)}
                    {travel.direction !== 'current' ? ` · ${travelLabels.relativeLabel}` : ''}
                </Eyebrow>
                <Typography as="h1" className="mt-2">
                    {periodLabel}
                </Typography>
                {travelStrip ? (
                    <Typography as="p" size="sm" color="muted" className="mt-1.5">
                        {travelStrip}
                    </Typography>
                ) : null}
            </div>

            <CoachVerdict messages={coach} recap={fallbackRecap} />

            <HeroKluis
                eyebrow={heroEyebrow}
                total={formatMoney(dashboard.allocatedTotal ?? 0)}
                totalDelta={totalDelta}
                incomeBreakdown={incomeBreakdown}
                stats={[
                    {
                        label: t('pages.dashboard.stats.avg_left'),
                        value: formatMoney(dashboard.avgLeftOver ?? 0),
                        tone: 'accent',
                    },
                    {
                        label: t('pages.dashboard.stats.safe_per_day'),
                        value: formatMoney(dashboard.safePerDay ?? 0),
                        tone: 'accent',
                    },
                    {
                        label: t('pages.dashboard.stats.play_left'),
                        value: formatMoney(dashboard.playLeft ?? 0),
                        href: `/product/money/jars/${jarKeyToSlug('PLAY')}`,
                    },
                ]}>
                <JarDrilldownTable
                    jars={jars}
                    extras={
                        live
                            ? {
                                  period,
                                  fixedCosts: (byJarQuery.data ?? []).flatMap(group => group.items),
                                  transactions: periodTxQuery.data?.items ?? [],
                                  categoryTemplates: categoryTemplatesQuery.data ?? [],
                                  merchants: merchantsQuery.data ?? [],
                                  givingOrgs: givingOrgsQuery.data ?? [],
                                  jarByKey: catalogByKey,
                              }
                            : undefined
                    }
                />
            </HeroKluis>

            <div
                className={cn(
                    'grid grid-cols-1 gap-4',
                    isProductEnabled('energy') || isProductEnabled('soul')
                        ? 'lg:grid-cols-3'
                        : 'lg:grid-cols-1'
                )}>
                <PortalWidget
                    tint="var(--color-jar-lts)"
                    icon="↗"
                    title={t('pages.nav.pills.growth')}
                    href="/product/growth"
                    stats={[
                        {
                            label: stacked
                                ? t('pages.dashboard.widgets.growth.income_span')
                                : t('pages.dashboard.widgets.growth.income_month'),
                            value: formatMoney(dashboard.incomeTotal ?? 0),
                        },
                        {
                            label: t('pages.dashboard.widgets.growth.inbox'),
                            value: String(dashboard.inboxCount ?? 0),
                        },
                    ]}
                    tagline={t('pages.dashboard.widgets.growth.tagline')}
                />
                {isProductEnabled('energy') && (
                    <PortalWidget
                        tint="var(--color-jar-play)"
                        icon={'✳\uFE0E'}
                        title={t('pages.nav.pills.energy')}
                        href="/product/energy"
                        stats={[
                            {
                                label: t('pages.dashboard.widgets.energy.trained'),
                                value: '—',
                            },
                            { label: t('pages.dashboard.widgets.energy.sleep'), value: '—' },
                        ]}
                        tagline={t('pages.dashboard.widgets.energy.tagline')}
                    />
                )}
                {isProductEnabled('soul') && (
                    <PortalWidget
                        tint="var(--color-portal-soul)"
                        icon="✦"
                        title={t('pages.nav.pills.soul')}
                        href="/product/soul"
                        stats={[
                            {
                                label: t('pages.dashboard.widgets.soul.stillness'),
                                value: '—',
                            },
                            {
                                label: t('pages.dashboard.widgets.soul.why'),
                                value: dashboard.why ? '✓' : '—',
                            },
                        ]}
                        tagline={t('pages.dashboard.widgets.soul.tagline')}
                    />
                )}
            </div>

            <MonthScoreLog
                score={monthScore.score}
                daysLeft={monthScore.daysLeft}
                level={monthScore.level}
                events={monthScore.events}
            />

            {live && liveData?.monthScore && !liveData.monthScore.isClosed && (
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => closeMonthScoreMutation.mutate()}
                        disabled={closeMonthScoreMutation.isPending}
                        className="rounded-full border border-line-strong px-5 py-2.5 font-mono text-xs font-medium tracking-wide text-fg-muted uppercase transition-colors hover:border-accent-hover hover:text-accent disabled:opacity-50">
                        {closeMonthScoreMutation.isPending
                            ? t('pages.dashboard.closing')
                            : t('pages.dashboard.close_month')}
                    </button>
                </div>
            )}
        </div>
    );
}
