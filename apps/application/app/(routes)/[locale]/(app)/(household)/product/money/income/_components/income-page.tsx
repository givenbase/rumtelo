'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useDeferredValue, useMemo, useState } from 'react';

import { FlowDirection, GoalKind, GoalStatus } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { AccentCard, Button, Card, EmptyState, Typography } from '@rumtelo/ui';
import {
    incomeAmountAsOf,
    incomeDelta,
    monthlyAmount,
    monthlyNetAsOf,
    describePeriodTravel,
    endOfPeriodIso,
    horizonMonths,
    toPeriodKey,
    cn,
} from '@rumtelo/utils';

import { useTranslations } from '@rumtelo/i18n';

import { assetIdFromParams } from '@/app/_lib/create-prefill';
import { CREATE_HREF, createFixedHref, updateHref } from '@/app/_lib/create-routes';
import { cadenceLabel } from '@/app/_lib/jar-chrome';
import { listFixedCostsForPeriodView, listIncomeForPeriodView } from '@/app/_lib/period-plan-list';
import { productPath } from '@/app/_lib/routes';
import { isLiveData } from '@/app/_lib/preview';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { IncomeSimulator } from '@/components/features/growth/income-simulator';
import { HoldingChip } from '@/components/features/money/holding-chip';
import { MetricStrip } from '@/components/features/money/metric-strip';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { ListSearchField } from '@/components/layout/list-controls';

/** Demo fallback when no ACTIVE EARN goal is set. */
const FALLBACK_TARGET = 600_000;

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

function dayBefore(iso: string): string {
    const date = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
}

