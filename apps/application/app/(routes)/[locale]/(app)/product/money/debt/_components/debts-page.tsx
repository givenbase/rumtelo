'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { useMemo, useState } from 'react';

import type { Debt } from '@rumtelo/contracts';
import { JarKey, PayoffStrategy } from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { useLiveQuery } from '@rumtelo/hooks';
import { AccentCard, Card, EmptyState, Eyebrow, Typography } from '@rumtelo/ui';
import { cn, describePeriodTravel, projectBalancesAfterMonths } from '@rumtelo/utils';

import { CREATE_HREF } from '@/app/_lib/create-routes';
import { formatPeriodTravelLabels } from '@/app/_lib/period-travel-i18n';
import {
    formatClearedMonth,
    formatDebtFreeMonth,
    orderDebtsByStrategy,
    payoffStrategyLabel,
    rankPayoffStrategies,
    simulatePayoff,
} from '@/app/_lib/debt-payoff';
import { catalogMarkChrome } from '@/app/_lib/party-mark-chrome';
import { isLiveData } from '@/app/_lib/preview';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { ListToolbar, ListToolbarTab } from '@/components/layout/list-toolbar';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { DebtListRow } from './debt-list-row';
import { DebtStrategyCoach } from './debt-strategy-coach';

/** Raw extra-payment values; labels are built inside the component with the bound formatter. */
const EXTRA_OPTION_VALUES = [0, 5_000, 10_000, 20_000, 30_000, 50_000];

/** Matches the danger badge threshold on each debt row. */
const EXPENSIVE_RATE = 10;

type DebtPageTab = 'debts' | 'compare';
type DebtFilter = 'all' | 'expensive' | 'lower';
type DebtSort = 'payoff' | 'rate' | 'balance-high' | 'balance-low' | 'minimum';

function isDebtSort(value: string): value is DebtSort {
    return (
        value === 'payoff' ||
        value === 'rate' ||
        value === 'balance-high' ||
        value === 'balance-low' ||
        value === 'minimum'
    );
}

