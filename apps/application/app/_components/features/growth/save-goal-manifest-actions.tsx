'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { Goal } from '@rumtelo/contracts';
import { GoalKind, GoalStatus } from '@rumtelo/contracts';
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@rumtelo/ui';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { isFocusSaveGoal, saveGoalRank } from '@/app/_lib/goal-focus';
import { useAppShell } from '@/components/features/shell/app-shell-context';

type Props = {
    goal: Goal;
    allGoals: readonly Goal[];
    householdId: string;
    jarAvailableCents: number | null;
    formatMoney: (cents: number) => string;
};

/**
 * SAVE focus + claim actions — set #1 priority, or mark achieved (keep / spend).
 */
export function SaveGoalManifestActions({
    goal,
    allGoals,
    householdId,
    jarAvailableCents,
    formatMoney,
}: Props) {
    const queryClient = useQueryClient();
    const { showToast } = useAppShell();
    const [achieveOpen, setAchieveOpen] = useState(false);

    const isSaveActive =
        goal.kind === GoalKind.SAVE && goal.status === GoalStatus.ACTIVE && Boolean(goal.jarId);
    const isFocus = isFocusSaveGoal(goal, allGoals);
    const rank = saveGoalRank(goal, allGoals);
    const canAfford =
        jarAvailableCents !== null && jarAvailableCents >= goal.target && goal.target > 0;

    const invalidate = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: apiQuery.money.goals.list.key() }),
            queryClient.invalidateQueries({ queryKey: apiQuery.money.goals.projections.key() }),
            queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.balances.key() }),
            queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.list.key() }),
            queryClient.invalidateQueries({ queryKey: apiQuery.money.transactions.list.key() }),
            queryClient.invalidateQueries({ queryKey: apiQuery.money.dashboard.get.key() }),
        ]);
    };

    const focusMutation = useMutation({
        mutationFn: () => api.money.goals.setFocus({ householdId, id: goal.id }),
        onSuccess: async () => {
            await invalidate();
            showToast('This is your focus now', 'success');
        },
        onError: (error: Error) => {
            showToast(error.message || 'Could not set focus', 'error');
        },
    });

    const achieveMutation = useMutation({
        mutationFn: (mode: 'keep' | 'spend') =>
            api.money.goals.achieve({ householdId, id: goal.id, mode }),
        onSuccess: async (_data, mode) => {
            await invalidate();
            showToast(
                mode === 'spend'
                    ? 'Goal claimed — spent from the jar'
                    : 'Goal achieved — cash stays in the jar',
                'success'
            );
            setAchieveOpen(false);
        },
        onError: (error: Error) => {
            showToast(error.message || 'Could not mark achieved', 'error');
        },
    });

    if (!isSaveActive) return null;

    const busy = focusMutation.isPending || achieveMutation.isPending;

    return (
        <>
            <div className="flex flex-wrap items-center gap-2">
                {rank !== null ? (
                    <span className="rounded-full border border-line bg-raised px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wide text-fg-muted uppercase">
                        {isFocus ? 'Focus · #1' : `Priority · #${rank}`}
                    </span>
                ) : null}
                {!isFocus ? (
                    <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => focusMutation.mutate()}>
                        {focusMutation.isPending ? 'Setting…' : 'Make focus'}
                    </Button>
                ) : null}
                <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() => setAchieveOpen(true)}>
                    Mark achieved
                </Button>
            </div>

            <Dialog
                open={achieveOpen}
                onOpenChange={open => {
                    if (!open && !busy) setAchieveOpen(false);
                }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Claim “{goal.name}”?</DialogTitle>
                        <DialogDescription>
                            {canAfford
                                ? `The jar has ${formatMoney(jarAvailableCents)} — enough for ${formatMoney(goal.target)}.`
                                : jarAvailableCents !== null
                                  ? `Jar has ${formatMoney(jarAvailableCents)}; target is ${formatMoney(goal.target)}. You can still claim and keep cash in the jar, or spend what you can later.`
                                  : `Mark this goal reached. Choose whether money leaves the jar now.`}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col gap-2 sm:flex-col">
                        <Button
                            type="button"
                            disabled={busy}
                            onClick={() => achieveMutation.mutate('keep')}
                            className="w-full">
                            {achieveMutation.isPending ? 'Saving…' : 'Achieved — keep in jar'}
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={busy || !canAfford}
                            onClick={() => achieveMutation.mutate('spend')}
                            className="w-full">
                            {canAfford
                                ? `Ordered — spend ${formatMoney(goal.target)}`
                                : 'Spend (need full target in jar)'}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => setAchieveOpen(false)}
                            className="w-full">
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
