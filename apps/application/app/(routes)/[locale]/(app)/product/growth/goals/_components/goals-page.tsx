'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useLocale } from 'next-intl';

import type { Goal } from '@rumtelo/contracts';
import { GoalKind, GoalStatus } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations, type TranslateFn } from '@rumtelo/i18n';
import { AccentCard, Card, EmptyState, Meter, Typography } from '@rumtelo/ui';
import {
    cn,
    describePeriodTravel,
    earnGoalProgress,
    endOfPeriodIso,
    monthlyNetAsOf,
    projectGoalsAtHorizon,
    toPeriodKey,
    type GoalAtPeriod,
} from '@rumtelo/utils';

import { CREATE_HREF, goalDetailHref } from '@/app/_lib/create-routes';
import { formatPeriodTravelLabels } from '@/app/_lib/period-travel-i18n';
import { isFocusSaveGoal, saveGoalRank } from '@/app/_lib/goal-focus';
import { bgClassToCssVar } from '@/app/_lib/jar-chrome';
import { jarChrome } from '@/app/_lib/jar-meta';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { JarBadge } from '@/components/features/money/jar-badge';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { ListToolbar } from '@/components/layout/list-toolbar';

type Tab = 'ON_TRACK' | 'REACHED';
type KindFilter = 'ALL' | GoalKind;

/** Few goals → featured cards; more → grouped compact list. */
const FEATURED_MAX = 2;

const KIND_ORDER: GoalKind[] = [GoalKind.SAVE, GoalKind.EARN, GoalKind.GIVE];

function formatMonthYear(iso: string | null | undefined, locale: string): string | null {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        const [year, month] = iso.split('-').map(Number);
        if (!year || !month) return null;
        return new Intl.DateTimeFormat(locale, {
            month: 'short',
            year: 'numeric',
        }).format(new Date(year, month - 1, 1));
    }
    return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(date);
}

function eta(
    saved: number,
    target: number,
    monthlyContribution: number,
    locale: string,
    t: TranslateFn
): string {
    if (monthlyContribution <= 0) return t('progress_unknown');
    const months = Math.ceil((target - saved) / monthlyContribution);
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(date);
}

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

function kindLabel(kind: GoalKind, t: TranslateFn): string {
    if (kind === GoalKind.EARN) return t('kind_earn');
    if (kind === GoalKind.GIVE) return t('kind_give');
    return t('kind_save');
}

function kindEyebrow(kind: GoalKind, tDetail: TranslateFn): string {
    if (kind === GoalKind.EARN) return tDetail('kind_earn');
    if (kind === GoalKind.GIVE) return tDetail('kind_give');
    return tDetail('kind_save');
}

function kindTint(kind: GoalKind): string {
    if (kind === GoalKind.EARN) return 'var(--color-accent)';
    if (kind === GoalKind.GIVE) return 'var(--color-jar-give)';
    return 'var(--color-jar-lts)';
}

function kindIcon(goal: Goal): string {
    if (goal.icon?.trim()) return goal.icon.trim();
    if (goal.kind === GoalKind.EARN) return '📈';
    if (goal.kind === GoalKind.GIVE) return '💛';
    return '🎯';
}

type GoalProgress = {
    current: number;
    progress: number;
    subline: string;
};

function formatReachedMonth(iso: string | null, locale: string): string | null {
    return formatMonthYear(iso, locale);
}

