'use client';

import {
    CourseHorizon,
    CourseItemStatus,
    type CourseItem,
    type GoalSummary,
} from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Icon,
} from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

import { monthName, type GoalNode } from '../_utils/course-goals';
import type { CourseItemActions } from '../_utils/use-course-actions';
import { CourseGoalDetail } from './course-goal-detail';
import { CourseGoalRing } from './course-goal-ring';
import type { CourseRhythmLine } from './course-item-card';
import type { CourseDialogState } from './course-item-dialog';

/** The goal-card chip look: small, calm, never loud. */
const CHIP =
    'inline-flex max-w-full items-center gap-1 rounded-full bg-raised px-2 py-0.5 text-xs font-medium text-fg-secondary';

/**
 * One goal in the tree. Collapsed: ring, name, this month's step and labels. Expanded
 * (a real disclosure button): done-when, the year at a glance, this month and this
 * week under it, and the next moves.
 */
export function CourseGoalCard({
    node,
    month,
    isOpen,
    onToggle,
    actions,
    isBusy,
    weekItems,
    thisWeek,
    isWeekFull,
    rhythmLines,
    canCreate,
    onCreate,
    onPlanSteps,
    isPlanning,
}: {
    node: GoalNode;
    month: string;
    isOpen: boolean;
    onToggle: () => void;
    actions: CourseItemActions;
    isBusy: boolean;
    weekItems: readonly CourseItem[];
    thisWeek: string;
    isWeekFull: boolean;
    rhythmLines: readonly CourseRhythmLine[];
    canCreate: boolean;
    onCreate: (state: CourseDialogState) => void;
    onPlanSteps: (goal: GoalSummary) => void;
    isPlanning: boolean;
}) {
    const t = useTranslations('features.growth.course.goal');
    const tCourse = useTranslations('features.growth.course');
    const locale = useLocale();
    const { formatMoney } = useHouseholdCurrency();
    const { item, moneyGoal } = node;
    const panelId = `goal-panel-${node.key}`;
    const isDone = item?.status === CourseItemStatus.DONE;

    const stepLine = (() => {
        if (!item) return t('money_no_steps');
        const [first, ...more] = node.steps;
        if (!first) return t('no_step_yet', { month: monthName(month, locale, 'long') });
        const line = t('step_line', {
            month: monthName(month, locale, 'short'),
            step: first.name,
        });
        return more.length > 0 ? `${line} · ${t('step_more', { count: more.length })}` : line;
    })();

    return (
        <article
            className={cn(
                'rounded-3xl border bg-card transition-colors',
                isOpen ? 'border-line-strong' : 'border-line'
            )}>
            <div className="flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
                <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={onToggle}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:gap-4">
                    <CourseGoalRing
                        percent={node.percent}
                        label={t('ring_aria', { name: node.name, percent: node.percent })}
                    />
                    <span className="grid min-w-0 flex-1 gap-1">
                        <span
                            className={cn(
                                'text-base leading-snug font-semibold text-fg sm:text-lg',
                                isDone && 'text-fg-muted line-through'
                            )}>
                            {node.name}
                        </span>
                        <span className="truncate text-sm text-fg-muted">{stepLine}</span>
                        {node.scope || moneyGoal ? (
                            <span className="flex flex-wrap items-center gap-1.5">
                                {node.scope ? (
                                    <span className={CHIP}>{t(`scope_${node.scope}`)}</span>
                                ) : null}
                                {moneyGoal ? (
                                    <span className={CHIP}>
                                        <Icon name="piggy-bank" size="sm" className="size-3.5" />
                                        <span className="truncate">
                                            {[formatMoney(moneyGoal.target), moneyGoal.jarName]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </span>
                                    </span>
                                ) : null}
                            </span>
                        ) : null}
                    </span>
                    <Icon
                        name="chevron-down"
                        aria-hidden
                        className={cn(
                            'shrink-0 text-fg-muted transition-transform',
                            isOpen && 'rotate-180'
                        )}
                    />
                </button>

                {node.needsStep && item?.canEdit && canCreate ? (
                    <Button
                        size="sm"
                        variant="secondary"
                        disabled={isBusy}
                        onClick={() =>
                            onCreate({
                                mode: 'create',
                                horizon: CourseHorizon.MONTH,
                                period: month,
                                parent: item,
                            })
                        }
                        aria-label={`${t('add_step')}: ${node.name}`}
                        className="shrink-0">
                        {`+ ${t('add_step')}`}
                    </Button>
                ) : null}

                {item?.canEdit ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            disabled={isBusy}
                            aria-label={tCourse('menu_aria', { name: node.name })}
                            className="grid size-9 shrink-0 place-items-center rounded-full text-fg-muted hover:bg-raised hover:text-fg">
                            <Icon name="ellipsis" aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onSelect={() =>
                                    actions.onStatus(
                                        item,
                                        isDone ? CourseItemStatus.OPEN : CourseItemStatus.DONE
                                    )
                                }>
                                {isDone ? tCourse('mark_open') : tCourse('mark_done')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onSelect={() => actions.onStatus(item, CourseItemStatus.DROPPED)}>
                                {tCourse('action_drop')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => actions.onEdit(item)}>
                                {tCourse('action_edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => actions.onDelete(item)}>
                                {tCourse('action_delete')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : null}
            </div>

            {isOpen ? (
                <CourseGoalDetail
                    id={panelId}
                    node={node}
                    month={month}
                    actions={actions}
                    isBusy={isBusy}
                    weekItems={weekItems}
                    thisWeek={thisWeek}
                    isWeekFull={isWeekFull}
                    rhythmLines={rhythmLines}
                    canCreate={canCreate}
                    onCreate={onCreate}
                    onPlanSteps={onPlanSteps}
                    isPlanning={isPlanning}
                />
            ) : null}
        </article>
    );
}
