'use client';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    CoachKind,
    HouseholdRole,
    PracticeClientLinkStatus,
    WeekCheckStage,
    type MonthCloseBillDisposition,
    type MonthScore,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Eyebrow, Typography } from '@rumtelo/ui';
import {
    currentWeekKey,
    formatPeriod,
    toPeriodKey,
    describePeriodTravel,
    cn,
} from '@rumtelo/utils';

import type { CoachVerdictMessage } from '@/components/features/home/coach-verdict';

import { resolveJarSubtitle } from '@/app/_lib/jar-copy';
import { monthScoreRecapHeadline } from '@/app/_lib/month-score-copy';
import { jarChrome } from '@/app/_lib/jar-meta';
import { buildPeriodTravelScoreNote } from '@/app/_lib/period-travel-score-note';
import { formatPeriodTravelLabels } from '@/app/_lib/period-travel-i18n';
import { isProductEnabled } from '@/app/_lib/launch-products';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { jarKeyToSlug } from '@/app/_lib/jar-slug';
import { settingsHref } from '@/app/_lib/settings-tabs';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useCategoryTemplates } from '@/components/features/forms/catalog-helpers';
import { CoachVerdict } from '@/components/features/home/coach-verdict';
import { HeroKluis } from '@/components/features/home/hero-kluis';
import { PortalWidget } from '@/components/features/home/portal-widget';
import { TodayCard } from '@/components/features/home/today-card';
import { MonthScoreLog } from '@/components/features/home/month-score-log';
import { JarDrilldownTable } from '@/components/features/money/jar-drilldown-table';
import type { JarDrilldownItem } from '@/components/features/money/jar-drilldown-parts';
import { useHelpersEnabled } from '@/components/features/helpers';
import { HouseholdPermissionSection, roleCanSee } from '@/app/_lib/role-permissions';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';

