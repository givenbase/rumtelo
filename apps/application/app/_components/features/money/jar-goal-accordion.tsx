'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { Goal } from '@rumtelo/contracts';
import { GoalKind, GoalStatus } from '@rumtelo/contracts';
import { cn } from '@rumtelo/utils';

import { goalDetailHref } from '@/app/_lib/create-routes';
import {
    activeSaveGoalsOnJar,
    focusSaveGoal,
    saveGoalProgressCents,
    saveGoalRank,
} from '@/app/_lib/goal-focus';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

function kindLabel(goal: Goal, rank: number | null) {
    if (goal.kind === GoalKind.GIVE) return 'Yearly pledge';
    if (goal.status === GoalStatus.REACHED) return 'Reached';
    if (goal.kind === GoalKind.EARN) return 'Income target';
    if (rank === 1) return 'Focus · #1';
    if (rank !== null) return `Next · #${rank}`;
    return 'Save';
}

type JarGoalAccordionProps = {
    goals: readonly Goal[];
    /** Jar available (minor units) — drives focus progress. */
    jarAvailableCents?: number | null;
};

/** Expandable goal rows — SAVE ordered by focus; #1 uses jar available. */
export function JarGoalAccordion({ goals, jarAvailableCents = null }: JarGoalAccordionProps) {
    const { formatMoney } = useHouseholdCurrency();
    /** undefined = default open focus; null = all collapsed; id = that row. */
    const [openId, setOpenId] = useState<string | null | undefined>(undefined);

    const focusId = useMemo(() => {
        const saveJarId = goals.find(row => row.kind === GoalKind.SAVE && row.jarId)?.jarId ?? null;
        return focusSaveGoal(goals, saveJarId)?.id ?? null;
    }, [goals]);

    const ordered = useMemo(() => {
        const saveJarId = goals.find(row => row.kind === GoalKind.SAVE && row.jarId)?.jarId ?? null;
        const activeSave = activeSaveGoalsOnJar(goals, saveJarId);
        const activeIds = new Set(activeSave.map(row => row.id));
        const rest = goals.filter(row => !activeIds.has(row.id));
        return [...activeSave, ...rest];
    }, [goals]);

    if (goals.length === 0) {
        return <p className="px-5 py-4 text-sm text-fg-muted">No goals on this jar yet.</p>;
    }

    return (
        <ul className="grid">
            {ordered.map(goal => {
                const isOpen = openId === undefined ? goal.id === focusId : openId === goal.id;
                const rank = saveGoalRank(goal, goals);
                const isFocus = goal.id === focusId;
                const isSaveActive =
                    goal.kind === GoalKind.SAVE && goal.status === GoalStatus.ACTIVE;
                const current = saveGoalProgressCents({
                    goal,
                    isFocus,
                    jarAvailableCents,
                });
                const progress =
                    goal.target > 0 ? Math.min(1, Math.max(0, current / goal.target)) : 0;
                const remaining = Math.max(0, goal.target - current);

                return (
                    <li
                        key={goal.id}
                        className={cn(
                            'border-b border-line last:border-b-0',
                            isFocus && 'bg-accent-soft/40'
                        )}>
                        <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-label={goal.name}
                            onClick={() => setOpenId(isOpen ? null : goal.id)}
                            className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-raised">
                            <span className="min-w-0">
                                <span className="block truncate text-sm text-fg">
                                    {goal.icon ? `${goal.icon} ` : ''}
                                    {goal.name}
                                </span>
                                <span className="mt-0.5 block font-mono text-xs text-fg-faint">
                                    {kindLabel(goal, rank)}
                                </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-2">
                                <span className="font-mono text-sm text-fg">
                                    {formatMoney(current)} / {formatMoney(goal.target)}
                                </span>
                                <span
                                    className={cn(
                                        'text-xs text-fg-faint transition-transform duration-200',
                                        isOpen && 'rotate-180'
                                    )}>
                                    ▾
                                </span>
                            </span>
                        </button>
                        {isOpen ? (
                            <div className="animate-rise space-y-3 border-t border-line bg-raised/40 px-5 py-3">
                                <div className="h-1.5 overflow-hidden rounded-full bg-line">
                                    <div
                                        className="h-full rounded-full bg-accent"
                                        style={{ width: `${Math.round(progress * 100)}%` }}
                                    />
                                </div>
                                {isFocus && jarAvailableCents !== null ? (
                                    <p className="text-xs text-fg-muted">
                                        Jar available toward this focus goal.
                                    </p>
                                ) : null}
                                {!isFocus && isSaveActive && rank !== null ? (
                                    <p className="text-xs text-fg-muted">
                                        Waiting behind focus — fund #{rank} after #1.
                                    </p>
                                ) : null}
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
                                <Link
                                    href={goalDetailHref(goal.id)}
                                    className="inline-flex items-center gap-1.5 font-mono text-xs font-medium tracking-wide text-accent uppercase hover:underline">
                                    Open goal ›
                                </Link>
                            </div>
                        ) : null}
                    </li>
                );
            })}
        </ul>
    );
}