function goalProgress(
    goal: Goal,
    currentNet: number,
    tab: Tab,
    formatMoney: (amount: number) => string,
    locale: string,
    t: TranslateFn,
    projection?: GoalAtPeriod | null
): GoalProgress {
    const isEarn = goal.kind === GoalKind.EARN;
    const isGive = goal.kind === GoalKind.GIVE;
    const reachedLabel = formatReachedMonth(projection?.reachedOn ?? null, locale);
    const traveling =
        projection !== null &&
        projection !== undefined &&
        (projection.projectedSaved !== goal.saved || projection.fulfilledByPeriod);

    if (isEarn) {
        const earn = earnGoalProgress({ target: goal.target, currentNet });
        return {
            current: earn.current,
            progress: goal.target > 0 ? Math.min(1, earn.current / goal.target) : 0,
            subline:
                tab === 'REACHED' && goal.fulfilledOn
                    ? t('progress_reached', {
                          when: formatReachedMonth(goal.fulfilledOn, locale) ?? goal.fulfilledOn,
                      })
                    : earn.reached
                      ? t('progress_target_met')
                      : t('progress_earn_remaining', { amount: formatMoney(earn.remaining) }),
        };
    }

    if (projection?.fulfilledByPeriod && reachedLabel) {
        return {
            current: projection.projectedSaved,
            progress: 1,
            subline: t('progress_reached_plan', { when: reachedLabel }),
        };
    }

    if (isGive) {
        const current = traveling ? (projection?.projectedSaved ?? goal.saved) : goal.saved;
        return {
            current,
            progress: goal.target > 0 ? Math.min(1, current / goal.target) : 0,
            subline:
                tab === 'REACHED'
                    ? t('progress_pledge_met', {
                          when: goal.fulfilledOn
                              ? ` · ${formatReachedMonth(goal.fulfilledOn, locale) ?? goal.fulfilledOn}`
                              : '',
                      })
                    : t('progress_pledge_left', {
                          amount: formatMoney(Math.max(0, goal.target - current)),
                          by: goal.targetOn
                              ? t('progress_by_year', { year: goal.targetOn.slice(0, 4) })
                              : '',
                      }),
        };
    }

    const current = traveling ? (projection?.projectedSaved ?? goal.saved) : goal.saved;
    const etaLabel = eta(goal.saved, goal.target, goal.monthlyContribution, locale, t);

    return {
        current,
        progress: goal.target > 0 ? Math.min(1, current / goal.target) : 0,
        subline: traveling
            ? t('progress_pace_reaches', {
                  monthly: formatMoney(goal.monthlyContribution),
                  date: etaLabel,
              })
            : t('progress_pace_by', {
                  monthly: formatMoney(goal.monthlyContribution),
                  date: etaLabel,
              }),
    };
}

