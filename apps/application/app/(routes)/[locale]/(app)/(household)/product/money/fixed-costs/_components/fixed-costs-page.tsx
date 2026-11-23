'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useDeferredValue, useState } from 'react';

import {
    DEFAULT_JAR_SPLIT,
    jarCapabilitiesFor,
    JarKey,
    FlowDirection,
    type Cadence,
    FixedCostPeriodStatus,
    FIXED_COST_ARREARS_DEBT_THRESHOLD,
    FIXED_COSTS_COACH_KEY_PREFIX,
} from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { useLiveQuery } from '@rumtelo/hooks';
import { Card, EmptyState, Icon, Typography } from '@rumtelo/ui';
import {
    cn,
    describePeriodTravel,
    endOfPeriodIso,
    fixedCostAppliesAsOf,
    fixedCostDueMultiplier,
    horizonMonths,
    monthlyAmount,
    monthlyNetAsOf,
    toMinorUnits,
    toPeriodKey,
} from '@rumtelo/utils';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { CREATE_HREF, createFixedHref, fixedDetailHref } from '@/app/_lib/create-routes';
import { assetIdFromParams } from '@/app/_lib/create-prefill';
import { productPath } from '@/app/_lib/routes';
import { useHoldings } from '@/app/_lib/use-holdings';
import { cadenceLabel } from '@/app/_lib/jar-chrome';
import {
    fixedCostLifecycle,
    fixedCostStatus,
    lifecycleLabel,
    settlementsByFixedCostId,
} from '@/app/_lib/fixed-cost-match';
import { useCoachFeedCandidates } from '@/app/_lib/coach-line-feed';
import { jarChrome } from '@/app/_lib/jar-meta';
import { catalogMarkChrome } from '@/app/_lib/party-mark-chrome';
import { isScheduledLater, listFixedCostsForPeriodView } from '@/app/_lib/period-plan-list';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { isLiveData } from '@/app/_lib/preview';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { findPartyVendor, partyMark } from '@/app/_lib/vendor-brands';
import { useCategoryTemplates } from '@/components/features/forms/catalog-helpers';
import { ConfirmActionButton } from '@/components/features/forms/confirm-action-button';
import { CoachLine } from '@/components/features/helpers';
import {
    JarBadge,
    JarMark,
    MetaChip,
    formatBookedDate,
    formatDueDay,
} from '@/components/features/money/jar-badge';
import { HoldingChip } from '@/components/features/money/holding-chip';
import { MoneyPartyRow } from '@/components/features/money/money-party-row';
import {
    ArrearsDebtDialog,
    type ArrearsDebtTarget,
} from '@/components/features/money/arrears-debt-dialog';
import { FixedCostPeriodStatusControl } from '@/components/features/money/fixed-cost-period-status';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { ListSearchField } from '@/components/layout/list-controls';
import { ListToolbar } from '@/components/layout/list-toolbar';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useJarName } from '@/app/_lib/use-jar-name';

function compareByHoldingLast(
    leftAssetId: string | null | undefined,
    rightAssetId: string | null | undefined,
    holdingName: (assetId: string) => string
): number {
    const leftLinked = leftAssetId ? 1 : 0;
    const rightLinked = rightAssetId ? 1 : 0;
    if (leftLinked !== rightLinked) return leftLinked - rightLinked;
    if (leftAssetId && rightAssetId && leftAssetId !== rightAssetId) {
        return holdingName(leftAssetId).localeCompare(holdingName(rightAssetId));
    }
    return 0;
}

/** Coach feed rules this page owns, in priority order (backend: `money.fixed_costs.<rule>`). */
const FEED_KEYS = [
    `${FIXED_COSTS_COACH_KEY_PREFIX}over_necessities`,
    `${FIXED_COSTS_COACH_KEY_PREFIX}business_leak`,
    `${FIXED_COSTS_COACH_KEY_PREFIX}subscription_review`,
];

/**
 * Fixed costs: your bills first, the one Coach line after them. When fixed costs outgrow the
 * Necessities split, the backend feed says so (doctrine: apps/backend/src/modules/public/
 * product/money/README.md → “When Necessities can’t fit in 55%”); this page only renders it.
 */
