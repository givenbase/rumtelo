'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { useLiveQuery } from '@rumtelo/hooks';
import { AccentCard, Badge, Card, Eyebrow } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { CREATE_HREF, updateHref } from '@/app/_lib/create-routes';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';
import { ListToolbar } from '@/components/layout/list-toolbar';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

/** Raw extra-payment values; labels are built inside the component with the bound formatter. */
const EXTRA_OPTION_VALUES = [0, 5_000, 10_000, 20_000, 30_000, 50_000];

/** Fallback avalanche simulator used when live plan data isn't available. */
function computeFreedomLocal(
    debts: ReadonlyArray<{ balance: number; interestRate: number; minimumPayment: number }>,
    extraMonthly: number
): string {
    const debtList = Array.from(debts);
    const balances: number[] = debtList.map(debt => debt.balance);
    let months = 0;

    while (balances.some(balance => (balance ?? 0) > 0) && months < 600) {
        for (let i = 0; i < debtList.length; i++) {
            const debt = debtList[i]!;
            const bal = balances[i] ?? 0;
            if (bal <= 0) continue;
            const interest = Math.round((bal * debt.interestRate) / 100 / 12);
            balances[i] = Math.max(0, bal + interest - debt.minimumPayment);
        }
        let budget = extraMonthly;
        const byRate = debtList
            .map((debt, i) => ({ i, rate: debt.interestRate }))
            .filter(({ i }) => (balances[i] ?? 0) > 0)
            .sort((left, right) => right.rate - left.rate);
        for (const { i } of byRate) {
            if (budget <= 0) break;
            const bal = balances[i] ?? 0;
            const payment = Math.min(budget, bal);
            balances[i] = bal - payment;
            budget -= payment;
        }
        months++;
    }

    const date = new Date(2026, 7);
    date.setMonth(date.getMonth() + months);
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
}

export function DebtsPageClient() {
    const { householdId } = useAuth();
    const router = useRouter();
    const { formatMoney } = useHouseholdCurrency();
    const [extra, setExtra] = useState(30_000);
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

    const planQuery = useLiveQuery(
        apiQuery.money.debts.plan.queryOptions({
            input: { householdId: householdId! },
        }),
        null as never,
        live
    );

    const debts = (debtsQuery.data ?? []) as ReadonlyArray<{
        id: string;
        name: string;
        kind: string;
        balance: number;
        interestRate: number;
        minimumPayment: number;
    }>;

    const total = debts.reduce((running, debt) => running + debt.balance, 0);
    const monthly = debts.reduce((running, debt) => running + debt.minimumPayment, 0);
    const avalanche = [...debts].sort((left, right) => right.interestRate - left.interestRate);

    // Freedom date: use live plan if available, otherwise local simulator
    const liveDebtFreeOn =
        live && planQuery.data
            ? (planQuery.data as { debtFreeOn: string | null }).debtFreeOn
            : null;
    const freedomDate = liveDebtFreeOn
        ? liveDebtFreeOn.slice(0, 7).split('-').reverse().join('-') // YYYY-MM → MM-YYYY
        : computeFreedomLocal(debts, extra);

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
                    Not all debt is equal. Understand the difference first, then choose how you pay
                    it off.
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
                </div>

                {/* Simulator only shown in mock mode; live uses the plan endpoint */}
                {!live && (
                    <div className="mt-5 border-t border-line pt-4">
                        <Eyebrow className="mb-3">
                            Payoff booster · {extra > 0 ? formatMoney(extra) : 'none'} extra/mo
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

            <div>
                <span className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
                    ✦ Payoff order · Avalanche
                </span>
            </div>

            <Card className="p-0">
                <div className="grid gap-3 p-5">
                    {avalanche.map((debt, i) => (
                        <button
                            type="button"
                            key={debt.id}
                            aria-label={debt.name}
                            onClick={() => router.push(updateHref('debt', debt.id))}
                            className="w-full cursor-pointer rounded-2xl border border-line bg-raised p-4.5 text-left transition-colors hover:border-accent-hover">
                            <div className="flex flex-wrap items-baseline justify-between gap-3">
                                <div className="flex items-baseline gap-3">
                                    <span className="font-mono text-xs text-accent">#{i + 1}</span>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2.5">
                                            <span className="text-base text-fg">{debt.name}</span>
                                            <Badge
                                                tone={
                                                    debt.interestRate > 10 ? 'danger' : 'neutral'
                                                }>
                                                {debt.interestRate}% interest
                                            </Badge>
                                        </div>
                                        <div className="mt-1 font-mono text-xs tracking-normal text-fg-faint">
                                            {formatMoney(debt.minimumPayment)}/mo minimum
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
                    ))}
                </div>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
                <div
                    className="rounded-lg border border-l-4 border-line bg-surface p-5 shadow-md"
                    style={{ borderLeftColor: 'var(--color-accent)' }}>
                    <div className="mb-3 flex items-center gap-2.5">
                        <span className="size-2.5 rounded-full bg-accent" />
                        <span className="font-mono text-xs font-medium tracking-wide text-accent uppercase">
                            Avalanche
                        </span>
                    </div>
                    <p className="text-sm leading-relaxed text-pretty text-fg-secondary">
                        Pay the highest interest first. Mathematically the cheapest option. The only
                        reason not to avalanche is if you need a quick win to keep going.
                    </p>
                </div>
                <div
                    className="rounded-lg border border-l-4 border-line bg-surface p-5 shadow-md"
                    style={{ borderLeftColor: 'var(--color-fg-muted)' }}>
                    <div className="mb-3 flex items-center gap-2.5">
                        <span className="size-2.5 rounded-full bg-fg-muted" />
                        <span className="font-mono text-xs font-medium tracking-wide text-fg-muted uppercase">
                            Snowball
                        </span>
                    </div>
                    <p className="text-sm leading-relaxed text-pretty text-fg-secondary">
                        Pay the smallest balance first. Costs more interest but delivers faster
                        wins. Choose the method you can stick with.
                    </p>
                </div>
            </div>
        </div>
    );
}
