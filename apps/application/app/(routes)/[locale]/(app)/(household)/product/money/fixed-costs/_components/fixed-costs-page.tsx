'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import {
    DEFAULT_JAR_SPLIT,
    jarCapabilitiesFor,
    JarKey,
    FlowDirection,
    Cadence,
    FixedCostPeriodStatus,
} from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { useLiveQuery } from '@rumtelo/hooks';
import { Card, EmptyState, Icon, Typography } from '@rumtelo/ui';
import {
    cn,
    describePeriodTravel,
    endOfPeriodIso,
    fixedCostAppliesAsOf,
    horizonMonths,
    incomeAmountAsOf,
    monthlyAmount,
    monthlyNetAsOf,
    sumMonthlyFixedOut,
    toPeriodKey,
    evaluateBusinessHouseholdLeak,
} from '@rumtelo/utils';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import {
    CREATE_HREF,
    createFixedHref,
    createIncomeHref,
    fixedDetailHref,
    updateHref,
} from '@/app/_lib/create-routes';
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
import { evaluateNecessitiesPressure } from '@/app/_lib/necessities-pressure';
import { jarChrome } from '@/app/_lib/jar-meta';
import { catalogMarkChrome } from '@/app/_lib/party-mark-chrome';
import {
    isScheduledLater,
    listFixedCostsForPeriodView,
    listIncomeForPeriodView,
} from '@/app/_lib/period-plan-list';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { isLiveData } from '@/app/_lib/preview';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { findPartyVendor, partyMark } from '@/app/_lib/vendor-brands';
import { useCategoryTemplates } from '@/components/features/forms/catalog-helpers';
import { ConfirmActionButton } from '@/components/features/forms/confirm-action-button';
import { CoachTipCard } from '@/components/features/helpers';
import {
    JarBadge,
    JarMark,
    MetaChip,
    formatBookedDate,
    formatDueDay,
} from '@/components/features/money/jar-badge';
import { HoldingChip } from '@/components/features/money/holding-chip';
import { DepositBankChip } from '@/components/features/money/deposit-bank-chip';
import { MoneyPartyRow } from '@/components/features/money/money-party-row';
import { FixedCostPeriodStatusControl } from '@/components/features/money/fixed-cost-period-status';
import { NecessitiesPressureCard } from '@/components/features/money/necessities-pressure-card';
import { BusinessHouseholdLeakCard } from '@/components/features/money/business-household-leak-card';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { ListToolbar } from '@/components/layout/list-toolbar';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

type Tab = 'ERUIT' | 'ERIN';

/**
 * Fixed costs & income.
 * When fixed OUT blows past the Necessities envelope, see NecessitiesPressureCard
 * and doctrine in apps/backend/src/modules/public/product/money/README.md
 * → “When Necessities can’t fit in 55%”.
 */
