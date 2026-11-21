'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { useState } from 'react';
import {
    CAPABILITIES,
    CoachKind,
    HouseholdRole,
    MONEY_COACH_KEY_PREFIX,
    PracticeClientLinkStatus,
    type MonthScore,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Eyebrow, Typography } from '@rumtelo/ui';
import { formatPeriod, toPeriodKey, describePeriodTravel } from '@rumtelo/utils';

import type { CoachLineCandidate } from '@/app/_lib/coach-line';
import { feedLineCandidate } from '@/app/_lib/coach-line-feed';
import { useCoachCopyContext } from '@/app/_lib/use-coach-copy-context';

import { buildPeriodTravelScoreNote } from '@/app/_lib/period-travel-score-note';
import { formatPeriodTravelLabels } from '@/app/_lib/period-travel-i18n';
import { isProductEnabled } from '@/app/_lib/launch-products';
import { BoardStage, stageAtLeast } from '@/app/_lib/board-stage';
import { useShellNav } from '@/app/_lib/use-shell-nav';
import { buildHomeTodo } from '@/app/_lib/home-todo';
import type { Weekday } from '@/app/_lib/next-move';
import { moneyPath } from '@/app/_lib/routes';
import { settingsHref } from '@/app/_lib/settings-tabs';
import { useWeekCheckStatus } from '@/app/_lib/use-week-check-status';
import { todayIso } from '@/app/_lib/week-key';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { HeroKluis } from '@/components/features/home/hero-kluis';
import { PortalWidget } from '@/components/features/home/portal-widget';
import { TodayCard } from '@/components/features/home/today-card';
import { CloseMonthFlow } from '@/components/features/home/close-month-flow';
import { MonthScoreLog } from '@/components/features/home/month-score-log';
import { NextMoveCardError, NextMoveCardSkeleton } from '@/components/features/home/next-move-card';
import { TodoCard } from '@/components/features/home/todo-card';
import { Week1Checklist } from '@/components/features/home/week1-checklist';
import { JarTileGrid } from '@/components/features/money/jar-tile-grid';
import { useCoachLine } from '@/components/features/helpers';
import { HouseholdPermissionSection, roleCanSee } from '@/app/_lib/role-permissions';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';