export function DebtsPageClient() {
    const t = useTranslations('features.money.debt');
    const tShell = useTranslations('pages.shell');
    const pageTabs: ReadonlyArray<{ key: DebtPageTab; label: string }> = [
        { key: 'debts', label: t('tab_debts') },
        { key: 'compare', label: t('tab_compare') },
    ];
    const debtFilters: ReadonlyArray<{ key: DebtFilter; label: string }> = [
        { key: 'all', label: t('filter_all') },
        { key: 'expensive', label: t('filter_expensive') },
        { key: 'lower', label: t('filter_lower') },
    ];
    const debtSorts: ReadonlyArray<{ key: DebtSort; label: string }> = [
        { key: 'payoff', label: t('sort_payoff') },
        { key: 'rate', label: t('sort_rate') },
        { key: 'balance-high', label: t('sort_balance_high') },
        { key: 'balance-low', label: t('sort_balance_low') },
        { key: 'minimum', label: t('sort_minimum') },
    ];
    const strategyOptions = [
        {
            key: PayoffStrategy.AVALANCHE,
            name: t('strategy_avalanche'),
            promise: t('strategy_avalanche_promise'),
            rule: t('strategy_avalanche_rule'),
        },
        {
            key: PayoffStrategy.SNOWBALL,
            name: t('strategy_snowball'),
            promise: t('strategy_snowball_promise'),
            rule: t('strategy_snowball_rule'),
        },
        {
            key: PayoffStrategy.MINIMAL,
            name: t('strategy_minimal'),
            promise: t('strategy_minimal_promise'),
            rule: t('strategy_minimal_rule'),
        },
    ] as const;
    const { householdId } = useAuth();
    const { period } = useAppShell();
    const { formatMoney } = useHouseholdCurrency();
    const appLocale = useLocale();
    const [tab, setTab] = useState<DebtPageTab>('debts');
    const [extra, setExtra] = useState(30_000);
    const [filter, setFilter] = useState<DebtFilter>('all');
    const [sort, setSort] = useState<DebtSort>('payoff');
    const live = isLiveData(householdId);
    const travel = describePeriodTravel(period);
    const travelLabels = formatPeriodTravelLabels(travel, tShell);
    const lookingAhead = travel.direction === 'future';
    const monthsAhead = Math.max(0, travel.monthsDelta);

    const EXTRA_OPTIONS = EXTRA_OPTION_VALUES.map(value => ({
        label: value === 0 ? t('minimum_only') : t('extra_plus', { amount: formatMoney(value) }),
        value,
    }));

    const debtsQuery = useLiveQuery(
        apiQuery.money.debts.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );

    const settingsQuery = useLiveQuery(
        apiQuery.household.settings.queryOptions({ input: { householdId: householdId! } }),
        null as never,
        live
    );

    const merchantsQuery = useLiveQuery(
        apiQuery.money.catalogs.merchantPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live
    );
    const merchants = merchantsQuery.data ?? [];
    const { byKey: jarByKey } = useJarCatalog();
    const debtChrome = catalogMarkChrome({
        jarKey: JarKey.NECESSITIES,
        jarByKey,
    });

    const strategy = settingsQuery.data?.money?.payoffStrategy ?? PayoffStrategy.AVALANCHE;

    const debtsLive = useMemo((): ReadonlyArray<Debt> => debtsQuery.data ?? [], [debtsQuery.data]);

    const liveExtra = debtsLive.reduce((running, debt) => running + (debt.extraPayment ?? 0), 0);
    const extraForSim = live ? liveExtra : extra;
    const hasExtra = extraForSim > 0;

    /** Looking Ahead: balances after N months of the household payoff plan. */
    const projected = useMemo(() => {
        if (!lookingAhead || debtsLive.length === 0) return null;
        return projectBalancesAfterMonths(
            debtsLive,
            monthsAhead,
            strategy,
            strategy === PayoffStrategy.MINIMAL ? 0 : extraForSim
        );
    }, [lookingAhead, debtsLive, monthsAhead, strategy, extraForSim]);

    const debts = useMemo((): ReadonlyArray<
        Debt & { clearedByPeriod?: boolean; clearedOn?: Date | null }
    > => {
        if (!projected) return debtsLive;
        return debtsLive.map((debt, index) => {
            const remaining = projected.balances[index] ?? debt.balance;
            return {
                ...debt,
                balance: remaining,
                clearedByPeriod: remaining <= 0.5,
                clearedOn: projected.clearedOn[index] ?? null,
            };
        });
    }, [debtsLive, projected]);

    const totalLive = debtsLive.reduce((running, debt) => running + debt.balance, 0);
    const total = debts.reduce((running, debt) => running + debt.balance, 0);
    const monthly = debtsLive.reduce((running, debt) => running + debt.minimumPayment, 0);
    const clearedCount = debts.filter(debt => debt.clearedByPeriod).length;

    const comparisons = useMemo(() => {
        const simulated = strategyOptions.map(option => {
            const simExtra = option.key === PayoffStrategy.MINIMAL ? 0 : extraForSim;
            const result = simulatePayoff(debtsLive, option.key, simExtra);
            return { ...option, ...result };
        });
        const ranked = rankPayoffStrategies(simulated);
        return simulated.map((option, index) => ({ ...option, ...ranked[index]! }));
    }, [debtsLive, extraForSim, strategyOptions]);

    const selected = comparisons.find(option => option.key === strategy) ?? comparisons[0]!;
    const payoffOrdered = useMemo(() => orderDebtsByStrategy(debts, strategy), [debts, strategy]);
    const openOrdered = useMemo(
        () => payoffOrdered.filter(debt => !debt.clearedByPeriod),
        [payoffOrdered]
    );
    const focusDebt = strategy === PayoffStrategy.MINIMAL ? null : (openOrdered[0] ?? null);
    const freedomDate = formatDebtFreeMonth(selected.debtFreeOn);

    const visibleDebts = useMemo(() => {
        const filtered = debts.filter(debt => {
            if (filter === 'expensive') return debt.interestRate >= EXPENSIVE_RATE;
            if (filter === 'lower') return debt.interestRate < EXPENSIVE_RATE;
            return true;
        });

        if (sort === 'payoff') {
            const allowed = new Set(filtered.map(debt => debt.id));
            return payoffOrdered.filter(debt => allowed.has(debt.id));
        }

        const list = [...filtered];
        switch (sort) {
            case 'rate':
                return list.sort((left, right) => right.interestRate - left.interestRate);
            case 'balance-high':
                return list.sort((left, right) => right.balance - left.balance);
            case 'balance-low':
                return list.sort((left, right) => left.balance - right.balance);
            case 'minimum':
                return list.sort((left, right) => right.minimumPayment - left.minimumPayment);
            default:
                return list;
        }
    }, [debts, filter, sort, payoffOrdered]);

    const baselineById = useMemo(
        () => new Map(debtsLive.map(debt => [debt.id, debt.balance] as const)),
        [debtsLive]
    );

    const showPayoffRanks = sort === 'payoff' && strategy !== PayoffStrategy.MINIMAL;
    const listTitle =
        sort === 'payoff'
            ? strategy === PayoffStrategy.MINIMAL
                ? t('list_no_focus')
                : t('list_payoff', { strategy: payoffStrategyLabel(strategy, t) })
            : t('list_sorted', {
                  sort: debtSorts.find(option => option.key === sort)?.label ?? t('sort_fallback'),
              });

    const openDebtCount = debts.filter(debt => !debt.clearedByPeriod).length;

    return (
        <div className="grid animate-rise gap-8">
            <div>
                <Typography as="span" variant="eyebrow" color="primary">
                    ✦ {t('eyebrow')}
                    {lookingAhead ? ` · ${travelLabels.relativeLabel}` : ''}
                </Typography>
                <Typography as="h1" className="mt-2">
                    {lookingAhead && projected?.cleared
                        ? t('title_free_then')
                        : t('title_free', { date: freedomDate })}
                </Typography>
                <Typography as="p" variant="lead" size="default" className="mt-2">
                    {lookingAhead
                        ? t(monthsAhead === 1 ? 'lead_ahead' : 'lead_ahead_plural', {
                              months: monthsAhead,
                              strategy: payoffStrategyLabel(strategy, t),
                              extra: hasExtra
                                  ? t('extra_suffix', { amount: formatMoney(extraForSim) })
                                  : '',
                          })
                        : t('lead_current')}
                </Typography>
                {lookingAhead && clearedCount > 0 ? (
                    <Typography as="p" size="sm" color="muted" className="mt-1.5">
                        {openDebtCount > 0
                            ? t(clearedCount === 1 ? 'cleared_summary' : 'cleared_summary_plural', {
                                  count: clearedCount,
                                  open: openDebtCount,
                              })
                            : t(clearedCount === 1 ? 'cleared_only' : 'cleared_only_plural', {
                                  count: clearedCount,
                              })}
                    </Typography>
                ) : null}
            </div>

            <ListToolbar createLabel={t('add_debt')} createHref={CREATE_HREF.debt}>
                {pageTabs.map(option => (
                    <ListToolbarTab
                        key={option.key}
                        active={tab === option.key}
                        onClick={() => setTab(option.key)}>
                        {option.label}
                        {option.key === 'debts' && debtsLive.length > 0 ? (
                            <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-xs text-accent">
                                {lookingAhead
                                    ? `${openDebtCount}/${debtsLive.length}`
                                    : debtsLive.length}
                            </span>
                        ) : null}
                    </ListToolbarTab>
                ))}
            </ListToolbar>

            <AccentCard tint="var(--color-accent)">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                        <div className="grid gap-0.5">
                            <Eyebrow>
                                {lookingAhead ? t('remaining_then') : t('total_debt')}
                            </Eyebrow>
                            <p className="font-display text-xl font-semibold text-fg tabular-nums lg:text-2xl">
                                {lookingAhead && total !== totalLive ? (
                                    <>
                                        <span className="text-fg-faint">
                                            {formatMoney(totalLive)}
                                        </span>
                                        <span className="mx-1.5 text-fg-faint">→</span>
                                        <span className="text-success">{formatMoney(total)}</span>
                                    </>
                                ) : (
                                    formatMoney(total)
                                )}
                            </p>
                        </div>
                        <div className="grid gap-0.5">
                            <Eyebrow>{t('minimum_mo')}</Eyebrow>
                            <p className="font-display text-xl font-semibold text-fg tabular-nums lg:text-2xl">
                                {formatMoney(monthly)}
                            </p>
                        </div>
                        <div className="grid gap-0.5">
                            <Eyebrow>{t('interest')}</Eyebrow>
                            <p className="font-display text-xl font-semibold text-fg tabular-nums lg:text-2xl">
                                {formatMoney(selected.interest)}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
                        <div className="grid gap-0.5">
                            <Eyebrow>{t('payoff_method')}</Eyebrow>
                            <p className="text-sm text-fg">
                                <span className="font-medium text-accent">
                                    {payoffStrategyLabel(strategy, t)}
                                </span>
                                {strategy === PayoffStrategy.MINIMAL
                                    ? t('mins_only')
                                    : focusDebt
                                      ? ` · ${focusDebt.name}`
                                      : lookingAhead && projected?.cleared
                                        ? t('all_clear')
                                        : null}
                            </p>
                            {hasExtra ? (
                                <p className="font-mono text-[10px] text-fg-faint">
                                    {t('extra_mo', { amount: formatMoney(extraForSim) })}
                                </p>
                            ) : null}
                        </div>
                    </div>
                </div>

                {!live && tab === 'compare' ? (
                    <div className="mt-4 border-t border-line pt-3">
                        <Eyebrow className="mb-2">
                            {t('extra_label', {
                                amount: extra > 0 ? formatMoney(extra) : t('extra_none'),
                            })}
                        </Eyebrow>
                        <div className="flex flex-wrap gap-2">
                            {EXTRA_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setExtra(opt.value)}
                                    className={cn(
                                        'rounded-full border px-3 py-1.5 font-mono text-[10px] font-medium tracking-widest transition-all duration-200',
                                        extra === opt.value
                                            ? 'border-accent/40 bg-accent-soft text-accent'
                                            : 'border-line text-fg-muted hover:border-accent-hover hover:text-accent'
                                    )}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}
            </AccentCard>

            {tab === 'compare' ? (
                <DebtStrategyCoach
                    debts={debtsLive}
                    strategy={strategy}
                    comparisons={comparisons}
                    hasExtra={hasExtra}
                    extraLabel={hasExtra ? formatMoney(extraForSim) : null}
                    formatMoney={formatMoney}
                />
            ) : (
                <div className="grid gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Typography as="span" variant="eyebrow" color="primary">
                            {listTitle}
                        </Typography>
                        <label className="flex items-center gap-2 text-xs text-fg-muted">
                            <span className="font-mono text-[10px] tracking-widest uppercase">
                                {t('sort_label')}
                            </span>
                            <select
                                value={sort}
                                onChange={event => {
                                    const next = event.target.value;
                                    if (isDebtSort(next)) setSort(next);
                                }}
                                aria-label={t('sort_aria')}
                                className="rounded-lg border border-line bg-raised px-2.5 py-1.5 font-mono text-[10px] tracking-wide text-fg uppercase outline-none focus:border-accent">
                                {debtSorts.map(option => (
                                    <option key={option.key} value={option.key}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div
                        className="flex flex-wrap gap-1.5"
                        role="group"
                        aria-label={t('filter_aria')}>
                        {debtFilters.map(option => (
                            <button
                                key={option.key}
                                type="button"
                                aria-pressed={filter === option.key}
                                onClick={() => setFilter(option.key)}
                                className={cn(
                                    'rounded-full border px-3 py-1.5 font-mono text-[10px] font-medium tracking-widest uppercase transition-all duration-200',
                                    filter === option.key
                                        ? 'border-accent/40 bg-accent-soft text-accent'
                                        : 'border-line text-fg-muted hover:border-accent-hover hover:text-accent'
                                )}>
                                {option.label}
                            </button>
                        ))}
                    </div>

                    {showPayoffRanks && focusDebt && hasExtra ? (
                        <Typography as="p" size="xs" color="muted">
                            {t('payoff_hint')}
                        </Typography>
                    ) : null}

                    {visibleDebts.length === 0 ? (
                        <EmptyState
                            icon="↓"
                            title={debtsLive.length === 0 ? t('empty_title') : t('empty_filter')}
                            body={debtsLive.length === 0 ? t('empty_body') : t('empty_filter_body')}
                        />
                    ) : (
                        <Card className="p-0">
                            <div className="grid gap-3 p-5">
                                {visibleDebts.map(debt => {
                                    const payoffRank = openOrdered.findIndex(
                                        entry => entry.id === debt.id
                                    );
                                    const isFocus =
                                        showPayoffRanks &&
                                        hasExtra &&
                                        !debt.clearedByPeriod &&
                                        payoffRank === 0;
                                    return (
                                        <DebtListRow
                                            key={debt.id}
                                            debt={debt}
                                            merchants={merchants}
                                            payoffRank={debt.clearedByPeriod ? -1 : payoffRank}
                                            showPayoffRanks={showPayoffRanks}
                                            isFocus={isFocus}
                                            markChrome={debtChrome}
                                            baselineBalance={
                                                lookingAhead
                                                    ? (baselineById.get(debt.id) ?? null)
                                                    : null
                                            }
                                            clearedByPeriod={Boolean(debt.clearedByPeriod)}
                                            clearedOnLabel={
                                                debt.clearedOn
                                                    ? formatClearedMonth(debt.clearedOn, appLocale)
                                                    : null
                                            }
                                        />
                                    );
                                })}
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