export function IncomePageClient() {
    const t = useTranslations('features.growth.income');
    const tFixed = useTranslations('features.money.fixed');
    const tChips = useTranslations('features.money.chips');
    const tHolding = useTranslations('features.money.holding_link');
    const { householdId } = useAuth();
    const { period } = useHouseholdShell();
    const { showCreateFlows } = useBoardWriteAccess();
    const { formatMoney } = useHouseholdCurrency();
    const periodKey = toPeriodKey(period.year, period.month);
    const travel = describePeriodTravel(period);
    const horizon = horizonMonths(travel);
    const traveling = travel.direction !== 'current';
    const live = isLiveData(householdId);
    // `?assetId=` from a holding's detail page: show only what belongs to it.
    const assetFilter = assetIdFromParams(useSearchParams()) ?? null;
    const [search, setSearch] = useState('');
    const deferredSearch = useDeferredValue(search.trim().toLowerCase());

    const incomeQuery = useLiveQuery(
        apiQuery.money.income.list.queryOptions({ input: { householdId: householdId! } }),
        [],
        live
    );

    // Recurring money in that is not an income source (allowance, contribution…).
    const otherIncomeQuery = useLiveQuery(
        apiQuery.money.fixedCosts.list.queryOptions({
            input: { householdId: householdId!, direction: FlowDirection.IN },
        }),
        [],
        live
    );

    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.balances.queryOptions({
            input: { householdId: householdId!, period: periodKey },
        }),
        [] as never,
        live
    );

    const goalsQuery = useLiveQuery(
        apiQuery.money.goals.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );

    const allSources = incomeQuery.data ?? [];
    const asOf = endOfPeriodIso(periodKey);
    const { applying: applyingSources, list: sources } = listIncomeForPeriodView(
        allSources,
        asOf,
        travel.direction
    );
    const applyingIds = new Set(applyingSources.map(source => source.id));
    const { applying: applyingOther, list: otherIncome } = listFixedCostsForPeriodView(
        otherIncomeQuery.data ?? [],
        asOf,
        travel.direction
    );
    const applyingOtherIds = new Set(applyingOther.map(item => item.id));
    // Per-month, minor units; each group keeps its own total (jars split income sources only).
    const otherMonthly = applyingOther.reduce(
        (total, item) => total + monthlyAmount(Math.abs(item.amount), item.cadence),
        0
    );
    const matchesSearch = (text: string) =>
        !deferredSearch || text.toLowerCase().includes(deferredSearch);
    const visibleSources = sources.filter(
        source =>
            (!assetFilter || source.assetId === assetFilter) &&
            matchesSearch(`${source.counterparty ?? ''} ${source.name}`)
    );
    const visibleOther = otherIncome.filter(
        item =>
            (!assetFilter || item.assetId === assetFilter) &&
            matchesSearch(`${item.counterparty ?? ''} ${item.name}`)
    );
    const monthlyNet = monthlyNetAsOf(allSources, asOf);
    const spanNet = traveling ? monthlyNet * horizon : monthlyNet;
    const jars = jarsQuery.data ?? [];

    const earnBar = useMemo(() => {
        const earn = (goalsQuery.data ?? []).filter(
            goal =>
                goal.kind === GoalKind.EARN &&
                goal.target > 0 &&
                (goal.status === GoalStatus.ACTIVE || goal.status === GoalStatus.REACHED)
        );
        const open = earn.filter(goal => goal.status === GoalStatus.ACTIVE);
        const reached = earn.filter(goal => goal.status === GoalStatus.REACHED);
        // A reached bar still is the target. Dropping it showed the €6,000 demo number.
        const pool = open.length > 0 ? open : reached;
        const amount =
            pool.length > 0 ? Math.max(...pool.map(goal => goal.target)) : FALLBACK_TARGET;
        const cleared = pool.find(
            goal => goal.target === amount && goal.status === GoalStatus.REACHED
        );
        return {
            target: amount,
            clearedName: open.length === 0 && cleared ? cleared.name : null,
        };
    }, [goalsQuery.data]);
    const target = earnBar.target;
    const saveGoals = useMemo(
        () =>
            (goalsQuery.data ?? []).filter(goal => (goal.kind ?? GoalKind.SAVE) === GoalKind.SAVE),
        [goalsQuery.data]
    );

    const gap = target - monthlyNet;

    const newestEffective = allSources
        .flatMap(source => source.periods ?? [])
        .map(amountPeriod => amountPeriod.effectiveOn.slice(0, 10))
        .sort()
        .at(-1);
    const delta =
        newestEffective !== undefined && !traveling
            ? incomeDelta(
                  monthlyNetAsOf(allSources, dayBefore(newestEffective)),
                  monthlyNetAsOf(allSources, todayIso())
              )
            : null;

    const nowLabel =
        travel.direction === 'future'
            ? t('through_then')
            : travel.direction === 'past'
              ? t('then_label')
              : t('now');

    return (
        <div className="grid animate-rise gap-6">
            {/* 1. Short header + the monthly total. */}
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                    <Typography as="span" variant="eyebrow" color="primary">
                        {t('page_eyebrow')}
                    </Typography>
                    <Typography as="h1" className="mt-1 text-2xl sm:text-3xl lg:text-3xl">
                        {t('page_title')}
                    </Typography>
                </div>
                {showCreateFlows ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            as={Link}
                            href={createFixedHref({
                                direction: 'in',
                                assetId: assetFilter ?? undefined,
                            })}
                            size="sm"
                            variant="secondary">
                            {t('add_other_income')}
                        </Button>
                        <Button as={Link} href={CREATE_HREF.income} size="sm">
                            {t('add_income')}
                        </Button>
                    </div>
                ) : null}
            </div>

            <div data-tour="income-summary" className="min-w-0">
                <AccentCard tint="var(--color-accent)" className="h-full overflow-hidden p-0">
                    <MetricStrip
                        size="lg"
                        className="border-t-0"
                        items={[
                            {
                                label: nowLabel,
                                value: traveling ? (
                                    <>
                                        <span className="text-fg-faint">
                                            {formatMoney(monthlyNet)}
                                        </span>
                                        <span className="mx-1 text-fg-faint">→</span>
                                        <span className="text-success">{formatMoney(spanNet)}</span>
                                    </>
                                ) : (
                                    formatMoney(monthlyNet)
                                ),
                                hint: (
                                    <>
                                        {traveling
                                            ? t('subline_travel', {
                                                  amount: formatMoney(monthlyNet),
                                                  months: horizon,
                                              })
                                            : t('subline_annual', {
                                                  amount: formatMoney(monthlyNet * 12),
                                              })}
                                        {delta && delta.absolute !== 0 && !traveling ? (
                                            <span
                                                className={cn(
                                                    'mt-0.5 block',
                                                    delta.absolute > 0
                                                        ? 'text-success'
                                                        : 'text-warning'
                                                )}>
                                                {delta.absolute > 0 ? '+' : ''}
                                                {formatMoney(delta.absolute)}
                                            </span>
                                        ) : null}
                                    </>
                                ),
                            },
                        ]}
                    />
                </AccentCard>
            </div>

            {assetFilter ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/40 bg-accent-soft px-4 py-3">
                    <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                        {tHolding('filter_eyebrow')}
                    </p>
                    <HoldingChip assetId={assetFilter} link />
                    <Link
                        href={productPath('money/income')}
                        className="ml-auto rounded-sm font-mono text-xs tracking-wide text-accent uppercase outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent/35">
                        {tHolding('filter_clear')}
                    </Link>
                </div>
            ) : null}

            {/* 2. What the household entered: income sources, then other regular income. */}
            <div data-tour="income-sources" className="grid gap-4">
                <Card className="p-0">
                    <div className="grid gap-3 border-b border-line px-4 py-2.5 sm:px-5">
                        <div className="flex items-center justify-between gap-3">
                            <Typography as="span" variant="eyebrow" color="primary">
                                {t('sources_heading')}
                            </Typography>
                            <span className="font-mono text-sm text-success">
                                {formatMoney(monthlyNet)}
                            </span>
                        </div>
                        {sources.length > 0 || otherIncome.length > 0 ? (
                            <ListSearchField
                                value={search}
                                onChange={setSearch}
                                placeholder={t('search_placeholder')}
                                ariaLabel={t('search_aria')}
                            />
                        ) : null}
                    </div>
                    {sources.length === 0 ? (
                        <EmptyState
                            variant="compact"
                            className="border-0 bg-transparent"
                            title={live ? t('empty_live_title') : t('empty_guest_title')}
                            body={live ? t('empty_live_body') : t('empty_guest_body')}
                        />
                    ) : (
                        <div className="grid gap-px">
                            {visibleSources.map(source => {
                                const applies = applyingIds.has(source.id);
                                const amountAsOf = applies
                                    ? (incomeAmountAsOf(source, asOf) ?? source.amount)
                                    : source.amount;
                                return (
                                    <Link
                                        key={source.id}
                                        href={updateHref('income', source.id)}
                                        className="flex w-full items-center justify-between gap-3 border-b border-line px-4 py-2.5 text-left last:border-b-0 hover:bg-raised sm:px-5 sm:py-3">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm text-fg">
                                                {source.counterparty?.trim() || source.name}
                                            </div>
                                            <div className="mt-0.5 truncate font-mono text-xs tracking-normal text-fg-faint">
                                                {applies
                                                    ? source.counterparty?.trim()
                                                        ? source.name
                                                        : source.kind
                                                    : tFixed('status_planned')}
                                            </div>
                                        </div>
                                        <span
                                            className={
                                                applies
                                                    ? 'shrink-0 font-mono text-sm text-success'
                                                    : 'shrink-0 font-mono text-sm text-fg-muted'
                                            }>
                                            {formatMoney(amountAsOf)}
                                        </span>
                                    </Link>
                                );
                            })}
                            {deferredSearch && visibleSources.length === 0 ? (
                                <EmptyState
                                    variant="compact"
                                    className="border-0 bg-transparent"
                                    title={t('empty_search_title')}
                                    body={t('empty_search_body')}
                                />
                            ) : null}
                        </div>
                    )}
                </Card>

                {otherIncome.length > 0 ? (
                    <Card className="p-0">
                        <div className="grid gap-1 border-b border-line px-4 py-2.5 sm:px-5">
                            <div className="flex items-center justify-between gap-3">
                                <Typography as="span" variant="eyebrow" color="primary">
                                    {t('other_heading')}
                                </Typography>
                                <span className="font-mono text-sm text-success">
                                    {formatMoney(otherMonthly)}
                                </span>
                            </div>
                            <p className="text-xs text-pretty text-fg-muted">{t('other_hint')}</p>
                        </div>
                        <div className="grid gap-px">
                            {visibleOther.map(item => {
                                const applies = applyingOtherIds.has(item.id);
                                const monthly = monthlyAmount(Math.abs(item.amount), item.cadence);
                                return (
                                    <Link
                                        key={item.id}
                                        href={updateHref('fixed', item.id)}
                                        className="flex w-full items-center justify-between gap-3 border-b border-line px-4 py-2.5 text-left last:border-b-0 hover:bg-raised sm:px-5 sm:py-3">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm text-fg">
                                                {item.counterparty?.trim() || item.name}
                                            </div>
                                            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 font-mono text-xs tracking-normal text-fg-faint">
                                                <span className="truncate">
                                                    {applies
                                                        ? cadenceLabel(item.cadence, tChips)
                                                        : tFixed('status_planned')}
                                                </span>
                                                <HoldingChip assetId={item.assetId} />
                                            </div>
                                        </div>
                                        <span
                                            className={
                                                applies
                                                    ? 'shrink-0 font-mono text-sm text-success'
                                                    : 'shrink-0 font-mono text-sm text-fg-muted'
                                            }>
                                            {formatMoney(monthly)}
                                        </span>
                                    </Link>
                                );
                            })}
                            {deferredSearch && visibleOther.length === 0 ? (
                                <EmptyState
                                    variant="compact"
                                    className="border-0 bg-transparent"
                                    title={t('empty_search_title')}
                                    body={t('empty_search_body')}
                                />
                            ) : null}
                        </div>
                    </Card>
                ) : null}
            </div>

            {/* 3. Targets and what-ifs come after what the household entered. */}
            <AccentCard tint="var(--color-accent)" className="overflow-hidden p-0">
                <MetricStrip
                    size="lg"
                    className="border-t-0"
                    items={[
                        {
                            label: t('target'),
                            value: (
                                <span
                                    style={{
                                        background: 'var(--gradient-accent)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}>
                                    {formatMoney(target)}
                                </span>
                            ),
                            hint: t('mo_net'),
                        },
                        {
                            label: t('gap'),
                            value: gap < 0 ? `+${formatMoney(-gap)}` : formatMoney(gap),
                            tone: gap < 0 ? 'success' : gap === 0 ? 'success' : 'danger',
                            hint:
                                gap < 0 ? t('gap_over') : gap === 0 ? t('gap_met') : t('gap_to_go'),
                        },
                    ]}
                />
            </AccentCard>

            <div data-tour="income-simulator" className="min-w-0">
                <IncomeSimulator
                    netCents={monthlyNet}
                    targetCents={target}
                    clearedName={!traveling && gap <= 0 ? earnBar.clearedName : null}
                    jars={jars}
                    goals={saveGoals}
                />
            </div>
        </div>
    );
}
