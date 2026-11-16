'use client';

import { useFormContext, useWatch } from 'react-hook-form';

import { CourseScope, GoalKind } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Icon } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

import type { PlanFormValues } from '../_utils/plan-form';
import {
    PLAN_STAGES,
    balanceOf,
    buildChain,
    nextStage,
    summarizeProgress,
    type PlanGoalProgress,
    type PlanStage,
    type PlanStageState,
} from '../_utils/plan-year';

const STATE_ICON: Record<PlanStageState | 'working', 'circle' | 'loader-2' | 'check' | 'x'> = {
    pending: 'circle',
    working: 'loader-2',
    done: 'check',
    failed: 'x',
    skipped: 'circle',
};

/**
 * Step 5 · Balance & save: what will be created, a calm note when all goals sit in one
 * scope (information, never a block) and, while saving, what has been saved so far.
 */
export function PlanStepSave({
    year,
    month,
    progress,
    isSaving,
    onAddGoal,
}: {
    year: string;
    month: string;
    progress: Record<string, PlanGoalProgress>;
    isSaving: boolean;
    onAddGoal: () => void;
}) {
    const t = useTranslations('features.growth.course.plan');
    const tScope = useTranslations('features.growth.course.goal');
    const { formatMoney } = useHouseholdCurrency();
    const { control } = useFormContext<PlanFormValues>();
    const goals = useWatch({ control, name: 'goals' });

    const chains = goals.map(goal => buildChain(goal, { year, month }));
    const balance = balanceOf(goals);
    const started = goals.filter(goal => progress[goal.uid] !== undefined);
    const summary = summarizeProgress(started.map(goal => progress[goal.uid]!));
    const hasAmount = chains.some(chain => chain.money !== null);
    const hasFailure = started.some(goal => {
        const entry = progress[goal.uid]!;
        return PLAN_STAGES.some(stage => entry.stages[stage] === 'failed' && stage !== 'money');
    });

    return (
        <div className="grid gap-6">
            {balance.missing && started.length === 0 ? (
                <div className="grid gap-2 rounded-3xl bg-accent-soft p-4 sm:p-5">
                    <p className="text-sm text-fg-secondary">
                        {t(
                            `balance_only_${balance.missing === CourseScope.PERSONAL ? 'BUSINESS' : 'PERSONAL'}`,
                            {
                                count:
                                    balance.missing === CourseScope.PERSONAL
                                        ? balance.business
                                        : balance.personal,
                            }
                        )}
                    </p>
                    <div>
                        <button
                            type="button"
                            onClick={onAddGoal}
                            className="rounded-md text-sm font-medium text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                            {t('balance_add')}
                        </button>
                    </div>
                </div>
            ) : null}

            {started.length > 0 ? (
                <p
                    role={hasFailure ? 'alert' : 'status'}
                    className={cn(
                        'rounded-2xl px-4 py-3 text-sm',
                        hasFailure ? 'bg-raised text-fg' : 'bg-accent-soft text-fg-secondary'
                    )}>
                    {hasFailure
                        ? t('partial', { saved: summary.goalsSaved, total: goals.length })
                        : t('progress_line', { saved: summary.goalsSaved, total: goals.length })}
                </p>
            ) : null}

            <ul className="grid gap-3" aria-label={t('save_list_aria')}>
                {goals.map((goal, index) => {
                    const chain = chains[index]!;
                    const entry = progress[goal.uid];
                    const parts = [
                        tScope(`scope_${goal.scope}`),
                        chain.money
                            ? chain.money.kind === GoalKind.EARN
                                ? t('summary_earn', { amount: formatMoney(chain.money.target) })
                                : t('summary_save', { amount: formatMoney(chain.money.target) })
                            : null,
                        chain.step ? t('summary_step') : null,
                        chain.routine ? t('summary_routine') : null,
                    ].filter(Boolean);
                    return (
                        <li
                            key={goal.uid}
                            className="grid gap-2 rounded-3xl border border-line bg-card p-4 sm:p-5">
                            <p className="text-base leading-snug font-semibold text-fg">
                                {chain.year.name}
                            </p>
                            <p className="text-sm text-fg-muted">{parts.join(' · ')}</p>
                            {entry ? (
                                <ul className="grid gap-1 pt-1">
                                    {PLAN_STAGES.filter(
                                        stage => entry.stages[stage] !== 'skipped'
                                    ).map(stage => {
                                        const state: PlanStageState | 'working' =
                                            isSaving &&
                                            entry.stages[stage] === 'pending' &&
                                            nextStage(entry) === stage
                                                ? 'working'
                                                : entry.stages[stage];
                                        return <StageRow key={stage} stage={stage} state={state} />;
                                    })}
                                </ul>
                            ) : null}
                            {entry?.moneyError ? (
                                <p className="text-sm text-fg-muted">
                                    {t('amount_missed', { reason: entry.moneyError })}
                                </p>
                            ) : null}
                            {entry?.error ? (
                                <p className="text-sm text-danger">{entry.error}</p>
                            ) : null}
                        </li>
                    );
                })}
            </ul>

            {hasAmount ? <p className="text-sm text-fg-muted">{t('shared_note')}</p> : null}
        </div>
    );
}

function StageRow({ stage, state }: { stage: PlanStage; state: PlanStageState | 'working' }) {
    const t = useTranslations('features.growth.course.plan');
    return (
        <li
            className={cn(
                'flex items-center gap-2 text-sm',
                state === 'failed' ? 'text-danger' : 'text-fg-secondary'
            )}>
            <Icon
                name={STATE_ICON[state]}
                size="sm"
                aria-hidden
                className={cn(
                    'size-4',
                    state === 'working' && 'animate-spin',
                    state === 'pending' && 'text-fg-muted',
                    state === 'done' && 'text-accent'
                )}
            />
            <span>
                {t(`stage_${stage}`)}
                <span className="text-fg-muted"> · {t(`status_${state}`)}</span>
            </span>
        </li>
    );
}
