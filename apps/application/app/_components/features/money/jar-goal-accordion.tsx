'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import type { Goal } from '@rumtelo/contracts';
import { GoalKind, GoalStatus } from '@rumtelo/contracts';
import { cn } from '@rumtelo/utils';

import { updateHref } from '@/app/_lib/create-routes';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

function kindLabel(goal: Goal) {
    if (goal.kind === GoalKind.GIVE) return 'Yearly pledge';
    if (goal.status === GoalStatus.REACHED) return 'Reached';
    if (goal.kind === GoalKind.EARN) return 'Income target';
    return 'Save';
}

/** Expandable goal row — progress detail (no per-contribution ledger yet). */
export function JarGoalAccordion({ goals }: { goals: readonly Goal[] }) {
    const router = useRouter();
    const { formatMoney } = useHouseholdCurrency();
    const [openId, setOpenId] = useState<string | null>(null);

    if (goals.length === 0) {
        return <p className="px-5 py-4 text-sm text-fg-muted">No goals on this jar yet.</p>;
    }

    return (
        <ul className="grid">
            {goals.map(goal => {
                const open = openId === goal.id;
                const progress =
                    goal.target > 0 ? Math.min(1, Math.max(0, goal.saved / goal.target)) : 0;
                const remaining = Math.max(0, goal.target - goal.saved);

                return (
                    <li key={goal.id} className="border-b border-line last:border-b-0">
                        <button
                            type="button"
                            aria-expanded={open}
                            aria-label={goal.name}
                            onClick={() => setOpenId(open ? null : goal.id)}
                            className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-raised">
                            <span className="min-w-0">
                                <span className="block truncate text-sm text-fg">
                                    {goal.icon ? `${goal.icon} ` : ''}
                                    {goal.name}
                                </span>
                                <span className="mt-0.5 block font-mono text-xs text-fg-faint">
                                    {kindLabel(goal)}
                                </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-2">
                                <span className="font-mono text-sm text-fg">
                                    {formatMoney(goal.saved)} / {formatMoney(goal.target)}
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
                            <div className="animate-rise space-y-3 border-t border-line bg-raised/40 px-5 py-3">
                                <div className="h-1.5 overflow-hidden rounded-full bg-line">
                                    <div
                                        className="h-full rounded-full bg-accent"
                                        style={{ width: `${Math.round(progress * 100)}%` }}
                                    />
                                </div>
                                <dl className="grid gap-1.5 font-mono text-xs text-fg-muted sm:grid-cols-2">
                                    <div className="flex justify-between gap-3 sm:block">
                                        <dt className="tracking-wide text-fg-faint uppercase">
                                            Left
                                        </dt>
                                        <dd className="text-fg">{formatMoney(remaining)}</dd>
                                    </div>
                                    <div className="flex justify-between gap-3 sm:block">
                                        <dt className="tracking-wide text-fg-faint uppercase">
                                            Monthly
                                        </dt>
                                        <dd className="text-fg">
                                            {formatMoney(goal.monthlyContribution)}
                                        </dd>
                                    </div>
                                    {goal.targetOn ? (
                                        <div className="flex justify-between gap-3 sm:block">
                                            <dt className="tracking-wide text-fg-faint uppercase">
                                                Target
                                            </dt>
                                            <dd className="text-fg">{goal.targetOn}</dd>
                                        </div>
                                    ) : null}
                                    {goal.cause ? (
                                        <div className="flex justify-between gap-3 sm:block">
                                            <dt className="tracking-wide text-fg-faint uppercase">
                                                Cause
                                            </dt>
                                            <dd className="text-fg">{goal.cause}</dd>
                                        </div>
                                    ) : null}
                                </dl>
                                {goal.why ? (
                                    <p className="text-sm text-fg-secondary">{goal.why}</p>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={() => router.push(updateHref('goal', goal.id))}
                                    className="font-mono text-xs font-medium tracking-wide text-accent uppercase hover:underline">
                                    Edit goal ›
                                </button>
                            </div>
                        ) : null}
                    </li>
                );
            })}
        </ul>
    );
}
