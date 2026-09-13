'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { PayoffStrategy } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { AccentCard, Badge, Card, Eyebrow } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { CREATE_HREF, updateHref } from '@/app/_lib/create-routes';
import {
    formatDebtFreeMonth,
    orderDebtsByStrategy,
    payoffOrdersMatch,
    payoffStrategyLabel,
    rankPayoffStrategies,
    simulatePayoff,
} from '@/app/_lib/debt-payoff';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { ListToolbar } from '@/components/layout/list-toolbar';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

/** Raw extra-payment values; labels are built inside the component with the bound formatter. */
const EXTRA_OPTION_VALUES = [0, 5_000, 10_000, 20_000, 30_000, 50_000];

const STRATEGY_OPTIONS = [
    {
        key: PayoffStrategy.AVALANCHE,
        name: 'Avalanche',
        promise: 'Save the most money',
        rule: 'Send every extra euro to the highest interest rate.',
    },
    {
        key: PayoffStrategy.SNOWBALL,
        name: 'Snowball',
        promise: 'Clear a debt sooner',
        rule: 'Send every extra euro to the smallest balance.',
    },
    {
        key: PayoffStrategy.MINIMAL,
        name: 'Minimal only',
        promise: 'Pay only what you must',
        rule: 'No extra — each debt gets its minimum, nothing more.',
    },
] as const;

