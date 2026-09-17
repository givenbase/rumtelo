'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import type { Debt } from '@rumtelo/contracts';
import { JarKey, PayoffStrategy } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { AccentCard, Card, Eyebrow } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { CREATE_HREF } from '@/app/_lib/create-routes';
import {
    formatDebtFreeMonth,
    orderDebtsByStrategy,
    payoffStrategyLabel,
    rankPayoffStrategies,
    simulatePayoff,
} from '@/app/_lib/debt-payoff';
import { catalogMarkChrome } from '@/app/_lib/party-mark-chrome';
import { isLiveData } from '@/app/_lib/preview';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
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

const PAGE_TABS: ReadonlyArray<{ key: DebtPageTab; label: string }> = [
    { key: 'debts', label: 'Debts' },
    { key: 'compare', label: 'Compare' },
];

const DEBT_FILTERS: ReadonlyArray<{ key: DebtFilter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'expensive', label: 'Expensive' },
    { key: 'lower', label: 'Lower rate' },
];

const DEBT_SORTS: ReadonlyArray<{ key: DebtSort; label: string }> = [
    { key: 'payoff', label: 'Payoff order' },
    { key: 'rate', label: 'Highest rate' },
    { key: 'balance-high', label: 'Highest balance' },
    { key: 'balance-low', label: 'Lowest balance' },
    { key: 'minimum', label: 'Highest minimum' },
];

function isDebtSort(value: string): value is DebtSort {
    return DEBT_SORTS.some(option => option.key === value);
}

const STRATEGY_OPTIONS = [
    {
        key: PayoffStrategy.AVALANCHE,
        name: 'Avalanche',
        promise: 'Pay the least interest',
        rule: 'Extra goes to the highest interest first.',
    },
    {
        key: PayoffStrategy.SNOWBALL,
        name: 'Snowball',
        promise: 'Clear a small debt first',
        rule: 'Extra goes to the smallest balance first.',
    },
    {
        key: PayoffStrategy.MINIMAL,
        name: 'Minimal only',
        promise: 'Minimums only',
        rule: 'No extra — each debt gets its minimum.',
    },
] as const;