export function FixedCostsPageClient() {
    const t = useTranslations('features.money.fixed');
    const tChips = useTranslations('features.money.chips');
    const tHolding = useTranslations('features.money.holding_link');
    const jarName = useJarName();
    const { householdId } = useAuth();
    const { period, showToast } = useHouseholdShell();
    const { canMutate } = useBoardWriteAccess();
    const { formatMoney } = useHouseholdCurrency();
    const apiError = useApiError();
    const queryClient = useQueryClient();
    const appLocale = useLocale();
    const searchParams = useSearchParams();
    // `?assetId=` from a holding's detail page: show only what belongs to it.
    const assetFilter = assetIdFromParams(searchParams) ?? null;
    const { byId: holdingById } = useHoldings();
    const coachCandidates = useCoachFeedCandidates(FEED_KEYS);
    const filteredHolding = assetFilter ? holdingById.get(assetFilter) : undefined;
    const [jarFilter, setJarFilter] = useState<JarKey | null>(null);
    const [search, setSearch] = useState('');
    const deferredSearch = useDeferredValue(search.trim().toLowerCase());
    const [openJarKeys, setOpenJarKeys] = useState<Set<string>>(() => new Set());
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
    const [arrearsTarget, setArrearsTarget] = useState<ArrearsDebtTarget | null>(null);
    const live = isLiveData(householdId);
    const periodKey = toPeriodKey(period.year, period.month);
    const travel = describePeriodTravel(period);
    const horizon = horizonMonths(travel);
    const traveling = travel.direction !== 'current';

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

    /** All settlements — needed to count uncleared carried months for N× due. */
    const settlementsQuery = useLiveQuery(
        apiQuery.money.fixedCosts.listSettlements.queryOptions({
            input: { householdId: householdId! },
        }),
        [] as never,
        live
    );

    const incomeQuery = useLiveQuery(
        apiQuery.money.income.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
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
    const categoryTemplatesQuery = useCategoryTemplates(live);
    const merchants = merchantsQuery.data ?? [];
    const givingOrgs = givingOrgsQuery.data ?? [];
    const categoryTemplates = categoryTemplatesQuery.data ?? [];
    const { jars: catalogJars, byKey: jarByKey } = useJarCatalog();
    const splitJars =
        catalogJars.length > 0
            ? catalogJars
            : Object.values(JarKey).map(key => ({
                  key,
                  name: key,
                  icon: null as string | null,
                  color: jarChrome(key).color,
                  pct: DEFAULT_JAR_SPLIT[key],
              }));

    // Flatten byJar groups — keep cadence so OUT totals match jar committedOut.
    const allFixedOut =
        live && byJarQuery.data?.length
            ? byJarQuery.data.flatMap(group =>
                  group.items
                      .filter(item => item.direction === FlowDirection.OUT)
                      .map(item => ({
                          ...item,
                          monthly: monthlyAmount(Math.abs(item.amount), item.cadence),
                          jarKey: group.jarKey,
                          jarId: group.jarId,
                      }))
              )
            : [];
    const asOf = endOfPeriodIso(periodKey);
    const { applying: applyingFixedCosts, list: fixedCosts } = listFixedCostsForPeriodView(
        allFixedOut,
        asOf,
        travel.direction
    );
    const inactiveFixedCosts = allFixedOut.filter(
        item => !fixedCostAppliesAsOf(item, asOf) && !isScheduledLater(item, asOf)
    );

    const periodTransactions = periodTxQuery.data?.items ?? [];
    const allSettlements = settlementsQuery.data ?? [];
    const periodSettlements = allSettlements.filter(row => row.period === periodKey);
    const settlementById = settlementsByFixedCostId(periodSettlements);
    const settlementsByCostId = new Map<string, typeof allSettlements>();
    for (const row of allSettlements) {
        const list = settlementsByCostId.get(row.fixedCostId) ?? [];
        list.push(row);
        settlementsByCostId.set(row.fixedCostId, list);
    }
    const txById = new Map(periodTransactions.map(tx => [tx.id, tx]));

    // Income only feeds the "left after costs" calculation; it is listed on Income.
    const allIncome = incomeQuery.data ?? [];
    const NET = monthlyNetAsOf(allIncome, asOf);
    const outTotal = applyingFixedCosts.reduce((total, item) => {
        const multiplier = fixedCostDueMultiplier(
            settlementsByCostId.get(item.id) ?? [],
            periodKey
        );
        return total + monthlyAmount(Math.abs(item.amount), item.cadence) * multiplier;
    }, 0);
    const leftover = NET - outTotal;
    // Holding filter narrows the lists only — totals above stay the household's.
    const holdingFixedCosts = assetFilter
        ? fixedCosts.filter(fixedCost => fixedCost.assetId === assetFilter)
        : fixedCosts;
    const jarScopedFixedCosts = jarFilter
        ? holdingFixedCosts.filter(fixedCost => fixedCost.jarKey === jarFilter)
        : holdingFixedCosts;
    const visibleFixedCosts = deferredSearch
        ? jarScopedFixedCosts.filter(fixedCost =>
              `${fixedCost.counterparty ?? ''} ${fixedCost.name}`
                  .toLowerCase()
                  .includes(deferredSearch)
          )
        : jarScopedFixedCosts;
    const jarNameByKey = new Map(splitJars.map(jar => [jar.key, jarName(jar)]));
    const groupedFixedCosts = splitJars
        .filter(jar => visibleFixedCosts.some(item => item.jarKey === jar.key))
        .map(jar => {
            const items = visibleFixedCosts
                .filter(item => item.jarKey === jar.key)
                .slice()
                .sort((left, right) => {
                    const leftApplies = fixedCostAppliesAsOf(left, asOf) ? 0 : 1;
                    const rightApplies = fixedCostAppliesAsOf(right, asOf) ? 0 : 1;
                    if (leftApplies !== rightApplies) return leftApplies - rightApplies;
                    const byHolding = compareByHoldingLast(
                        left.assetId,
                        right.assetId,
                        id => holdingById.get(id)?.name ?? id
                    );
                    if (byHolding !== 0) return byHolding;
                    const leftDay = left.dueDay ?? 99;
                    const rightDay = right.dueDay ?? 99;
                    if (leftDay !== rightDay) return leftDay - rightDay;
                    return (left.counterparty ?? left.name).localeCompare(
                        right.counterparty ?? right.name
                    );
                });
            const monthly = items
                .filter(item => fixedCostAppliesAsOf(item, asOf))
                .reduce((total, item) => {
                    const multiplier = fixedCostDueMultiplier(
                        settlementsByCostId.get(item.id) ?? [],
                        periodKey
                    );
                    return total + item.monthly * multiplier;
                }, 0);
            return { jar, items, monthly };
        });

    const jarFilterJars = splitJars.filter(
        jar =>
            jarCapabilitiesFor(jar.key).allowsFixedCosts &&
            holdingFixedCosts.some(fixedCost => fixedCost.jarKey === jar.key)
    );

    const dueIds = applyingFixedCosts
        .filter(
            item =>
                fixedCostStatus(item, settlementById.get(item.id), periodKey) ===
                FixedCostPeriodStatus.DUE
        )
        .map(item => item.id);
    const dueIdSet = new Set(dueIds);
    const selectedDueIds = [...selectedIds].filter(id => dueIdSet.has(id));

    const arrearsDebtCandidates = applyingFixedCosts
        .map(item => {
            const arrearsMonths = Math.max(
                0,
                fixedCostDueMultiplier(settlementsByCostId.get(item.id) ?? [], periodKey) - 1
            );
            return {
                fixedCostId: item.id,
                name: item.counterparty?.trim() || item.name,
                amount: item.amount,
                arrearsMonths,
            };
        })
        .filter(row => row.arrearsMonths >= FIXED_COST_ARREARS_DEBT_THRESHOLD);

    function exitSelectMode() {
        setSelectMode(false);
        setSelectedIds(new Set());
    }

    function toggleSelected(id: string) {
        setSelectedIds(previous => {
            const next = new Set(previous);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function toggleGroupDue(ids: string[]) {
        if (ids.length === 0) return;
        setSelectedIds(previous => {
            const next = new Set(previous);
            const allSelected = ids.every(id => next.has(id));
            if (allSelected) {
                for (const id of ids) next.delete(id);
            } else {
                for (const id of ids) next.add(id);
            }
            return next;
        });
    }

    const convertArrearsMutation = useMutation({
        mutationFn: async (input: {
            fixedCostId: string;
            collectionNoticeSent: boolean;
            collectionFees: number;
            scheduleKind: Parameters<
                typeof api.money.fixedCosts.convertArrearsToDebt
            >[0]['scheduleKind'];
            termPayments: number | null;
            maturityOn: string | null;
            paymentCadence: Cadence.MONTHLY;
        }) => {
            if (!householdId) throw new Error('No household');
            return api.money.fixedCosts.convertArrearsToDebt({
                householdId,
                fixedCostId: input.fixedCostId,
                period: periodKey,
                collectionNoticeSent: input.collectionNoticeSent,
                collectionFees: input.collectionFees,
                scheduleKind: input.scheduleKind,
                termPayments: input.termPayments,
                maturityOn: input.maturityOn,
                paymentCadence: input.paymentCadence,
            });
        },
        onSuccess: debt => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.fixedCosts.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.debts.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.balances.key() });
            setArrearsTarget(null);
            showToast(t('arrears_debt_toast', { name: debt.name }), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const markPaidMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            if (!householdId) throw new Error('No household');
            await Promise.all(
                ids.map(fixedCostId =>
                    api.money.fixedCosts.markPaid({
                        householdId,
                        fixedCostId,
                        period: periodKey,
                    })
                )
            );
            return ids.length;
        },
        onSuccess: count => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.fixedCosts.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.balances.key() });
            void queryClient.invalidateQueries({
                queryKey: apiQuery.money.monthScore.current.key(),
            });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.dashboard.get.key() });
            exitSelectMode();
            showToast(count === 1 ? t('toast_paid') : t('toast_paid_all', { count }), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    return (
        <div className="grid animate-rise gap-8">
            <div>
                <Typography as="span" variant="eyebrow" color="primary">
                    ✦ {t('eyebrow')}
                </Typography>
                <Typography as="h1" className="mt-2">
                    {t('title')}
                </Typography>
                <Typography as="p" variant="lead" size="default" className="mt-2">
                    {t('out_total_line', { amount: formatMoney(outTotal) })}
                </Typography>
                {traveling ? (
                    <Typography as="p" variant="lead" size="default" className="mt-2">
                        {t('travel_lead', {
                            months: horizon,
                            outTotal: formatMoney(outTotal * horizon),
                            netTotal: formatMoney(NET * horizon),
                        })}
                    </Typography>
                ) : null}
            </div>

            {assetFilter && filteredHolding ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/40 bg-accent-soft px-4 py-3">
                    <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                        {tHolding('filter_eyebrow')}
                    </p>
                    <HoldingChip assetId={assetFilter} link />
                    <Link
                        href={productPath('money/fixed-costs')}
                        className="ml-auto rounded-sm font-mono text-xs tracking-wide text-accent uppercase outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent/35">
                        {tHolding('filter_clear')}
                    </Link>
                </div>
            ) : null}

            <div data-tour="fixed-tabs">
                <ListToolbar
                    createLabel={t('add_fixed')}
                    createHref={
                        assetFilter ? createFixedHref({ assetId: assetFilter }) : CREATE_HREF.fixed
                    }
                    secondary={
                        <span
                            className={cn(
                                'font-mono text-xs font-medium',
                                leftover >= 0 ? 'text-success' : 'text-danger'
                            )}>
                            {traveling
                                ? t('leftover_travel', {
                                      amount: `${leftover >= 0 ? '+ ' : ''}${formatMoney(leftover)}`,
                                      horizon: formatMoney(leftover * horizon),
                                      months: horizon,
                                  })
                                : t('leftover', {
                                      amount: `${leftover >= 0 ? '+ ' : ''}${formatMoney(leftover)}`,
                                  })}
                        </span>
                    }
                />
            </div>

            <div data-tour="fixed-list" className="grid gap-5">
                <div className="grid gap-5">
                    <Card className="p-0">
                        <div
                            className={cn(
                                'flex items-center justify-between gap-3 border-b px-5 py-3.5',
                                selectMode ? 'border-accent bg-accent-soft/70' : 'border-line'
                            )}>
                            <Typography as="span" variant="eyebrow" color="primary">
                                ✦ {t('every_month_out')}
                            </Typography>
                            <div className="flex shrink-0 items-center gap-2.5">
                                {dueIds.length > 0 && live && canMutate ? (
                                    selectMode ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={exitSelectMode}
                                                className="min-h-9 rounded-md px-2 font-mono text-xs font-medium tracking-wide text-fg-secondary uppercase underline-offset-2 hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                                                {t('select_cancel')}
                                            </button>
                                            {selectedDueIds.length < dueIds.length ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedIds(new Set(dueIds))}
                                                    className="min-h-9 rounded-md px-2 font-mono text-xs font-medium tracking-wide text-accent uppercase underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                                                    {t('select_all_due')}
                                                </button>
                                            ) : null}
                                            {selectedDueIds.length > 0 ? (
                                                <ConfirmActionButton
                                                    size="sm"
                                                    variant="secondary"
                                                    label={t('mark_selected', {
                                                        count: selectedDueIds.length,
                                                    })}
                                                    confirmLabel={t('mark_selected_confirm', {
                                                        count: selectedDueIds.length,
                                                    })}
                                                    pending={markPaidMutation.isPending}
                                                    onConfirm={() =>
                                                        markPaidMutation.mutate(selectedDueIds)
                                                    }
                                                />
                                            ) : null}
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectMode(true);
                                                    setSelectedIds(new Set());
                                                }}
                                                className="min-h-9 rounded-md border border-accent bg-accent-soft px-2.5 font-mono text-xs font-medium tracking-wide text-accent uppercase hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                                                {t('select_due')}
                                            </button>
                                            <ConfirmActionButton
                                                size="sm"
                                                variant="secondary"
                                                label={t('mark_all_due')}
                                                confirmLabel={t('mark_all_due_confirm', {
                                                    count: dueIds.length,
                                                })}
                                                pending={markPaidMutation.isPending}
                                                onConfirm={() => markPaidMutation.mutate(dueIds)}
                                            />
                                        </>
                                    )
                                ) : null}
                                <span className="font-mono text-sm text-fg-secondary">
                                    {formatMoney(outTotal)}
                                </span>
                            </div>
                        </div>

                        <div className="border-b border-line px-5 py-3">
                            <ListSearchField
                                value={search}
                                onChange={setSearch}
                                placeholder={t('search_placeholder')}
                                ariaLabel={t('search_aria')}
                            />
                        </div>

                        {jarFilterJars.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-5 py-3">
                                <span className="font-mono text-[10px] leading-none tracking-widest text-fg-muted uppercase">
                                    {t('filter_label')}
                                </span>
                                <div
                                    className="flex min-w-0 flex-wrap items-center gap-2"
                                    role="group"
                                    aria-label={t('filter_jar_aria')}>
                                    <button
                                        type="button"
                                        onClick={() => setJarFilter(null)}
                                        aria-pressed={jarFilter === null}
                                        className={cn(
                                            'flex items-center rounded-full border px-3 py-1.5 font-mono text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/35',
                                            jarFilter === null
                                                ? 'border-accent bg-accent-soft text-accent'
                                                : 'border-line-strong bg-surface text-fg-secondary hover:border-accent hover:text-accent'
                                        )}>
                                        {t('filter_all')}
                                    </button>
                                    {jarFilterJars.map(j => {
                                        const on = jarFilter === j.key;
                                        return (
                                            <button
                                                key={j.key}
                                                type="button"
                                                onClick={() =>
                                                    setJarFilter(previous =>
                                                        previous === j.key ? null : j.key
                                                    )
                                                }
                                                aria-pressed={on}
                                                className={cn(
                                                    'flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/35',
                                                    on
                                                        ? 'border-accent bg-accent-soft text-accent'
                                                        : 'border-line-strong bg-surface text-fg-secondary hover:border-accent hover:text-accent'
                                                )}>
                                                <JarMark jarKey={j.key} icon={j.icon} />
                                                {jarName(j)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : null}

                        <div className="grid">
                            {groupedFixedCosts.length === 0 ? (
                                <EmptyState
                                    variant="compact"
                                    className="border-0 bg-transparent"
                                    title={
                                        deferredSearch
                                            ? t('empty_search_title')
                                            : jarFilter
                                              ? t('empty_jar_title')
                                              : t('empty_all_title')
                                    }
                                    body={
                                        deferredSearch
                                            ? t('empty_search_body')
                                            : jarFilter
                                              ? t('empty_jar_body')
                                              : t('empty_all_body')
                                    }
                                />
                            ) : (
                                groupedFixedCosts.map(group => {
                                    const open =
                                        openJarKeys.size === 0
                                            ? true
                                            : openJarKeys.has(group.jar.key);
                                    const groupDueIds = group.items
                                        .filter(item => {
                                            if (!fixedCostAppliesAsOf(item, asOf)) return false;
                                            return (
                                                fixedCostStatus(
                                                    item,
                                                    settlementById.get(item.id),
                                                    period
                                                ) === FixedCostPeriodStatus.DUE
                                            );
                                        })
                                        .map(item => item.id);
                                    const groupAllSelected =
                                        groupDueIds.length > 0 &&
                                        groupDueIds.every(id => selectedIds.has(id));
                                    const groupSomeSelected =
                                        groupDueIds.some(id => selectedIds.has(id)) &&
                                        !groupAllSelected;
                                    return (
                                        <div key={group.jar.key}>
                                            <div className="flex w-full items-center border-b border-line bg-raised/60">
                                                {selectMode && groupDueIds.length > 0 ? (
                                                    <button
                                                        type="button"
                                                        data-mutate
                                                        role="checkbox"
                                                        aria-checked={
                                                            groupAllSelected
                                                                ? true
                                                                : groupSomeSelected
                                                                  ? 'mixed'
                                                                  : false
                                                        }
                                                        aria-label={t('select_group_due')}
                                                        onClick={() => toggleGroupDue(groupDueIds)}
                                                        className={cn(
                                                            'ml-5 grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors',
                                                            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                                                            groupAllSelected
                                                                ? 'border-accent bg-accent text-on-accent'
                                                                : groupSomeSelected
                                                                  ? 'border-accent bg-accent/20 text-accent dark:bg-accent dark:text-on-accent'
                                                                  : 'border-fg-muted bg-surface text-transparent hover:border-accent'
                                                        )}>
                                                        <Icon name="check" size="sm" />
                                                    </button>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    aria-expanded={open}
                                                    onClick={() =>
                                                        setOpenJarKeys(previous => {
                                                            const baseline =
                                                                previous.size === 0
                                                                    ? new Set(
                                                                          groupedFixedCosts.map(
                                                                              row => row.jar.key
                                                                          )
                                                                      )
                                                                    : new Set(previous);
                                                            if (baseline.has(group.jar.key)) {
                                                                baseline.delete(group.jar.key);
                                                            } else {
                                                                baseline.add(group.jar.key);
                                                            }
                                                            return baseline;
                                                        })
                                                    }
                                                    className={cn(
                                                        'flex min-w-0 flex-1 items-center justify-between gap-3 py-2 text-left hover:bg-raised',
                                                        selectMode && groupDueIds.length > 0
                                                            ? 'pr-5 pl-3'
                                                            : 'px-5'
                                                    )}>
                                                    <JarBadge
                                                        jarKey={group.jar.key}
                                                        name={jarName(group.jar)}
                                                        icon={group.jar.icon}
                                                    />
                                                    <span className="flex items-center gap-2">
                                                        <span className="font-mono text-[11px] text-fg-faint">
                                                            {formatMoney(-Math.abs(group.monthly))}
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
                                            </div>
                                            {open
                                                ? group.items.map(fixedCost => {
                                                      const company =
                                                          fixedCost.counterparty?.trim() ||
                                                          fixedCost.name;
                                                      const subtitle =
                                                          fixedCost.counterparty?.trim() &&
                                                          fixedCost.counterparty.trim() !==
                                                              fixedCost.name.trim()
                                                              ? fixedCost.name
                                                              : null;
                                                      const due = formatDueDay(
                                                          fixedCost.dueDay,
                                                          tChips,
                                                          fixedCost.cadence,
                                                          fixedCost.dueMonth
                                                      );
                                                      const settlement = settlementById.get(
                                                          fixedCost.id
                                                      );
                                                      const applies = fixedCostAppliesAsOf(
                                                          fixedCost,
                                                          asOf
                                                      );
                                                      const status = applies
                                                          ? fixedCostStatus(
                                                                fixedCost,
                                                                settlement,
                                                                period
                                                            )
                                                          : FixedCostPeriodStatus.UPCOMING;
                                                      const linkedTx = settlement?.transactionId
                                                          ? txById.get(settlement.transactionId)
                                                          : undefined;
                                                      const isDue =
                                                          status === FixedCostPeriodStatus.DUE;
                                                      const dueMultiplier = applies
                                                          ? fixedCostDueMultiplier(
                                                                settlementsByCostId.get(
                                                                    fixedCost.id
                                                                ) ?? [],
                                                                periodKey
                                                            )
                                                          : 1;
                                                      const arrearsMonths = Math.max(
                                                          0,
                                                          dueMultiplier - 1
                                                      );
                                                      const dueMonthly =
                                                          fixedCost.monthly * dueMultiplier;
                                                      const isSelected = selectedIds.has(
                                                          fixedCost.id
                                                      );
                                                      return (
                                                          <MoneyPartyRow
                                                              key={fixedCost.id}
                                                              title={company}
                                                              subtitle={subtitle}
                                                              mark={partyMark(
                                                                  findPartyVendor(
                                                                      company,
                                                                      merchants,
                                                                      givingOrgs
                                                                  ),
                                                                  catalogMarkChrome({
                                                                      billName: fixedCost.name,
                                                                      jarKey: fixedCost.jarKey,
                                                                      jarByKey,
                                                                      categoryTemplates,
                                                                  })
                                                              )}
                                                              amount={formatMoney(
                                                                  -Math.abs(dueMonthly)
                                                              )}
                                                              amountClassName={
                                                                  applies
                                                                      ? undefined
                                                                      : 'text-fg-muted'
                                                              }
                                                              badges={
                                                                  <>
                                                                      {due ? (
                                                                          <MetaChip>{due}</MetaChip>
                                                                      ) : null}
                                                                      <MetaChip>
                                                                          {cadenceLabel(
                                                                              fixedCost.cadence,
                                                                              tChips
                                                                          )}
                                                                      </MetaChip>
                                                                      {arrearsMonths > 0 ? (
                                                                          <MetaChip className="border-warning bg-warning/8 text-warning">
                                                                              {arrearsMonths === 1
                                                                                  ? t(
                                                                                        'arrears_badge_one'
                                                                                    )
                                                                                  : t(
                                                                                        'arrears_badge_other',
                                                                                        {
                                                                                            count: arrearsMonths,
                                                                                        }
                                                                                    )}
                                                                          </MetaChip>
                                                                      ) : null}
                                                                      {fixedCost.isCancellable ? (
                                                                          <MetaChip>
                                                                              {t('could_cancel')}
                                                                          </MetaChip>
                                                                      ) : null}
                                                                      {linkedTx ? (
                                                                          <MetaChip>
                                                                              {formatBookedDate(
                                                                                  linkedTx.bookedOn,
                                                                                  appLocale
                                                                              )}
                                                                          </MetaChip>
                                                                      ) : null}
                                                                      {Math.abs(
                                                                          fixedCost.monthly
                                                                      ) !==
                                                                      Math.abs(fixedCost.amount) ? (
                                                                          <MetaChip>
                                                                              {tChips(
                                                                                  'amount_per_month',
                                                                                  {
                                                                                      amount: formatMoney(
                                                                                          fixedCost.monthly
                                                                                      ),
                                                                                  }
                                                                              )}
                                                                          </MetaChip>
                                                                      ) : null}
                                                                      <HoldingChip
                                                                          assetId={
                                                                              fixedCost.assetId
                                                                          }
                                                                      />
                                                                  </>
                                                              }
                                                              selected={selectMode && isSelected}
                                                              leading={
                                                                  selectMode && isDue ? (
                                                                      <button
                                                                          type="button"
                                                                          data-mutate
                                                                          role="checkbox"
                                                                          aria-checked={isSelected}
                                                                          aria-label={`${t('select_due')}: ${company}`}
                                                                          onClick={() =>
                                                                              toggleSelected(
                                                                                  fixedCost.id
                                                                              )
                                                                          }
                                                                          className={cn(
                                                                              'grid size-6 place-items-center rounded-full border-2 transition-colors',
                                                                              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                                                                              isSelected
                                                                                  ? 'border-accent bg-accent text-on-accent'
                                                                                  : 'border-fg-muted bg-surface text-transparent hover:border-accent'
                                                                          )}>
                                                                          <Icon
                                                                              name="check"
                                                                              size="sm"
                                                                          />
                                                                      </button>
                                                                  ) : undefined
                                                              }
                                                              href={
                                                                  selectMode && isDue
                                                                      ? undefined
                                                                      : fixedDetailHref(
                                                                            fixedCost.id
                                                                        )
                                                              }
                                                              onClick={
                                                                  selectMode && isDue
                                                                      ? () =>
                                                                            toggleSelected(
                                                                                fixedCost.id
                                                                            )
                                                                      : undefined
                                                              }
                                                              status={
                                                                  <FixedCostPeriodStatusControl
                                                                      status={status}
                                                                      labels={{
                                                                          taken: t('status_taken'),
                                                                          due: t('status_due'),
                                                                          skipped:
                                                                              t('status_skipped'),
                                                                          rolled: t(
                                                                              'status_rolled'
                                                                          ),
                                                                          planned:
                                                                              t('status_planned'),
                                                                          markPaidAria:
                                                                              t('mark_paid_short'),
                                                                          markPaidConfirm:
                                                                              t(
                                                                                  'mark_paid_confirm'
                                                                              ),
                                                                          markPaidPending:
                                                                              t(
                                                                                  'mark_paid_pending'
                                                                              ),
                                                                      }}
                                                                      canMarkPaid={
                                                                          !selectMode &&
                                                                          canMutate &&
                                                                          live &&
                                                                          applies
                                                                      }
                                                                      pending={
                                                                          markPaidMutation.isPending
                                                                      }
                                                                      onMarkPaid={() =>
                                                                          markPaidMutation.mutate([
                                                                              fixedCost.id,
                                                                          ])
                                                                      }
                                                                  />
                                                              }
                                                          />
                                                      );
                                                  })
                                                : null}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </Card>
                </div>

                {travel.direction === 'current' && inactiveFixedCosts.length > 0 ? (
                    <Card className="p-0">
                        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                            <Typography as="span" variant="eyebrow" color="muted">
                                ✦ {t('paused_ended')}
                            </Typography>
                            <span className="font-mono text-xs text-fg-faint">
                                {inactiveFixedCosts.length}
                            </span>
                        </div>
                        <div className="grid opacity-80">
                            {inactiveFixedCosts
                                .slice()
                                .sort((left, right) =>
                                    (left.counterparty ?? left.name).localeCompare(
                                        right.counterparty ?? right.name
                                    )
                                )
                                .map(fixedCost => {
                                    const company =
                                        fixedCost.counterparty?.trim() || fixedCost.name;
                                    const subtitle =
                                        fixedCost.counterparty?.trim() &&
                                        fixedCost.counterparty.trim() !== fixedCost.name.trim()
                                            ? fixedCost.name
                                            : null;
                                    const lifecycle = fixedCostLifecycle(fixedCost);
                                    return (
                                        <MoneyPartyRow
                                            key={fixedCost.id}
                                            title={company}
                                            subtitle={subtitle}
                                            mark={partyMark(
                                                findPartyVendor(company, merchants, givingOrgs),
                                                catalogMarkChrome({
                                                    billName: fixedCost.name,
                                                    jarKey: fixedCost.jarKey,
                                                    jarByKey,
                                                    categoryTemplates,
                                                })
                                            )}
                                            amount={formatMoney(-Math.abs(fixedCost.monthly))}
                                            badges={
                                                <>
                                                    <MetaChip className="text-fg-muted">
                                                        {lifecycleLabel(lifecycle, {
                                                            active: t('lifecycle_active'),
                                                            paused: t('lifecycle_paused'),
                                                            ended: t('lifecycle_ended'),
                                                        })}
                                                    </MetaChip>
                                                    <JarBadge
                                                        jarKey={fixedCost.jarKey}
                                                        name={
                                                            jarNameByKey.get(fixedCost.jarKey) ??
                                                            fixedCost.jarKey
                                                        }
                                                        icon={jarByKey.get(fixedCost.jarKey)?.icon}
                                                    />
                                                </>
                                            }
                                            href={fixedDetailHref(fixedCost.id)}
                                        />
                                    );
                                })}
                        </div>
                    </Card>
                ) : null}
            </div>

            {arrearsDebtCandidates.length > 0 && canMutate && live ? (
                <div
                    role="status"
                    className="rounded-xl border border-warning bg-warning/8 px-4 py-3.5">
                    <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-warning uppercase">
                        {t('arrears_prompt_title')}
                    </p>
                    {arrearsDebtCandidates.length === 1 ? (
                        <p className="mt-2 text-sm text-pretty text-fg-secondary">
                            {t('arrears_prompt_body', {
                                name: arrearsDebtCandidates[0]!.name,
                                count: arrearsDebtCandidates[0]!.arrearsMonths,
                                amount: formatMoney(
                                    arrearsDebtCandidates[0]!.amount *
                                        arrearsDebtCandidates[0]!.arrearsMonths
                                ),
                            })}
                        </p>
                    ) : (
                        <p className="mt-2 text-sm text-pretty text-fg-secondary">
                            {t('arrears_prompt_multi', {
                                count: arrearsDebtCandidates.length,
                            })}
                        </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                        {arrearsDebtCandidates.map(candidate => (
                            <button
                                key={candidate.fixedCostId}
                                type="button"
                                data-mutate
                                onClick={() => setArrearsTarget(candidate)}
                                className="rounded-lg border border-warning bg-surface px-2.5 py-1.5 font-mono text-[10px] font-medium tracking-wide text-warning uppercase transition-colors outline-none hover:bg-warning/10 focus-visible:ring-2 focus-visible:ring-accent/35">
                                {arrearsDebtCandidates.length === 1
                                    ? t('arrears_prompt_cta')
                                    : `${t('arrears_prompt_cta')} · ${candidate.name}`}
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}

            <CoachLine candidates={coachCandidates} />

            <ArrearsDebtDialog
                open={Boolean(arrearsTarget)}
                onOpenChange={open => {
                    if (!open) setArrearsTarget(null);
                }}
                target={arrearsTarget}
                pending={convertArrearsMutation.isPending}
                formatMoney={formatMoney}
                parseMoney={major => {
                    const normalized = major.replace(',', '.').trim();
                    const value = Number(normalized);
                    if (!Number.isFinite(value) || value < 0) return 0;
                    return toMinorUnits(value);
                }}
                onConfirm={input => {
                    if (!arrearsTarget) return;
                    convertArrearsMutation.mutate({
                        fixedCostId: arrearsTarget.fixedCostId,
                        ...input,
                    });
                }}
            />
        </div>
    );
}
