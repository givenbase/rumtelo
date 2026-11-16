'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { CourseHorizon } from '@rumtelo/contracts';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';

import {
    hasRemainingWork,
    initialProgress,
    nextStage,
    summarizeProgress,
    type PlanChain,
    type PlanGoalProgress,
    type PlanStage,
} from './plan-year';

/**
 * Saves the chains of "Plan your year", one goal at a time and one stage at a time:
 * Money goal (with an amount), year goal, first step, routine. Progress is kept per goal,
 * so a failure never loses what was saved and `run` again only does what is left.
 *
 * A Money goal that cannot be created (plan without Money goals, goal limit reached, …)
 * does not stop anything: the Course goal is kept without the amount and the reason is
 * recorded in `moneyError`.
 */
export function usePlanSave({ householdId, year }: { householdId: string; year: string }) {
    const queryClient = useQueryClient();
    const apiError = useApiError();
    const [progress, setProgress] = useState<Record<string, PlanGoalProgress>>({});
    const [isSaving, setIsSaving] = useState(false);
    // The latest map, so a retry never works from a stale render.
    const latest = useRef<Record<string, PlanGoalProgress>>({});

    const write = (draftId: string, next: PlanGoalProgress) => {
        latest.current = { ...latest.current, [draftId]: next };
        setProgress(latest.current);
    };

    const runStage = async (
        stage: PlanStage,
        chain: PlanChain,
        current: PlanGoalProgress
    ): Promise<PlanGoalProgress> => {
        switch (stage) {
            case 'money': {
                const money = chain.money!;
                const created = await api.money.goals.create({ householdId, ...money });
                return {
                    ...current,
                    stages: { ...current.stages, money: 'done' },
                    moneyGoalId: created.id,
                };
            }
            case 'year': {
                const created = await api.growth.course.create({
                    householdId,
                    horizon: CourseHorizon.YEAR,
                    period: year,
                    name: chain.year.name,
                    doneWhen: chain.year.doneWhen,
                    scope: chain.year.scope,
                    goalId: current.moneyGoalId,
                });
                return {
                    ...current,
                    stages: { ...current.stages, year: 'done' },
                    yearItemId: created.id,
                    error: null,
                };
            }
            case 'step': {
                const step = chain.step!;
                await api.growth.course.create({
                    householdId,
                    horizon: CourseHorizon.MONTH,
                    period: step.month,
                    parentId: current.yearItemId,
                    name: step.name,
                });
                return { ...current, stages: { ...current.stages, step: 'done' }, error: null };
            }
            case 'routine': {
                const routine = chain.routine!;
                await api.growth.course.rhythm.create({
                    householdId,
                    name: routine.name,
                    kind: routine.kind,
                    cadence: routine.cadence,
                    target: routine.target,
                    parentId: current.yearItemId,
                    area: routine.area,
                });
                return { ...current, stages: { ...current.stages, routine: 'done' }, error: null };
            }
        }
    };

    /** Runs what is left for every chain, then refreshes Course and Money. Resolves with whether nothing is left and how many amounts were not saved. */
    const run = async (
        chains: readonly PlanChain[]
    ): Promise<{ isFinished: boolean; amountsMissed: number }> => {
        setIsSaving(true);
        try {
            for (const chain of chains) {
                let current = latest.current[chain.draftId] ?? initialProgress(chain);
                write(chain.draftId, current);
                for (let stage = nextStage(current); stage; stage = nextStage(current)) {
                    try {
                        // Sequential on purpose: each stage hangs under the one before it.
                        // oxlint-disable-next-line no-await-in-loop
                        current = await runStage(stage, chain, current);
                    } catch (error: unknown) {
                        const message = apiError(error);
                        current =
                            stage === 'money'
                                ? {
                                      ...current,
                                      stages: { ...current.stages, money: 'failed' },
                                      moneyError: message,
                                  }
                                : {
                                      ...current,
                                      stages: { ...current.stages, [stage]: 'failed' },
                                      error: message,
                                  };
                        write(chain.draftId, current);
                        // A failed amount is soft: the goal goes on. Anything else stops this goal.
                        if (stage !== 'money') break;
                        continue;
                    }
                    write(chain.draftId, current);
                }
            }
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: apiQuery.growth.course.key() }),
                queryClient.invalidateQueries({ queryKey: apiQuery.money.goals.list.key() }),
            ]);
            const finished = chains.map(chain => latest.current[chain.draftId]!);
            return {
                isFinished: !hasRemainingWork(finished),
                amountsMissed: summarizeProgress(finished).amountsMissed,
            };
        } finally {
            setIsSaving(false);
        }
    };

    return { progress, isSaving, run };
}