export function DebtsPageClient() {
    const { householdId } = useAuth();
    const router = useRouter();
    const { formatMoney } = useHouseholdCurrency();
    const [tab, setTab] = useState<DebtPageTab>('debts');
    const [extra, setExtra] = useState(30_000);
    const [filter, setFilter] = useState<DebtFilter>('all');
    const [sort, setSort] = useState<DebtSort>('payoff');
    const live = isLiveData(householdId);

    const EXTRA_OPTIONS = EXTRA_OPTION_VALUES.map(value => ({
        label: value === 0 ? 'Minimum only' : `+ ${formatMoney(value)}`,
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

    const debts = useMemo((): ReadonlyArray<Debt> => debtsQuery.data ?? [], [debtsQuery.data]);

    const total = debts.reduce((running, debt) => running + debt.balance, 0);
    const monthly = debts.reduce((running, debt) => running + debt.minimumPayment, 0);
    const liveExtra = debts.reduce((running, debt) => running + (debt.extraPayment ?? 0), 0);
    const extraForSim = live ? liveExtra : extra;
    const hasExtra = extraForSim > 0;

    const comparisons = useMemo(() => {
        const simulated = STRATEGY_OPTIONS.map(option => {
            const simExtra = option.key === PayoffStrategy.MINIMAL ? 0 : extraForSim;
            const result = simulatePayoff(debts, option.key, simExtra);
            return { ...option, ...result };
        });
        const ranked = rankPayoffStrategies(simulated);
        return simulated.map((option, index) => ({ ...option, ...ranked[index]! }));
    }, [debts, extraForSim]);

    const selected = comparisons.find(option => option.key === strategy) ?? comparisons[0]!;
    const payoffOrdered = useMemo(() => orderDebtsByStrategy(debts, strategy), [debts, strategy]);
    const focusDebt = strategy === PayoffStrategy.MINIMAL ? null : (payoffOrdered[0] ?? null);
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

    const showPayoffRanks = sort === 'payoff' && strategy !== PayoffStrategy.MINIMAL;
    const listTitle =
        sort === 'payoff'
            ? strategy === PayoffStrategy.MINIMAL
                ? '✦ Your debts · no focus order'
                : `✦ Payoff order · ${payoffStrategyLabel(strategy)}`
            : `✦ Your debts · ${DEBT_SORTS.find(option => option.key === sort)?.label ?? 'sorted'}`;

    return (
        <div className="grid animate-rise gap-8">
            <div>
                <span className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
                    ✦ DEBT
                </span>
                <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg lg:text-4xl">
                    Debt-free by {freedomDate}.
                </h1>
                <p className="mt-2 max-w-prose text-base text-pretty text-fg-muted">
                    Pay every minimum. Your household method decides where any extra goes — set once
                    in Settings.
                </p>
            </div>

            <ListToolbar createLabel="+ Add debt" onCreate={() => router.push(CREATE_HREF.debt)}>
                {PAGE_TABS.map(option => (
                    <ListToolbarTab
                        key={option.key}
                        active={tab === option.key}
                        onClick={() => setTab(option.key)}>
                        {option.label}
                        {option.key === 'debts' && debts.length > 0 ? (
                            <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-xs text-accent">
                                {debts.length}
                            </span>
                        ) : null}
                    </ListToolbarTab>
                ))}
            </ListToolbar>

            <AccentCard tint="var(--color-accent)">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                        <div className="grid gap-0.5">
                            <Eyebrow>Total debt</Eyebrow>
                            <p className="font-display text-xl font-semibold text-fg tabular-nums lg:text-2xl">
                                {formatMoney(total)}
                            </p>
                        </div>
                        <div className="grid gap-0.5">
                            <Eyebrow>Minimum /mo</Eyebrow>
                            <p className="font-display text-xl font-semibold text-fg tabular-nums lg:text-2xl">
                                {formatMoney(monthly)}
                            </p>
                        </div>
                        <div className="grid gap-0.5">
                            <Eyebrow>Interest</Eyebrow>
                            <p className="font-display text-xl font-semibold text-fg tabular-nums lg:text-2xl">
                                {formatMoney(selected.interest)}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
                        <div className="grid gap-0.5">
                            <Eyebrow>Payoff method</Eyebrow>
                            <p className="text-sm text-fg">
                                <span className="font-medium text-accent">
                                    {payoffStrategyLabel(strategy)}
                                </span>
                                {strategy === PayoffStrategy.MINIMAL
                                    ? ' · mins only'
                                    : focusDebt
                                      ? ` · ${focusDebt.name}`
                                      : null}
                            </p>
                            {hasExtra ? (
                                <p className="font-mono text-[10px] text-fg-faint">
                                    {formatMoney(extraForSim)} extra /mo
                                </p>
                            ) : null}
                        </div>
                    </div>
                </div>

                {!live && tab === 'compare' ? (
                    <div className="mt-4 border-t border-line pt-3">
                        <Eyebrow className="mb-2">
                            Extra /mo · {extra > 0 ? formatMoney(extra) : 'none'}
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
                    debts={debts}
                    strategy={strategy}
                    comparisons={comparisons}
                    hasExtra={hasExtra}
                    extraLabel={hasExtra ? formatMoney(extraForSim) : null}
                    formatMoney={formatMoney}
                />
            ) : (
                <div className="grid gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
                            {listTitle}
                        </span>
                        <label className="flex items-center gap-2 text-xs text-fg-muted">
                            <span className="font-mono text-[10px] tracking-widest uppercase">
                                Sort
                            </span>
                            <select
                                value={sort}
                                onChange={event => {
                                    const next = event.target.value;
                                    if (isDebtSort(next)) setSort(next);
                                }}
                                aria-label="Sort debts"
                                className="rounded-lg border border-line bg-raised px-2.5 py-1.5 font-mono text-[10px] tracking-wide text-fg uppercase outline-none focus:border-accent">
                                {DEBT_SORTS.map(option => (
                                    <option key={option.key} value={option.key}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter debts">
                        {DEBT_FILTERS.map(option => (
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
                        <p className="text-xs text-fg-muted">
                            #1 gets the extra until it is gone, then #2, and so on.
                        </p>
                    ) : null}

                    <Card className="p-0">
                        <div className="grid gap-3 p-5">
                            {visibleDebts.length === 0 ? (
                                <p className="text-sm text-fg-muted">
                                    {debts.length === 0
                                        ? 'No open debts yet.'
                                        : 'No debts match this filter.'}
                                </p>
                            ) : (
                                visibleDebts.map(debt => {
                                    const payoffRank = payoffOrdered.findIndex(
                                        entry => entry.id === debt.id
                                    );
                                    const isFocus = showPayoffRanks && hasExtra && payoffRank === 0;
                                    return (
                                        <DebtListRow
                                            key={debt.id}
                                            debt={debt}
                                            merchants={merchants}
                                            payoffRank={payoffRank}
                                            showPayoffRanks={showPayoffRanks}
                                            isFocus={isFocus}
                                            markChrome={debtChrome}
                                        />
                                    );
                                })
                            )}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