export function HomeDashboardClient() {
    const t = useTranslations();
    const tDashboard = useTranslations('pages.dashboard');
    const tJars = useTranslations('features.money.jars');
    const tShell = useTranslations('pages.shell');
    const locale = useLocale();
    const queryClient = useQueryClient();
    const { householdId, session } = useAuth();
    const { period, showToast } = useHouseholdShell();
    const { canMutate, role } = useBoardWriteAccess();
    const helpersEnabled = useHelpersEnabled();
    const canSeeHome = roleCanSee(role, HouseholdPermissionSection.HOME);
    const canSeeGrowth = roleCanSee(role, HouseholdPermissionSection.GROWTH);
    const canSeeEnergy = roleCanSee(role, HouseholdPermissionSection.ENERGY);
    const canSeeSoul = roleCanSee(role, HouseholdPermissionSection.SOUL);
    const apiError = useApiError();
    const { formatMoney } = useHouseholdCurrency();

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
        closeBlockers: { inboxCount: 0, dueBillCount: 0, dueBillNames: [], dueBills: [] },
        priorOpenPeriod: null,
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
        apiQuery.money.catalogs.givingOrganizations.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [] as never,
        live
    );

    const membersQuery = useLiveQuery(
        apiQuery.household.members.queryOptions({ input: { householdId: householdId! } }),
        [],
        live
    );
    const myMember = (membersQuery.data ?? []).find(m => m.userId === session?.user?.id);
    const canManagePractice = myMember?.role === HouseholdRole.OWNER;
    const practiceLinksQuery = useLiveQuery(
        apiQuery.household.practiceLinks.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live && canManagePractice
    );
    const pendingPracticeCount = (practiceLinksQuery.data ?? []).filter(
        link => link.status === PracticeClientLinkStatus.INVITED
    ).length;

    const weekKey = currentWeekKey();
    const weekCheckQuery = useLiveQuery(
        apiQuery.money.weekCheck.current.queryOptions({
            input: { householdId: householdId!, week: weekKey },
        }),
        {
            id: '',
            householdId: householdId ?? '',
            week: weekKey,
            stage: WeekCheckStage.LOOK,
            surplus: 0,
            allocations: [],
            intention: null,
            completedAt: null,
        },
        live
    );
    const weekCheckDone =
        Boolean(weekCheckQuery.data?.completedAt) ||
        weekCheckQuery.data?.stage === WeekCheckStage.DONE;

    const closeMonthScoreMutation = useMutation({
        mutationFn: async (billDispositions?: MonthCloseBillDisposition[]) => {
            if (!householdId) throw new Error('No household');
            return api.money.monthScore.close({
                householdId,
                period: periodKey,
                billDispositions,
            });
        },
        onSuccess: recap => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.dashboard.get.key() });
            void queryClient.invalidateQueries({
                queryKey: apiQuery.money.fixedCosts.listSettlements.key(),
            });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.debts.list.key() });
            const recapLine = monthScoreRecapHeadline(
                tDashboard,
                recap.headlineKey,
                formatMoney,
                recap.leftOver
            );
            showToast(tDashboard('month_closed_toast', { recap: recapLine }), 'success');
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
            potBalance: jar.potBalance,
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
    const periodScoreNote = stacked
        ? buildPeriodTravelScoreNote({
              period: periodKey,
              locale,
              travel,
              monthsHorizon: travelMeta.monthsHorizon,
              stackedTotal: dashboard.allocatedTotal ?? 0,
              formatMoney,
              jarHighlights: (liveData?.jars ?? []).slice(0, 2).map(jar => ({
                  name: jar.name,
                  from: baselineById.get(jar.id) ?? jar.allocated,
                  to: jar.allocated,
              })),
              tDashboard,
          })
        : null;
    const coach: readonly CoachVerdictMessage[] = (() => {
        const practiceNudge: CoachVerdictMessage | null =
            live && canManagePractice && pendingPracticeCount > 0
                ? {
                      id: 'practice-pending',
                      key: null,
                      kind: CoachKind.NUDGE,
                      text:
                          pendingPracticeCount === 1
                              ? tDashboard('coach.practice_pending_one')
                              : tDashboard('coach.practice_pending_many', {
                                    count: pendingPracticeCount,
                                }),
                      ctaLabel: tDashboard('coach.practice_pending_cta'),
                      ctaHref: settingsHref('practice'),
                  }
                : null;

        const moneyCoach: readonly CoachVerdictMessage[] = (() => {
            if (live && liveData?.coach?.length) return liveData.coach;

            if (dashboard.inboxCount) {
                return [
                    {
                        id: 'fallback-inbox',
                        key: null,
                        kind: CoachKind.NUDGE,
                        text: t(
                            dashboard.inboxCount === 1
                                ? 'pages.dashboard.coach.inbox_one'
                                : 'pages.dashboard.coach.inbox_many',
                            { count: dashboard.inboxCount }
                        ),
                        ctaLabel: t('pages.dashboard.coach.sort_inbox'),
                        ctaHref: '/product/money/transactions',
                    },
                ];
            }

            // Inbox clear — only nudge the week check when it is still open.
            // When that is done too, stay quiet (month-score slide still covers close work).
            if (!weekCheckDone) {
                return [
                    {
                        id: 'fallback-week-check',
                        key: null,
                        kind: CoachKind.WEEK_CHECK,
                        text: t('pages.dashboard.coach.all_sorted'),
                        ctaLabel: t('pages.dashboard.coach.week_check'),
                        ctaHref: '/product/money/week-check',
                    },
                ];
            }

            return [];
        })();

        return practiceNudge ? [practiceNudge, ...moneyCoach] : moneyCoach;
    })();

    const monthScoreNeedsAttention =
        !monthScore.isClosed &&
        (Boolean(monthScore.priorOpenPeriod) ||
            (monthScore.closeBlockers?.inboxCount ?? 0) > 0 ||
            (monthScore.closeBlockers?.dueBillCount ?? 0) > 0);

    const coachHasAttention =
        coach.some(
            message =>
                message.kind === CoachKind.WARNING ||
                message.kind === CoachKind.NUDGE ||
                message.kind === CoachKind.WEEK_CHECK
        ) || monthScoreNeedsAttention;

    const horizon = travelMeta.monthsHorizon;
    const baselineTotal = dashboard.baselineAllocatedTotal;
    const selectedTotal = dashboard.allocatedTotal ?? 0;
    const totalDelta = (() => {
        if (baselineTotal === null || baselineTotal === undefined) return null;
        if (baselineTotal === selectedTotal) return null;
        const signed = `${selectedTotal - baselineTotal >= 0 ? '+' : ''}${formatMoney(selectedTotal - baselineTotal)}`;
        // Looking Ahead: current monthly → stacked horizon (grow).
        if (stacked) {
            return {
                fromLabel: formatMoney(baselineTotal),
                toLabel: formatMoney(selectedTotal),
                deltaLabel: t('pages.dashboard.travel.delta_months', {
                    delta: signed,
                    months: horizon,
                }),
                tone: 'grow' as const,
            };
        }
        // Looking Back: current monthly → that month (income raise/cut), only when it differs.
        if (travel.direction === 'past') {
            return {
                fromLabel: formatMoney(baselineTotal),
                toLabel: formatMoney(selectedTotal),
                deltaLabel: t('pages.dashboard.travel.delta_vs_now', { delta: signed }),
                tone: 'neutral' as const,
            };
        }
        return null;
    })();

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

            {/* Coach + month-score advice share one slider when helpers are on. */}
            <div data-tour="home-coach">
                <CoachVerdict
                    messages={coach}
                    hasAttention={coachHasAttention}
                    scoreSlide={
                        <MonthScoreLog
                            embedded
                            score={monthScore.score}
                            daysLeft={monthScore.daysLeft}
                            level={monthScore.level}
                            events={monthScore.events}
                            isClosed={liveData?.monthScore?.isClosed}
                            closeBlockers={monthScore.closeBlockers}
                            priorOpenPeriod={monthScore.priorOpenPeriod}
                            periodNote={periodScoreNote}
                            canCloseMonth={
                                live &&
                                canMutate &&
                                liveData?.monthScore !== undefined &&
                                !liveData.monthScore.isClosed
                            }
                            closeMonthPending={closeMonthScoreMutation.isPending}
                            formatMoney={formatMoney}
                            onCloseMonth={dispositions =>
                                closeMonthScoreMutation.mutate(dispositions)
                            }
                        />
                    }
                />

                {/* Helpers off: CoachVerdict is null — keep month-score advice visible. */}
                {!helpersEnabled ? (
                    <MonthScoreLog
                        score={monthScore.score}
                        daysLeft={monthScore.daysLeft}
                        level={monthScore.level}
                        events={monthScore.events}
                        isClosed={liveData?.monthScore?.isClosed}
                        closeBlockers={monthScore.closeBlockers}
                        priorOpenPeriod={monthScore.priorOpenPeriod}
                        periodNote={periodScoreNote}
                        canCloseMonth={
                            live &&
                            canMutate &&
                            liveData?.monthScore !== undefined &&
                            !liveData.monthScore.isClosed
                        }
                        closeMonthPending={closeMonthScoreMutation.isPending}
                        formatMoney={formatMoney}
                        onCloseMonth={dispositions => closeMonthScoreMutation.mutate(dispositions)}
                    />
                ) : null}
            </div>

            <div data-tour="home-hero">
                <HeroKluis
                    eyebrow={heroEyebrow}
                    total={formatMoney(dashboard.allocatedTotal ?? 0)}
                    potTotal={formatMoney(jars.reduce((sum, jar) => sum + jar.potBalance, 0))}
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
                                      fixedCosts: (byJarQuery.data ?? []).flatMap(
                                          group => group.items
                                      ),
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
            </div>

            {canSeeHome ? <TodayCard /> : null}

            <div
                data-tour="home-portals"
                className={cn(
                    'grid grid-cols-1 gap-4',
                    canSeeGrowth || canSeeEnergy || canSeeSoul
                        ? (canSeeEnergy && isProductEnabled('energy')) ||
                          (canSeeSoul && isProductEnabled('soul'))
                            ? 'lg:grid-cols-3'
                            : 'lg:grid-cols-1'
                        : undefined
                )}>
                {canSeeGrowth ? (
                    <PortalWidget
                        tint="var(--color-jar-lts)"
                        icon="trending-up"
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
                ) : null}
                {canSeeEnergy && isProductEnabled('energy') ? (
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
                ) : null}
                {canSeeSoul && isProductEnabled('soul') ? (
                    <PortalWidget
                        tint="var(--color-portal-soul)"
                        icon="sparkles"
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
                ) : null}
                {!canSeeGrowth &&
                !(canSeeEnergy && isProductEnabled('energy')) &&
                !(canSeeSoul && isProductEnabled('soul')) ? (
                    <Typography as="p" size="sm" color="muted" className="sr-only">
                        {t('features.tour.pages.home.steps.portals.content')}
                    </Typography>
                ) : null}
            </div>
        </div>
    );
}