export function HomeDashboardClient() {
    const t = useTranslations();
    const tDashboard = useTranslations('pages.dashboard');
    const tShell = useTranslations('pages.shell');
    const tCoach = useTranslations('features.coach');
    const copyContext = useCoachCopyContext();
    const locale = useLocale();
    const { householdId, session } = useAuth();
    const { period } = useHouseholdShell();
    const { role, practicePreview } = useBoardWriteAccess();
    const { hasCapability } = usePlanCapabilities();
    const canSeeHome = roleCanSee(role, HouseholdPermissionSection.HOME);
    const canSeeGrowth = roleCanSee(role, HouseholdPermissionSection.GROWTH);
    const canSeeEnergy = roleCanSee(role, HouseholdPermissionSection.ENERGY);
    const canSeeSoul = roleCanSee(role, HouseholdPermissionSection.SOUL);
    const { currency, formatMoney } = useHouseholdCurrency();

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

    const dashboardQuery = useLiveQuery(
        apiQuery.money.dashboard.get.queryOptions({
            input: { householdId: householdId!, period: periodKey },
        }),
        emptyDashboard as never,
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

    const weekCheck = useWeekCheckStatus();

    // One close flow, one door: the To do card's next move (the month score only reports).
    const [closeFlow, setCloseFlow] = useState<{ open: boolean; target: string | null }>({
        open: false,
        target: null,
    });
    const startClose = (target: string) => setCloseFlow({ open: true, target });

    const liveData = dashboardQuery.data;
    const dashboard = liveData ?? emptyDashboard;
    const baselineById = new Map(
        (liveData?.baselineJars ?? []).map(jar => [jar.id, jar.allocated] as const)
    );
    const jars = liveData?.jars ?? [];
    // The dream from onboarding; shown on every launch surface (Soul is hidden in production).
    const dreamLine = dashboard.why?.trim() || null;
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
              jarHighlights: jars.slice(0, 2).map(jar => ({
                  name: jar.name,
                  from: baselineById.get(jar.id) ?? jar.allocated,
                  to: jar.allocated,
              })),
              tDashboard,
          })
        : null;
    // The Coach's top tip is a row of the To do card. It never repeats what the card already
    // says (inbox, bills, week check); Practice invites stay, because the card does not cover
    // them. `useCoachLine` drops everything when tips are off.
    const coachCandidates: CoachLineCandidate[] = (() => {
        const practiceNudge: CoachLineCandidate | null =
            live && canManagePractice && pendingPracticeCount > 0
                ? {
                      id: 'practice-pending',
                      text:
                          pendingPracticeCount === 1
                              ? tDashboard('coach.practice_pending_one')
                              : tDashboard('coach.practice_pending_many', {
                                    count: pendingPracticeCount,
                                }),
                      cta: {
                          label: tDashboard('coach.practice_pending_cta'),
                          href: settingsHref('practice'),
                      },
                      dismiss: { kind: 'local', fingerprint: String(pendingPracticeCount) },
                  }
                : null;
        const repeatsCard = (message: { key: string | null; kind: CoachKind }) =>
            message.kind === CoachKind.WEEK_CHECK ||
            (message.key !== null &&
                (message.key.startsWith(`${MONEY_COACH_KEY_PREFIX}inbox_unsorted`) ||
                    message.key.startsWith(`${MONEY_COACH_KEY_PREFIX}due_bills`)));
        const feedCandidates = (live ? (liveData?.coach ?? []) : [])
            .filter(message => !repeatsCard(message))
            .flatMap(message => {
                const candidate = feedLineCandidate(message, tCoach, t, copyContext);
                return candidate ? [candidate] : [];
            });
        return practiceNudge ? [practiceNudge, ...feedCandidates] : feedCandidates;
    })();
    const coachLine = useCoachLine(coachCandidates);

    // The month score waits until there is something to score (S-5.3 #1); levels wait for a close.
    const progress = liveData?.progress;
    const showMonthScore = Boolean(
        progress &&
        (progress.hasCompletedWeekCheck ||
            monthScore.daysLeft <= 6 ||
            monthScore.priorOpenPeriod ||
            progress.hasClosedMonth)
    );
    // The board ladder: Growth, Today and the full tips list wait for the first week check.
    // While the stage loads nothing appears, so a new board never sees a card come and go.
    const { stage, stageReady } = useShellNav();
    const fromRoutine = stageReady && stageAtLeast(stage, BoardStage.ROUTINE);

    // The To do card is about now, whatever period Home is showing.
    const nowDashboard = weekCheck.dashboard;
    const canAct = !practicePreview && role !== HouseholdRole.VIEWER;
    const todo = nowDashboard
        ? buildHomeTodo({
              today: todayIso(),
              reminderDay: weekCheck.reminderDay,
              weekCheckGraceOpen: weekCheck.graceOpen,
              inboxCount: nowDashboard.inboxCount ?? 0,
              incomeTotal: nowDashboard.incomeTotal ?? 0,
              monthScore: {
                  period: nowDashboard.monthScore.period,
                  isClosed: nowDashboard.monthScore.isClosed,
                  daysLeft: nowDashboard.monthScore.daysLeft,
                  priorOpenPeriod: nowDashboard.monthScore.priorOpenPeriod,
              },
              progress: nowDashboard.progress,
              canAct,
              closeBlockers: nowDashboard.monthScore.closeBlockers ?? null,
              hasCoachTip: coachLine.candidate !== null || coachLine.undoing,
          })
        : null;
    const formatMonth = (key: string) => formatPeriod(key, locale);
    const formatWeekday = (weekday: Weekday) =>
        // 2024-01-01 is a Monday: ISO weekday n lands on January n.
        new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(
            new Date(Date.UTC(2024, 0, weekday))
        );
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

    const showGrowthWidget = canSeeGrowth && fromRoutine;
    const showEnergyWidget = canSeeEnergy && isProductEnabled('energy');
    const showSoulWidget = canSeeSoul && isProductEnabled('soul');
    const showPortals = showGrowthWidget || showEnergyWidget || showSoulWidget;

    return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="order-1 min-w-0 lg:col-start-1">
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
                {dreamLine ? (
                    <p className="mt-3 flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-sm text-fg-secondary">
                        <span className="font-mono text-[10px] font-medium tracking-[0.14em] text-accent uppercase">
                            {tDashboard('why.label')}
                        </span>
                        <span className="min-w-0 text-pretty wrap-anywhere italic">
                            {dreamLine}
                        </span>
                    </p>
                ) : null}
            </div>

            <div className="order-2 min-w-0 lg:col-start-1" data-tour="home-todo">
                {!live ? null : todo ? (
                    <TodoCard
                        todo={todo}
                        canAct={canAct}
                        canImport={hasCapability(CAPABILITIES.moneyImport)}
                        isEuro={currency === 'EUR'}
                        formatMonth={formatMonth}
                        formatWeekday={formatWeekday}
                        onCloseMonth={startClose}
                        coach={coachLine}
                        allTipsCount={
                            coachCandidates.length > 1 && fromRoutine
                                ? coachCandidates.length
                                : null
                        }
                        travelNote={
                            travel.direction !== 'current'
                                ? tDashboard('next_move.travel_note', {
                                      period: formatPeriod(periodKey, locale),
                                  })
                                : null
                        }
                    />
                ) : weekCheck.isError ? (
                    <NextMoveCardError onRetry={weekCheck.refetch} />
                ) : (
                    <NextMoveCardSkeleton />
                )}
            </div>

            {/* The right column on lg. On phones `contents` hands each child back to the single
                column, where its own `order` keeps the card first and the checklist right after. */}
            <div className="contents lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:grid lg:content-start lg:gap-6">
                <div className="order-3 empty:hidden lg:order-none">
                    <Week1Checklist />
                </div>

                {canSeeHome && fromRoutine ? (
                    <div className="order-7 lg:order-none">
                        <TodayCard />
                    </div>
                ) : null}

                {showPortals ? (
                    <div
                        data-tour="home-portals"
                        className="order-8 grid grid-cols-1 gap-4 lg:order-none">
                        {showGrowthWidget ? (
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
                        {showEnergyWidget ? (
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
                                    {
                                        label: t('pages.dashboard.widgets.energy.sleep'),
                                        value: '—',
                                    },
                                ]}
                                tagline={t('pages.dashboard.widgets.energy.tagline')}
                            />
                        ) : null}
                        {showSoulWidget ? (
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
                    </div>
                ) : (
                    <Typography as="p" size="sm" color="muted" className="sr-only">
                        {t(
                            isProductEnabled('energy') || isProductEnabled('soul')
                                ? 'features.tour.pages.home.steps.portals.content'
                                : 'features.tour.pages.home.steps.portals_core.content'
                        )}
                    </Typography>
                )}
            </div>

            <div
                id="jars"
                data-tour="home-hero"
                className="order-4 min-w-0 scroll-mt-20 lg:col-start-1">
                <HeroKluis
                    eyebrow={heroEyebrow}
                    total={formatMoney(dashboard.allocatedTotal ?? 0)}
                    potTotal={formatMoney(jars.reduce((sum, jar) => sum + jar.potBalance, 0))}
                    totalDelta={totalDelta}
                    incomeBreakdown={incomeBreakdown}
                    incomeHref={moneyPath('income')}
                    // The stat row waits for the first spending (S-5.3 #4). "Left over" and "In
                    // Play" are not repeated here: the jar grid below already shows both.
                    stats={
                        progress?.hasTransactions
                            ? [
                                  {
                                      label: t('pages.dashboard.stats.safe_per_day'),
                                      value: formatMoney(dashboard.safePerDay ?? 0),
                                      tone: 'accent',
                                  },
                              ]
                            : []
                    }>
                    <JarTileGrid
                        jars={jars}
                        period={period}
                        stacked={stacked}
                        loading={live && dashboardQuery.isPending}
                    />
                </HeroKluis>
            </div>

            {showMonthScore ? (
                <div id="month-score" className="order-5 min-w-0 scroll-mt-20 lg:col-start-1">
                    <MonthScoreLog
                        compact
                        score={monthScore.score}
                        daysLeft={monthScore.daysLeft}
                        level={monthScore.level}
                        showLevel={Boolean(progress?.hasClosedMonth)}
                        isClosed={liveData?.monthScore?.isClosed}
                        periodNote={periodScoreNote}
                    />
                </div>
            ) : null}

            <CloseMonthFlow
                open={closeFlow.open}
                onOpenChange={open => setCloseFlow(previous => ({ ...previous, open }))}
                target={closeFlow.target}
            />
        </div>
    );
}