export function DebtsPageClient() {
    const { householdId } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { showToast } = useAppShell();
    const { formatMoney } = useHouseholdCurrency();
    const [extra, setExtra] = useState(30_000);
    const [localStrategy, setLocalStrategy] = useState(PayoffStrategy.AVALANCHE);
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

    const strategy =
        live && settingsQuery.data?.money?.payoffStrategy
            ? settingsQuery.data.money.payoffStrategy
            : localStrategy;

    const saveStrategy = useMutation({
        mutationFn: async (next: PayoffStrategy) => {
            if (!householdId) throw new Error('No household');
            return api.household.updateSettings({
                householdId,
                money: { payoffStrategy: next },
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.household.settings.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.debts.plan.key() });
            showToast('Payoff method saved', 'success');
        },
        onError: () => showToast('Payoff method save failed', 'error'),
    });

    const debts = (debtsQuery.data ?? []) as ReadonlyArray<{
        id: string;
        name: string;
        kind: string;
        balance: number;
        interestRate: number;
        minimumPayment: number;
        extraPayment?: number;
    }>;

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
    const avalanche = comparisons.find(option => option.key === PayoffStrategy.AVALANCHE);
    const snowball = comparisons.find(option => option.key === PayoffStrategy.SNOWBALL);
    const minimal = comparisons.find(option => option.key === PayoffStrategy.MINIMAL);
    const ordered = orderDebtsByStrategy(debts, strategy);
    const avalancheOrder = orderDebtsByStrategy(debts, PayoffStrategy.AVALANCHE);
    const snowballOrder = orderDebtsByStrategy(debts, PayoffStrategy.SNOWBALL);
    const sameAttackOrder = payoffOrdersMatch(debts);
    const focusDebt = strategy === PayoffStrategy.MINIMAL ? null : ordered[0] ?? null;

    const freedomDate = formatDebtFreeMonth(selected.debtFreeOn);
    const extraLabel = hasExtra ? formatMoney(extraForSim) : null;

    const compareIntro = (() => {
        if (debts.length === 0) {
            return 'Add debts first — then choose where any extra payment should go.';
        }
        if (debts.length === 1) {
            return 'With one debt there is only one place for extra to go. Add a second debt to see Avalanche and Snowball differ.';
        }
        if (!hasExtra && strategy !== PayoffStrategy.MINIMAL) {
            return 'You pay every minimum either way. The method only matters when you add extra — that extra is what jumps to #1 below.';
        }
        if (sameAttackOrder && avalancheOrder[0]) {
            return `Not a bug: ${avalancheOrder[0].name} is both your highest rate (${avalancheOrder[0].interestRate}%) and your smallest balance (${formatMoney(avalancheOrder[0].balance)}). Avalanche and Snowball therefore run the exact same months — month 1 through done. The only different plan is Minimal.`;
        }
        const av = avalancheOrder[0]?.name;
        const sn = snowballOrder[0]?.name;
        if (av && sn && avalanche && snowball && minimal) {
            const saveVsMinimal = formatMoney(
                Math.max(0, minimal.interest - Math.min(avalanche.interest, snowball.interest))
            );
            return `Pick where ${extraLabel ?? 'extra'} goes after minimums: Avalanche → ${av}, Snowball → ${sn}, or Minimal → nowhere. Beating Minimal can save about ${saveVsMinimal}.`;
        }
        return 'Pick where your extra goes after minimums. That single choice is the whole method.';
    })();

    const pickStrategy = (next: PayoffStrategy) => {
        if (live) {
            if (next === strategy || saveStrategy.isPending) return;
            saveStrategy.mutate(next);
            return;
        }
        setLocalStrategy(next);
    };

    /** When A/S share a path, only show two real outcomes — not three identical-looking cards. */
    const choiceCards = sameAttackOrder
        ? comparisons.filter(
              option =>
                  option.key === PayoffStrategy.MINIMAL ||
                  option.key ===
                      (strategy === PayoffStrategy.SNOWBALL
                          ? PayoffStrategy.SNOWBALL
                          : PayoffStrategy.AVALANCHE)
          )
        : comparisons;

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
                    Pay every minimum. Then choose where any extra money goes — that is the only
                    real difference between methods.
                </p>
            </div>

            <ListToolbar createLabel="+ Add debt" onCreate={() => router.push(CREATE_HREF.debt)} />

            <AccentCard tint="var(--color-accent)">
                <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
                    <div className="grid gap-1.5">
                        <Eyebrow>Total debt</Eyebrow>
                        <p className="font-display text-2xl font-semibold text-fg tabular-nums">
                            {formatMoney(total)}
                        </p>
                    </div>
                    <div className="grid gap-1.5">
                        <Eyebrow>Minimum /mo</Eyebrow>
                        <p className="font-display text-2xl font-semibold text-fg tabular-nums">
                            {formatMoney(monthly)}
                        </p>
                    </div>
                    <div className="grid gap-1.5">
                        <Eyebrow>Interest · {payoffStrategyLabel(strategy)}</Eyebrow>
                        <p className="font-display text-2xl font-semibold text-fg tabular-nums">
                            {formatMoney(selected.interest)}
                        </p>
                    </div>
                </div>

                {!live && (
                    <div className="mt-5 border-t border-line pt-4">
                        <Eyebrow className="mb-3">
                            Extra /mo · {extra > 0 ? formatMoney(extra) : 'none'} — this is what the
                            method aims
                        </Eyebrow>
                        <div className="flex flex-wrap gap-2">
                            {EXTRA_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setExtra(opt.value)}
                                    className={cn(
                                        'rounded-full border px-3.5 py-2 font-mono text-xs font-medium tracking-widest transition-all duration-200',
                                        extra === opt.value
                                            ? 'border-accent/40 bg-accent-soft text-accent'
                                            : 'border-line text-fg-muted hover:border-accent-hover hover:text-accent'
                                    )}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </AccentCard>

            <section className="grid gap-3" aria-label="Choose payoff method">
                <div className="grid gap-1.5">
                    <span className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
                        ✦{' '}
                        {sameAttackOrder
                            ? 'Your real choice · extra vs no extra'
                            : 'Choose where extra goes'}
                    </span>
                    <p className="max-w-2xl text-sm leading-relaxed text-pretty text-fg-secondary">
                        {compareIntro}
                    </p>
                </div>

                <div
                    className={cn(
                        'grid gap-2',
                        sameAttackOrder ? 'sm:grid-cols-2' : 'sm:grid-cols-3'
                    )}
                    role="radiogroup"
                    aria-label="Payoff method">
                    {(sameAttackOrder ? choiceCards : comparisons).map(option => {
                        const focusedOn =
                            option.key === PayoffStrategy.MINIMAL
                                ? strategy === PayoffStrategy.MINIMAL
                                : strategy !== PayoffStrategy.MINIMAL;
                        const on = sameAttackOrder ? focusedOn : option.key === strategy;
                        const firstTarget =
                            option.key === PayoffStrategy.MINIMAL
                                ? null
                                : orderDebtsByStrategy(debts, option.key)[0];
                        const isFocusedBundle =
                            sameAttackOrder && option.key !== PayoffStrategy.MINIMAL;
                        const title = isFocusedBundle ? 'Focused payoff' : option.name;
                        const promise = isFocusedBundle
                            ? 'Put extra on #1 until it is gone'
                            : option.promise;
                        const rule = isFocusedBundle
                            ? `Avalanche and Snowball both start with ${firstTarget?.name ?? 'the same debt'} on your list — so the calculator runs identical months.`
                            : option.rule;
                        const outcome = (() => {
                            if (option.key === PayoffStrategy.MINIMAL) {
                                return option.interestDelta > 0
                                    ? `Costs ${formatMoney(option.interestDelta)} more`
                                    : 'Baseline';
                            }
                            if (sameAttackOrder) {
                                return `Saves ${formatMoney(minimal?.interestDelta ?? 0)} vs Minimal`;
                            }
                            if (option.winsInterest && option.winsTime) return 'Cheapest & soonest';
                            if (option.winsInterest) return 'Cheapest interest';
                            if (option.winsTime) return 'Soonest free';
                            if (option.interestDelta > 0) {
                                return `+${formatMoney(option.interestDelta)} vs best`;
                            }
                            return 'Solid pick';
                        })();

                        return (
                            <button
                                key={option.key}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                aria-label={`Choose ${title}`}
                                disabled={live && saveStrategy.isPending}
                                onClick={() => {
                                    if (sameAttackOrder) {
                                        pickStrategy(
                                            option.key === PayoffStrategy.MINIMAL
                                                ? PayoffStrategy.MINIMAL
                                                : strategy === PayoffStrategy.SNOWBALL
                                                  ? PayoffStrategy.SNOWBALL
                                                  : PayoffStrategy.AVALANCHE
                                        );
                                        return;
                                    }
                                    pickStrategy(option.key);
                                }}
                                className={cn(
                                    'rounded-lg border border-l-4 bg-surface p-3.5 text-left shadow-sm transition-colors',
                                    on
                                        ? 'border-accent/40 border-l-accent ring-1 ring-accent/20'
                                        : 'border-line border-l-fg-muted/40 hover:border-accent-hover'
                                )}>
                                <div className="mb-2 grid gap-0.5">
                                    <span className="flex items-center gap-2">
                                        <span
                                            className={cn(
                                                'grid size-3.5 shrink-0 place-items-center rounded-full border',
                                                on ? 'border-accent' : 'border-line'
                                            )}>
                                            <span
                                                className={cn(
                                                    'size-1.5 rounded-full',
                                                    on ? 'bg-accent' : 'bg-transparent'
                                                )}
                                            />
                                        </span>
                                        <span
                                            className={cn(
                                                'font-mono text-[10px] font-medium tracking-wide uppercase',
                                                on ? 'text-accent' : 'text-fg-muted'
                                            )}>
                                            {title}
                                        </span>
                                    </span>
                                    <span className="pl-5.5 text-sm font-medium text-fg">
                                        {promise}
                                    </span>
                                </div>

                                <p className="mb-2 text-[11px] leading-snug text-pretty text-fg-muted">
                                    {rule}
                                </p>

                                <div className="mb-2.5 rounded-md bg-raised px-2.5 py-2">
                                    <div className="font-mono text-[9px] tracking-wider text-fg-faint uppercase">
                                        Extra goes to
                                    </div>
                                    <div className="mt-0.5 text-sm text-fg">
                                        {firstTarget ? firstTarget.name : 'Nowhere — mins only'}
                                    </div>
                                    {firstTarget ? (
                                        <div className="mt-0.5 font-mono text-[10px] text-fg-faint">
                                            {firstTarget.interestRate}% ·{' '}
                                            {formatMoney(firstTarget.balance)} left
                                        </div>
                                    ) : null}
                                </div>

                                <div className="grid grid-cols-2 gap-2 border-t border-line pt-2.5">
                                    <div>
                                        <div className="font-mono text-[9px] tracking-wider text-fg-faint uppercase">
                                            You pay in interest
                                        </div>
                                        <div
                                            className={cn(
                                                'mt-0.5 font-mono text-xs tabular-nums',
                                                option.winsInterest ? 'text-accent' : 'text-fg'
                                            )}>
                                            {formatMoney(option.interest)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-mono text-[9px] tracking-wider text-fg-faint uppercase">
                                            Debt-free
                                        </div>
                                        <div
                                            className={cn(
                                                'mt-0.5 font-mono text-xs tabular-nums',
                                                option.winsTime ? 'text-accent' : 'text-fg'
                                            )}>
                                            {formatDebtFreeMonth(option.debtFreeOn)}
                                        </div>
                                        {option.monthsDelta > 0 ? (
                                            <div className="mt-0.5 font-mono text-[10px] text-fg-faint">
                                                +{option.monthsDelta} mo slower
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                <p className="mt-2 font-mono text-[10px] tracking-wide text-accent uppercase">
                                    {on ? 'Selected · ' : ''}
                                    {outcome}
                                </p>
                            </button>
                        );
                    })}
                </div>

                {sameAttackOrder && strategy !== PayoffStrategy.MINIMAL ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                        <span>Household rule when debts change later:</span>
                        {(
                            [
                                [PayoffStrategy.AVALANCHE, 'Avalanche'],
                                [PayoffStrategy.SNOWBALL, 'Snowball'],
                            ] as const
                        ).map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                disabled={live && saveStrategy.isPending}
                                onClick={() => pickStrategy(key)}
                                className={cn(
                                    'rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-wider uppercase transition-colors',
                                    strategy === key
                                        ? 'border-accent/40 bg-accent-soft text-accent'
                                        : 'border-line text-fg-muted hover:border-accent-hover hover:text-accent'
                                )}>
                                {label}
                            </button>
                        ))}
                    </div>
                ) : null}
            </section>

            <div className="grid gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
                        {strategy === PayoffStrategy.MINIMAL
                            ? '✦ Your debts · no focus order'
                            : `✦ Payoff order · ${payoffStrategyLabel(strategy)}`}
                    </span>
                    {focusDebt ? (
                        <span className="text-xs text-fg-muted">
                            #1 gets the extra until it is gone, then #2, and so on.
                        </span>
                    ) : null}
                </div>

                <Card className="p-0">
                    <div className="grid gap-3 p-5">
                        {ordered.length === 0 ? (
                            <p className="text-sm text-fg-muted">No open debts yet.</p>
                        ) : (
                            ordered.map((debt, i) => {
                                const isFocus =
                                    strategy !== PayoffStrategy.MINIMAL && i === 0 && hasExtra;
                                return (
                                    <button
                                        type="button"
                                        key={debt.id}
                                        aria-label={debt.name}
                                        onClick={() => router.push(updateHref('debt', debt.id))}
                                        className={cn(
                                            'w-full cursor-pointer rounded-2xl border bg-raised p-4.5 text-left transition-colors hover:border-accent-hover',
                                            isFocus
                                                ? 'border-accent/40 ring-1 ring-accent/15'
                                                : 'border-line'
                                        )}>
                                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                                            <div className="flex items-baseline gap-3">
                                                <span className="font-mono text-xs text-accent">
                                                    {strategy === PayoffStrategy.MINIMAL
                                                        ? '·'
                                                        : `#${i + 1}`}
                                                </span>
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2.5">
                                                        <span className="text-base text-fg">
                                                            {debt.name}
                                                        </span>
                                                        <Badge
                                                            tone={
                                                                debt.interestRate > 10
                                                                    ? 'danger'
                                                                    : 'neutral'
                                                            }>
                                                            {debt.interestRate}% interest
                                                        </Badge>
                                                        {isFocus ? (
                                                            <Badge tone="success">
                                                                Extra goes here
                                                            </Badge>
                                                        ) : null}
                                                    </div>
                                                    <div className="mt-1 font-mono text-xs tracking-normal text-fg-faint">
                                                        {formatMoney(debt.minimumPayment)}/mo
                                                        minimum
                                                        {strategy === PayoffStrategy.MINIMAL
                                                            ? ''
                                                            : i === 0
                                                              ? ' · focus'
                                                              : ' · waiting'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-mono text-base text-fg">
                                                    {formatMoney(debt.balance)}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