export function GoalsPageClient() {
    const t = useTranslations('features.growth.goals');
    const tDetail = useTranslations('features.growth.goals.detail');
    const tShell = useTranslations('pages.shell');
    const locale = useLocale();
    const { householdId } = useAuth();
    const { period } = useAppShell();
    const [tab, setTab] = useState<Tab>('ON_TRACK');
    const [kindFilter, setKindFilter] = useState<KindFilter>('ALL');
    const [jarFilter, setJarFilter] = useState<string | null>(null);
    const [openKindKeys, setOpenKindKeys] = useState<Set<string>>(() => new Set());
    const { formatMoney } = useHouseholdCurrency();
    const live = isLiveData(householdId);
    const { byKey: jarByKey } = useJarCatalog();

    const goalsQuery = useLiveQuery(
        apiQuery.money.goals.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );

    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );

    const incomeQuery = useLiveQuery(
        apiQuery.money.income.list.queryOptions({ input: { householdId: householdId! } }),
        [],
        live
    );

    const currentNet = useMemo(
        () => monthlyNetAsOf(incomeQuery.data ?? [], todayIso()),
        [incomeQuery.data]
    );

    const jarById = useMemo(() => {
        const map = new Map<string, { id: string; key: string; name: string }>();
        for (const jar of jarsQuery.data ?? []) {
            map.set(jar.id, { id: jar.id, key: jar.key, name: jar.name });
        }
        return map;
    }, [jarsQuery.data]);

    const goals = useMemo((): ReadonlyArray<Goal> => goalsQuery.data ?? [], [goalsQuery.data]);

    const travel = describePeriodTravel(period);
    const travelLabels = formatPeriodTravelLabels(travel, tShell);
    const traveling = travel.direction !== 'current';
    const periodKey = toPeriodKey(period.year, period.month);

    const projectionById = (() => {
        if (!traveling) return new Map<string, GoalAtPeriod>();
        const rows = projectGoalsAtHorizon({
            monthsDelta: travel.monthsDelta,
            direction: travel.direction,
            selectedPeriodEndIso: endOfPeriodIso(periodKey),
            goals: goals.map(goal => ({
                id: goal.id,
                name: goal.name,
                jarKey: goal.jarId ? (jarById.get(goal.jarId)?.key ?? null) : null,
                jarId: goal.jarId,
                kind: goal.kind,
                status: goal.status,
                saved: goal.saved,
                target: goal.target,
                monthlyContribution: goal.monthlyContribution,
                targetOn: goal.targetOn,
                fulfilledOn: goal.fulfilledOn,
            })),
        });
        return new Map(rows.map(row => [row.goalId, row]));
    })();

    const active = goals.filter(goal => {
        const projected = projectionById.get(goal.id);
        if (traveling && projected?.fulfilledByPeriod) return false;
        if (goal.status === GoalStatus.ARCHIVED || goal.status === GoalStatus.REACHED) return false;
        if (goal.kind === GoalKind.EARN) {
            return !earnGoalProgress({ target: goal.target, currentNet }).reached;
        }
        return goal.saved < goal.target;
    });
    const reached = goals.filter(goal => {
        const projected = projectionById.get(goal.id);
        if (traveling && projected?.fulfilledByPeriod) return true;
        if (travel.direction === 'past') {
            return Boolean(projected?.fulfilledByPeriod);
        }
        if (goal.status === GoalStatus.REACHED) return true;
        if (goal.kind === GoalKind.EARN) {
            return earnGoalProgress({ target: goal.target, currentNet }).reached;
        }
        return goal.saved >= goal.target;
    });
    const tabGoals = tab === 'ON_TRACK' ? active : reached;

    const kindsPresent = KIND_ORDER.filter(kind => tabGoals.some(goal => goal.kind === kind));

    const saveJarKeys = (() => {
        const keys = new Set<string>();
        for (const goal of tabGoals) {
            if (goal.kind !== GoalKind.SAVE || !goal.jarId) continue;
            const jar = jarById.get(goal.jarId);
            if (jar) keys.add(jar.key);
        }
        return [...keys];
    })();

    const shown = tabGoals.filter(goal => {
        if (kindFilter !== 'ALL' && goal.kind !== kindFilter) return false;
        if (jarFilter && goal.kind === GoalKind.SAVE) {
            const jar = goal.jarId ? jarById.get(goal.jarId) : null;
            if (!jar || jar.key !== jarFilter) return false;
        }
        return true;
    });

    const featured = shown.length > 0 && shown.length <= FEATURED_MAX;
    const grouped = KIND_ORDER.map(kind => ({
        kind,
        items: shown
            .filter(goal => goal.kind === kind)
            .sort((left, right) => {
                if (kind !== GoalKind.SAVE) return 0;
                if (left.jarId !== right.jarId)
                    return (left.jarId ?? '').localeCompare(right.jarId ?? '');
                return left.sortOrder - right.sortOrder;
            }),
    })).filter(group => group.items.length > 0);

    function toggleKind(kind: GoalKind) {
        setOpenKindKeys(previous => {
            const baseline =
                previous.size === 0 ? new Set(grouped.map(group => group.kind)) : new Set(previous);
            if (baseline.has(kind)) baseline.delete(kind);
            else baseline.add(kind);
            return baseline;
        });
    }

    return (
        <div className="grid animate-rise gap-8">
            <div>
                <Typography as="span" variant="eyebrow" color="primary">
                    {t('page_eyebrow')}
                </Typography>
                <Typography as="h1" className="mt-2">
                    {t('page_title')}
                </Typography>
                <Typography as="p" variant="lead" size="default" className="mt-2">
                    {traveling
                        ? travel.direction === 'future'
                            ? t('page_lead_future', { label: travelLabels.relativeLabel })
                            : t('page_lead_past', { label: travelLabels.relativeLabel })
                        : t('page_lead')}
                </Typography>
            </div>

            <ListToolbar createLabel={t('add_goal')} createHref={CREATE_HREF.goal}>
                {(['ON_TRACK', 'REACHED'] as const).map(tabKey => {
                    const count = tabKey === 'ON_TRACK' ? active.length : reached.length;
                    return (
                        <button
                            key={tabKey}
                            type="button"
                            onClick={() => {
                                setTab(tabKey);
                                setKindFilter('ALL');
                                setJarFilter(null);
                            }}
                            className={cn(
                                'flex items-baseline gap-2 rounded-full border px-4 py-2.5 font-mono text-xs font-medium tracking-wide uppercase transition-all duration-200',
                                tab === tabKey
                                    ? 'border-accent/40 bg-accent-soft text-accent'
                                    : 'border-line text-fg-muted hover:border-line-strong hover:text-fg'
                            )}>
                            {tabKey === 'ON_TRACK' ? t('tab_on_track') : t('tab_reached')}
                            <span className="opacity-70">{count}</span>
                        </button>
                    );
                })}
            </ListToolbar>

            {kindsPresent.length > 1 || saveJarKeys.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                    {kindsPresent.length > 1
                        ? (['ALL', ...kindsPresent] as const).map(key => {
                              const on = kindFilter === key;
                              const label = key === 'ALL' ? t('filter_all') : kindLabel(key, t);
                              const count =
                                  key === 'ALL'
                                      ? tabGoals.length
                                      : tabGoals.filter(goal => goal.kind === key).length;
                              return (
                                  <button
                                      key={key}
                                      type="button"
                                      aria-pressed={on}
                                      onClick={() => {
                                          setKindFilter(key);
                                          if (key !== GoalKind.SAVE && key !== 'ALL') {
                                              setJarFilter(null);
                                          }
                                      }}
                                      className={cn(
                                          'rounded-full border px-3 py-1.5 font-mono text-xs transition-colors',
                                          on
                                              ? 'border-accent/40 bg-accent-soft text-accent'
                                              : 'border-line bg-raised text-fg-secondary hover:border-accent-hover hover:text-accent'
                                      )}>
                                      {label}
                                      <span className="ml-1.5 opacity-60">{count}</span>
                                  </button>
                              );
                          })
                        : null}
                    {(kindFilter === 'ALL' || kindFilter === GoalKind.SAVE) &&
                    saveJarKeys.length > 1
                        ? saveJarKeys.map(key => {
                              const on = jarFilter === key;
                              const catalog = jarByKey.get(key);
                              const name =
                                  catalog?.name ??
                                  [...jarById.values()].find(jar => jar.key === key)?.name ??
                                  key;
                              return (
                                  <button
                                      key={key}
                                      type="button"
                                      aria-pressed={on}
                                      onClick={() =>
                                          setJarFilter(previous => (previous === key ? null : key))
                                      }
                                      className={cn(
                                          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs transition-colors',
                                          on
                                              ? 'border-accent/40 bg-accent-soft text-accent'
                                              : 'border-line bg-raised text-fg-secondary hover:border-accent-hover hover:text-accent'
                                      )}>
                                      <span
                                          className="size-1.75 rounded-sm"
                                          style={{
                                              background: bgClassToCssVar(jarChrome(key).color),
                                          }}
                                      />
                                      {name}
                                  </button>
                              );
                          })
                        : null}
                </div>
            ) : null}

            {shown.length === 0 ? (
                <EmptyState
                    icon="🎯"
                    title={tab === 'REACHED' ? t('reached_empty_title') : t('empty_title')}
                    body={
                        tab === 'REACHED'
                            ? t('reached_empty_body')
                            : kindFilter !== 'ALL' || jarFilter
                              ? t('empty_filter_body')
                              : t('empty_body')
                    }
                />
            ) : featured ? (
                <div className="grid gap-4 sm:grid-cols-2">
                    {shown.map(goal => {
                        const projection = traveling ? (projectionById.get(goal.id) ?? null) : null;
                        const stats = goalProgress(
                            goal,
                            currentNet,
                            tab,
                            formatMoney,
                            locale,
                            t,
                            projection
                        );
                        const reachedLabel = formatReachedMonth(
                            projection?.reachedOn ?? null,
                            locale
                        );
                        const jar = goal.jarId ? jarById.get(goal.jarId) : null;
                        const focus = isFocusSaveGoal(goal, goals);
                        const rank = saveGoalRank(goal, goals);
                        return (
                            <Link
                                key={goal.id}
                                href={goalDetailHref(goal.id)}
                                className="rounded-[inherit] text-left outline-none focus-visible:ring-2 focus-visible:ring-accent/30">
                                <AccentCard
                                    tint={kindTint(goal.kind)}
                                    className="h-full transition-colors hover:border-accent-hover">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 py-1 font-mono text-[10px] tracking-widest text-fg-secondary uppercase">
                                            {kindIcon(goal)} {kindEyebrow(goal.kind, tDetail)}
                                        </span>
                                        {focus ? (
                                            <span className="inline-flex items-center rounded-full border border-accent/40 bg-accent-soft px-2.5 py-1 font-mono text-[10px] tracking-widest text-accent uppercase">
                                                {t('focus')}
                                            </span>
                                        ) : rank !== null && rank > 1 ? (
                                            <span className="inline-flex items-center rounded-full border border-line bg-raised px-2.5 py-1 font-mono text-[10px] tracking-widest text-fg-faint uppercase">
                                                #{rank}
                                            </span>
                                        ) : null}
                                        {projection?.fulfilledByPeriod && reachedLabel ? (
                                            <span className="inline-flex items-center rounded-full border border-success/40 bg-success/10 px-2.5 py-1 font-mono text-[10px] tracking-widest text-success uppercase">
                                                {t('reached_badge', { when: reachedLabel })}
                                            </span>
                                        ) : null}
                                        {jar && goal.kind === GoalKind.SAVE ? (
                                            <JarBadge jarKey={jar.key} name={jar.name} />
                                        ) : null}
                                    </div>

                                    <Typography as="h3" className="mt-3 text-2xl leading-tight">
                                        {goal.name}
                                    </Typography>

                                    {goal.why?.trim() ? (
                                        <p className="mt-2 text-sm leading-snug text-fg-secondary italic">
                                            “{goal.why.trim()}”
                                        </p>
                                    ) : null}

                                    <div className="mt-4 flex items-baseline gap-2">
                                        <span className="font-mono text-2xl text-accent">
                                            {formatMoney(stats.current)}
                                        </span>
                                        <span className="font-mono text-xs text-fg-muted">
                                            {t('of')} {formatMoney(goal.target)}
                                            {goal.kind === GoalKind.EARN ? t('per_month') : ''}
                                        </span>
                                        <span className="ml-auto font-mono text-xs text-fg-faint">
                                            {Math.round(stats.progress * 100)}%
                                        </span>
                                    </div>

                                    <Meter value={stats.progress} className="mt-3" />

                                    <p className="mt-3 font-mono text-xs text-fg-muted">
                                        ◇ {stats.subline}
                                    </p>
                                </AccentCard>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="grid gap-4">
                    {grouped.map(group => {
                        const open = openKindKeys.size === 0 ? true : openKindKeys.has(group.kind);
                        return (
                            <Card key={group.kind} className="p-0">
                                <button
                                    type="button"
                                    aria-label={t('group_aria', {
                                        kind: kindLabel(group.kind, t),
                                        count: group.items.length,
                                    })}
                                    aria-expanded={open}
                                    onClick={() => toggleKind(group.kind)}
                                    className="flex w-full items-center justify-between gap-3 border-b border-line px-5 py-3.5 text-left hover:bg-raised/60">
                                    <div>
                                        <Typography as="span" variant="eyebrow" color="primary">
                                            ✦ {kindLabel(group.kind, t).toUpperCase()}
                                        </Typography>
                                        <p className="mt-0.5 font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                            {kindEyebrow(group.kind, tDetail)}
                                        </p>
                                    </div>
                                    <span className="flex items-center gap-2">
                                        <span className="font-mono text-xs text-fg-muted">
                                            {group.items.length}
                                        </span>
                                        <span
                                            className={cn(
                                                'text-xs text-fg-faint transition-transform duration-200',
                                                open && 'rotate-180'
                                            )}>
                                            ▾
                                        </span>
                                    </span>
                                </button>
                                {open ? (
                                    <ul className="grid">
                                        {group.items.map(goal => {
                                            const projection = traveling
                                                ? (projectionById.get(goal.id) ?? null)
                                                : null;
                                            const stats = goalProgress(
                                                goal,
                                                currentNet,
                                                tab,
                                                formatMoney,
                                                locale,
                                                t,
                                                projection
                                            );
                                            const reachedLabel = formatReachedMonth(
                                                projection?.reachedOn ?? null,
                                                locale
                                            );
                                            const jar = goal.jarId ? jarById.get(goal.jarId) : null;
                                            const pct = Math.round(stats.progress * 100);
                                            const focus = isFocusSaveGoal(goal, goals);
                                            const rank = saveGoalRank(goal, goals);
                                            return (
                                                <li
                                                    key={goal.id}
                                                    className="border-b border-line last:border-b-0">
                                                    <Link
                                                        href={goalDetailHref(goal.id)}
                                                        className="grid w-full gap-2.5 px-5 py-3.5 text-left hover:bg-raised">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-medium text-fg">
                                                                    <span aria-hidden>
                                                                        {kindIcon(goal)}{' '}
                                                                    </span>
                                                                    {goal.name}
                                                                    {focus ? (
                                                                        <span className="ml-2 font-mono text-[10px] tracking-wide text-accent uppercase">
                                                                            {t('focus')}
                                                                        </span>
                                                                    ) : rank !== null &&
                                                                      rank > 1 ? (
                                                                        <span className="ml-2 font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                                                            #{rank}
                                                                        </span>
                                                                    ) : null}
                                                                    {projection?.fulfilledByPeriod &&
                                                                    reachedLabel ? (
                                                                        <span className="ml-2 font-mono text-[10px] tracking-wide text-success uppercase">
                                                                            {t('reached_badge', {
                                                                                when: reachedLabel,
                                                                            })}
                                                                        </span>
                                                                    ) : null}
                                                                </p>
                                                                {goal.why?.trim() ? (
                                                                    <p className="mt-0.5 truncate text-xs text-fg-muted italic">
                                                                        {goal.why.trim()}
                                                                    </p>
                                                                ) : (
                                                                    <p className="mt-0.5 truncate font-mono text-[11px] text-fg-faint">
                                                                        {stats.subline}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="shrink-0 text-right">
                                                                <p className="font-mono text-sm text-accent">
                                                                    {formatMoney(stats.current)}
                                                                </p>
                                                                <p className="font-mono text-[10px] text-fg-faint">
                                                                    {t('of')}{' '}
                                                                    {formatMoney(goal.target)}
                                                                    {goal.kind === GoalKind.EARN
                                                                        ? t('per_month')
                                                                        : ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
                                                                <div
                                                                    className="h-full rounded-full bg-accent transition-[width] duration-300"
                                                                    style={{
                                                                        width: `${pct}%`,
                                                                        background: kindTint(
                                                                            goal.kind
                                                                        ),
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="w-8 shrink-0 text-right font-mono text-[10px] text-fg-faint">
                                                                {pct}%
                                                            </span>
                                                            {jar && goal.kind === GoalKind.SAVE ? (
                                                                <JarBadge
                                                                    jarKey={jar.key}
                                                                    name={jar.name}
                                                                    className="hidden sm:inline-flex"
                                                                />
                                                            ) : null}
                                                        </div>
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : null}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