export function FixedCostsPageClient() {
    const t = useTranslations('features.money.fixed');
    const tChips = useTranslations('features.money.chips');
    const tHolding = useTranslations('features.money.holding_link');
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
    const { byId: holdingById, holdings } = useHoldings();
    const filteredHolding = assetFilter ? holdingById.get(assetFilter) : undefined;
    const [tab, setTab] = useState<Tab>(searchParams.get('tab') === 'in' ? 'ERIN' : 'ERUIT');
    const [jarFilter, setJarFilter] = useState<JarKey | null>(null);
    const [openJarKeys, setOpenJarKeys] = useState<Set<string>>(() => new Set());
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
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

    const settlementsQuery = useLiveQuery(
        apiQuery.money.fixedCosts.listSettlements.queryOptions({
            input: { householdId: householdId!, period: periodKey },
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
    const settlementById = settlementsByFixedCostId(settlementsQuery.data ?? []);
    const txById = new Map(periodTransactions.map(tx => [tx.id, tx]));

    const allIncome = incomeQuery.data ?? [];
    const { applying: applyingIncome, list: incomeForView } = listIncomeForPeriodView(
        allIncome,
        asOf,
        travel.direction
    );
    const incomeSources =
        live && incomeForView.length
            ? incomeForView.map(source => {
                  const applies = applyingIncome.some(row => row.id === source.id);
                  const amount = applies
                      ? (incomeAmountAsOf(source, asOf) ?? source.amount)
                      : source.amount;
                  return {
                      id: source.id,
                      label: source.name,
                      amount,
                      monthly: monthlyAmount(amount, source.cadence),
                      cadence: source.cadence,
                      kind: source.kind,
                      dueDay: source.expectedDay,
                      assetId: source.assetId ?? null,
                      bankId: source.bankId ?? null,
                      accountId: source.accountId ?? null,
                      applies,
                  };
              })
            : [];

    const NET = monthlyNetAsOf(allIncome, asOf);
    const outTotal = sumMonthlyFixedOut(
        applyingFixedCosts.map(item => ({
            amount: item.amount,
            cadence: item.cadence,
            direction: 'OUT' as const,
            isActive: item.isActive,
            startedOn: item.startedOn,
            endsOn: item.endsOn,
        })),
        { asOf, activeOnly: false }
    );
    const leftover = NET - outTotal;
    const commitmentRatio = NET > 0 ? Math.round((outTotal / NET) * 100) : 0;
    // Holding filter narrows the lists only — totals above stay the household's.
    const holdingFixedCosts = assetFilter
        ? fixedCosts.filter(fixedCost => fixedCost.assetId === assetFilter)
        : fixedCosts;
    const visibleFixedCosts = jarFilter
        ? holdingFixedCosts.filter(fixedCost => fixedCost.jarKey === jarFilter)
        : holdingFixedCosts;
    const visibleIncomeSources = assetFilter
        ? incomeSources.filter(source => source.assetId === assetFilter)
        : incomeSources;

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
                    const leftDay = left.dueDay ?? 99;
                    const rightDay = right.dueDay ?? 99;
                    if (leftDay !== rightDay) return leftDay - rightDay;
                    return (left.counterparty ?? left.name).localeCompare(
                        right.counterparty ?? right.name
                    );
                });
            const monthly = items
                .filter(item => fixedCostAppliesAsOf(item, asOf))
                .reduce((total, item) => total + item.monthly, 0);
            return { jar, items, monthly };
        });

    const necessitiesFixedMonthly = applyingFixedCosts
        .filter(item => item.jarKey === JarKey.NECESSITIES)
        .reduce((total, item) => total + item.monthly, 0);
    const necessitiesPressure = evaluateNecessitiesPressure({
        netMonthlyCents: NET,
        fixedOutMonthlyCents: outTotal,
        necessitiesFixedMonthlyCents: necessitiesFixedMonthly,
    });
    const businessLeak = evaluateBusinessHouseholdLeak({
        assets: holdings,
        bills: applyingFixedCosts,
        asOf,
    });

    const dueIds = applyingFixedCosts
        .filter(
            item =>
                fixedCostStatus(item, settlementById.get(item.id), periodKey) ===
                FixedCostPeriodStatus.DUE
        )
        .map(item => item.id);
    const dueIdSet = new Set(dueIds);
    const selectedDueIds = [...selectedIds].filter(id => dueIdSet.has(id));

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

            {/* Doctrine: money README → “When Necessities can’t fit in 55%” */}
            <NecessitiesPressureCard pressure={necessitiesPressure} variant="plan" />
            <BusinessHouseholdLeakCard leak={businessLeak} />

            {assetFilter && filteredHolding ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/40 bg-accent-soft px-4 py-3">
                    <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                        {tHolding('filter_eyebrow')}
                    </p>
                    <HoldingChip assetId={assetFilter} link />
                    <Link
                        href={productPath('money/fixed-costs')}
                        className="ml-auto font-mono text-xs tracking-wide text-accent uppercase hover:underline">
                        {tHolding('filter_clear')}
                    </Link>
                </div>
            ) : null}

            <div data-tour="fixed-tabs">
                <ListToolbar
                    createLabel={tab === 'ERUIT' ? t('add_fixed') : t('add_income')}
                    createHref={
                        tab === 'ERUIT'
                            ? assetFilter
                                ? createFixedHref({ assetId: assetFilter })
                                : CREATE_HREF.fixed
                            : assetFilter
                              ? createIncomeHref({ assetId: assetFilter })
                              : CREATE_HREF.income
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
                    }>
                    {(['ERUIT', 'ERIN'] as const).map(tabKey => (
                        <button
                            key={tabKey}
                            type="button"
                            onClick={() => {
                                exitSelectMode();
                                setTab(tabKey);
                            }}
                            className={cn(
                                'flex items-center gap-2.5 rounded-full border px-4 py-2 font-mono text-xs font-medium tracking-wide uppercase transition-all duration-200',
                                tab === tabKey
                                    ? 'border-accent bg-accent-soft text-accent'
                                    : 'border-line-strong bg-surface text-fg-secondary hover:border-accent hover:text-accent'
                            )}>
                            {tabKey === 'ERUIT' ? t('tab_out') : t('tab_in')}
                            <span
                                className={cn(
                                    'rounded-full px-2 py-0.5 font-mono text-xs',
                                    tab === tabKey
                                        ? 'bg-accent/10 text-accent'
                                        : 'bg-raised text-fg-faint'
                                )}>
                                {tabKey === 'ERUIT' ? formatMoney(outTotal) : formatMoney(NET)}
                            </span>
                        </button>
                    ))}
                </ListToolbar>
            </div>

            {tab === 'ERUIT' && (
                <div data-tour="fixed-list" className="grid gap-5">
                    <div className="grid items-start gap-5 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
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
                                                        onClick={() =>
                                                            setSelectedIds(new Set(dueIds))
                                                        }
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
                                                    onConfirm={() =>
                                                        markPaidMutation.mutate(dueIds)
                                                    }
                                                />
                                            </>
                                        )
                                    ) : null}
                                    <span className="font-mono text-sm text-fg-secondary">
                                        {formatMoney(outTotal)}
                                    </span>
                                </div>
                            </div>

                            <div className="grid">
                                {groupedFixedCosts.length === 0 ? (
                                    <EmptyState
                                        variant="compact"
                                        className="border-0 bg-transparent"
                                        title={
                                            jarFilter ? t('empty_jar_title') : t('empty_all_title')
                                        }
                                        body={jarFilter ? t('empty_jar_body') : t('empty_all_body')}
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
                                                            onClick={() =>
                                                                toggleGroupDue(groupDueIds)
                                                            }
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
                                                            name={group.jar.name}
                                                            icon={group.jar.icon}
                                                        />
                                                        <span className="flex items-center gap-2">
                                                            <span className="font-mono text-[11px] text-fg-faint">
                                                                {formatMoney(
                                                                    -Math.abs(group.monthly)
                                                                )}
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
                                                                      -Math.abs(fixedCost.monthly)
                                                                  )}
                                                                  amountClassName={
                                                                      applies
                                                                          ? undefined
                                                                          : 'text-fg-muted'
                                                                  }
                                                                  badges={
                                                                      <>
                                                                          {due ? (
                                                                              <MetaChip>
                                                                                  {due}
                                                                              </MetaChip>
                                                                          ) : null}
                                                                          <MetaChip>
                                                                              {cadenceLabel(
                                                                                  fixedCost.cadence,
                                                                                  tChips
                                                                              )}
                                                                          </MetaChip>
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
                                                                          Math.abs(
                                                                              fixedCost.amount
                                                                          ) ? (
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
                                                                  selected={
                                                                      selectMode && isSelected
                                                                  }
                                                                  leading={
                                                                      selectMode && isDue ? (
                                                                          <button
                                                                              type="button"
                                                                              data-mutate
                                                                              role="checkbox"
                                                                              aria-checked={
                                                                                  isSelected
                                                                              }
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
                                                                              taken: t(
                                                                                  'status_taken'
                                                                              ),
                                                                              due: t('status_due'),
                                                                              skipped:
                                                                                  t(
                                                                                      'status_skipped'
                                                                                  ),
                                                                              planned:
                                                                                  t(
                                                                                      'status_planned'
                                                                                  ),
                                                                              markPaidAria:
                                                                                  t(
                                                                                      'mark_paid_short'
                                                                                  ),
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
                                                                              markPaidMutation.mutate(
                                                                                  [fixedCost.id]
                                                                              )
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

                            <div className="flex flex-wrap gap-2 border-t border-line px-5 py-4">
                                {splitJars
                                    .filter(
                                        j =>
                                            jarCapabilitiesFor(j.key).allowsFixedCosts &&
                                            fixedCosts.some(fixedCost => fixedCost.jarKey === j.key)
                                    )
                                    .map(j => {
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
                                                    'flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs transition-colors',
                                                    on
                                                        ? 'border-accent bg-accent-soft text-accent'
                                                        : 'border-line-strong bg-surface text-fg-secondary hover:border-accent hover:text-accent'
                                                )}>
                                                <JarMark jarKey={j.key} icon={j.icon} />
                                                {j.name}
                                            </button>
                                        );
                                    })}
                            </div>
                        </Card>

                        <CoachTipCard title={t('coach_subscription_title')}>
                            {t('coach_subscription_body')}
                        </CoachTipCard>
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
                                                                splitJars.find(
                                                                    jar =>
                                                                        jar.key === fixedCost.jarKey
                                                                )?.name ?? fixedCost.jarKey
                                                            }
                                                            icon={
                                                                jarByKey.get(fixedCost.jarKey)?.icon
                                                            }
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
            )}

            {tab === 'ERIN' && (
                <div
                    data-tour="fixed-list"
                    className="grid items-start gap-5 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <Card className="p-0">
                        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                            <Typography as="span" variant="eyebrow" color="primary">
                                ✦ {t('every_month_in')}
                            </Typography>
                            <span className="font-mono text-sm text-success">
                                {formatMoney(NET)}
                            </span>
                        </div>

                        <div className="grid">
                            {visibleIncomeSources.map((source, i) => {
                                const due = formatDueDay(source.dueDay, tChips);
                                return (
                                    <MoneyPartyRow
                                        key={source.id ?? i}
                                        title={source.label}
                                        mark={partyMark(
                                            { name: source.label },
                                            catalogMarkChrome({
                                                billName: source.label,
                                                categoryTemplates,
                                            })
                                        )}
                                        amount={formatMoney(source.monthly)}
                                        amountClassName={
                                            source.applies ? 'text-success' : 'text-fg-muted'
                                        }
                                        badges={
                                            <>
                                                {due ? <MetaChip>{due}</MetaChip> : null}
                                                <MetaChip>
                                                    {cadenceLabel(source.cadence, tChips)}
                                                </MetaChip>
                                                {source.cadence !== Cadence.MONTHLY ? (
                                                    <MetaChip>
                                                        {tChips('amount_per_month', {
                                                            amount: formatMoney(source.monthly),
                                                        })}
                                                    </MetaChip>
                                                ) : null}
                                                <HoldingChip assetId={source.assetId} />
                                                <DepositBankChip
                                                    bankId={source.bankId}
                                                    accountId={source.accountId}
                                                />
                                            </>
                                        }
                                        href={
                                            source.id
                                                ? updateHref('income', source.id)
                                                : CREATE_HREF.income
                                        }
                                        status={
                                            source.applies ? null : (
                                                <FixedCostPeriodStatusControl
                                                    status={FixedCostPeriodStatus.UPCOMING}
                                                    labels={{
                                                        taken: t('status_taken'),
                                                        due: t('status_due'),
                                                        skipped: t('status_skipped'),
                                                        planned: t('status_planned'),
                                                        markPaidAria: t('mark_paid_short'),
                                                        markPaidConfirm: t('mark_paid_confirm'),
                                                        markPaidPending: t('mark_paid_pending'),
                                                    }}
                                                />
                                            )
                                        }
                                    />
                                );
                            })}
                        </div>

                        <div className="border-t border-line px-5 py-4">
                            <Typography as="p" variant="eyebrow" color="muted" className="mb-3">
                                {t('how_split')}
                            </Typography>
                            <div className="flex flex-wrap gap-2">
                                {splitJars.map(j => (
                                    <span
                                        key={j.key}
                                        className="flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 font-mono text-xs text-fg-secondary">
                                        <JarMark jarKey={j.key} icon={j.icon} />
                                        {j.name}
                                        <span className="text-fg-faint">{j.pct}%</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </Card>

                    <CoachTipCard title={t('coach_enough_title')}>
                        {tChips('amount_per_month', { amount: formatMoney(NET) })}.{' '}
                        {t('coach_enough_ratio_line', { ratio: commitmentRatio })}{' '}
                        {commitmentRatio < 50
                            ? t('coach_enough_comfortable')
                            : commitmentRatio <= 55
                              ? t('coach_enough_edge')
                              : t('coach_enough_above')}
                        .{' '}
                        {commitmentRatio > 55 ? t('coach_enough_simplify') : t('coach_enough_room')}
                    </CoachTipCard>
                </div>
            )}
        </div>
    );
}
