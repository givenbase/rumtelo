'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { GoalKind, GoalStatus } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { AccentCard, EmptyState, Meter } from '@rumtelo/ui';
import { cn, earnGoalProgress, monthlyNetAsOf } from '@rumtelo/utils';

import { CREATE_HREF, updateHref } from '@/app/_lib/create-routes';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';
import { ListToolbar } from '@/components/layout/list-toolbar';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

type Tab = 'ON_TRACK' | 'REACHED';

const EN_MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
] as const;

function eta(saved: number, target: number, monthlyContribution: number): string {
    if (monthlyContribution <= 0) return 'Unknown';
    const months = Math.ceil((target - saved) / monthlyContribution);
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return `${EN_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

export function GoalsPageClient() {
    const { householdId } = useAuth();
    const router = useRouter();
    const [tab, setTab] = useState<Tab>('ON_TRACK');
    const { formatMoney } = useHouseholdCurrency();
    const live = isLiveData(householdId);

    const goalsQuery = useLiveQuery(
        apiQuery.money.goals.list.queryOptions({ input: { householdId: householdId! } }),
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

    const goals = (goalsQuery.data ?? []) as ReadonlyArray<{
        id: string;
        kind?: string;
        name: string;
        icon: string | null;
        target: number;
        saved: number;
        monthlyContribution: number;
        jarId?: string | null;
        why?: string | null;
        status?: string;
        targetOn?: string | null;
        fulfilledOn?: string | null;
    }>;

    const active = goals.filter(goal => {
        if (goal.status === GoalStatus.ARCHIVED || goal.status === GoalStatus.REACHED) return false;
        if (goal.kind === GoalKind.EARN) {
            return !earnGoalProgress({ target: goal.target, currentNet }).reached;
        }
        return goal.saved < goal.target;
    });
    const reached = goals.filter(goal => {
        if (goal.status === GoalStatus.REACHED) return true;
        if (goal.kind === GoalKind.EARN) {
            return earnGoalProgress({ target: goal.target, currentNet }).reached;
        }
        return goal.saved >= goal.target;
    });
    const shown = tab === 'ON_TRACK' ? active : reached;

    return (
        <div className="grid animate-rise gap-8">
            <div>
                <span className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
                    ✦ GOALS
                </span>
                <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg lg:text-4xl">
                    Every goal is a decision you've already made.
                </h1>
                <p className="mt-2 max-w-prose text-base text-pretty text-fg-muted">
                    Save into a jar, set the monthly net you want to earn, or pledge what you give
                    this year — each one marks itself reached.
                </p>
            </div>

            <ListToolbar createLabel="+ Add goal" onCreate={() => router.push(CREATE_HREF.goal)}>
                {(['ON_TRACK', 'REACHED'] as const).map(tabKey => {
                    const count = tabKey === 'ON_TRACK' ? active.length : reached.length;
                    return (
                        <button
                            key={tabKey}
                            type="button"
                            onClick={() => setTab(tabKey)}
                            className={cn(
                                'flex items-baseline gap-2 rounded-full border px-4 py-2.5 font-mono text-xs font-medium tracking-wide uppercase transition-all duration-200',
                                tab === tabKey
                                    ? 'border-accent/40 bg-accent-soft text-accent'
                                    : 'border-line text-fg-muted hover:border-line-strong hover:text-fg'
                            )}>
                            {tabKey === 'ON_TRACK' ? 'On track' : 'Reached'}
                            <span className="opacity-70">{count}</span>
                        </button>
                    );
                })}
            </ListToolbar>

            <div className="grid gap-4 sm:grid-cols-2">
                {shown.length === 0 ? (
                    <EmptyState
                        icon="🎯"
                        title={tab === 'REACHED' ? 'Nothing reached yet.' : 'No active goals.'}
                        body={
                            tab === 'REACHED'
                                ? 'Keep going — your first touchdown is coming.'
                                : 'Add a goal to give yourself direction.'
                        }
                    />
                ) : (
                    shown.map(goal => {
                        const isEarn = goal.kind === GoalKind.EARN;
                        const isGive = goal.kind === GoalKind.GIVE;
                        const earn = isEarn
                            ? earnGoalProgress({ target: goal.target, currentNet })
                            : null;
                        const progress = isEarn
                            ? goal.target > 0
                                ? Math.min(1, earn!.current / goal.target)
                                : 0
                            : goal.target > 0
                              ? goal.saved / goal.target
                              : 0;

                        return (
                            <AccentCard
                                key={goal.id}
                                tint={
                                    isEarn
                                        ? 'var(--color-accent)'
                                        : isGive
                                          ? 'var(--color-jar-give)'
                                          : 'var(--color-jar-lts)'
                                }
                                className="cursor-pointer transition-colors hover:border-accent-hover">
                                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 py-1 font-mono text-xs tracking-widest text-fg-secondary uppercase">
                                    {goal.icon ?? (isEarn ? '📈' : isGive ? '💛' : '🎯')}{' '}
                                    {isEarn
                                        ? 'Earn net ›'
                                        : isGive
                                          ? 'Give pledge ›'
                                          : 'Long term ›'}
                                </div>

                                <h3 className="font-display text-2xl leading-tight font-semibold tracking-tight text-fg">
                                    {goal.name}
                                </h3>

                                <div className="mt-3 flex items-baseline gap-2">
                                    <span className="font-mono text-2xl text-accent">
                                        {formatMoney(isEarn ? earn!.current : goal.saved)}
                                    </span>
                                    <span className="font-mono text-xs text-fg-muted">
                                        of {formatMoney(goal.target)}
                                        {isEarn ? ' /mo' : ''}
                                    </span>
                                </div>

                                <Meter value={progress} className="mt-3.5" />

                                <p className="mt-3 text-sm text-fg-muted">
                                    {isEarn
                                        ? tab === 'REACHED' && goal.fulfilledOn
                                            ? `◇ Reached ${goal.fulfilledOn}`
                                            : earn!.reached
                                              ? '◇ Target met'
                                              : `◇ ${formatMoney(earn!.remaining)} to go`
                                        : isGive
                                          ? tab === 'REACHED'
                                              ? `◇ Pledge met${goal.fulfilledOn ? ` · ${goal.fulfilledOn}` : ''}`
                                              : `◇ ${formatMoney(goal.saved)} given · ${formatMoney(Math.max(0, goal.target - goal.saved))} to go${goal.targetOn ? ` by ${goal.targetOn.slice(0, 4)}` : ''}`
                                          : `◇ ${formatMoney(goal.monthlyContribution)} p/m · done by ${eta(goal.saved, goal.target, goal.monthlyContribution)}`}
                                </p>

                                <button
                                    type="button"
                                    onClick={() => router.push(updateHref('goal', goal.id))}
                                    className="mt-4 w-full rounded-full border border-line-strong py-2.5 font-mono text-xs tracking-wide text-fg-muted uppercase transition-colors hover:border-accent-hover hover:text-accent">
                                    Edit goal
                                </button>
                            </AccentCard>
                        );
                    })
                )}
            </div>
        </div>
    );
}
