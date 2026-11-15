'use client';

import { CourseHorizon, type CourseItem, type GoalSummary } from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Button, Icon, Meter } from '@rumtelo/ui';

import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

import {
    monthName,
    monthYearOf,
    nextStepMonth,
    weekItemsOfGoal,
    weekParentFor,
    type GoalNode,
} from '../_utils/course-goals';
import type { CourseItemActions } from '../_utils/use-course-actions';
import { CourseBadge } from './course-badge';
import { CourseGoalTimeline } from './course-goal-timeline';
import type { CourseRhythmLine } from './course-item-card';
import type { CourseDialogState } from './course-item-dialog';
import { CourseMiniRow } from './course-mini-row';

const EYEBROW = 'font-mono text-[10px] tracking-wide text-fg-muted uppercase';

/** The open half of a goal card: where it ends, the year, this month, this week, next moves. */
export function CourseGoalDetail({
    id,
    node,
    month,
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
    id: string;
    node: GoalNode;
    month: string;
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
    const { item, moneyGoal } = node;
    const year = month.slice(0, 4);

    const weekFocus = item ? weekItemsOfGoal(item, node.steps, weekItems) : [];
    const weekParent = item ? weekParentFor(item, node.steps, thisWeek) : null;
    // A goal without a step this month gets one for this month; otherwise offer the next.
    const stepMonth = node.needsStep ? month : nextStepMonth(month);
    const canAdd = canCreate && item !== null && item.canEdit;

    return (
        <div
            id={id}
            role="region"
            aria-label={node.name}
            className="grid gap-5 border-t border-line p-4 sm:p-5">
            {item?.doneWhen ? (
                <p className="text-sm text-fg-secondary">
                    <span className={EYEBROW}>{t('done_when')}</span>
                    <span className="mt-1 block">{item.doneWhen}</span>
                </p>
            ) : null}

            {item ? (
                <CourseGoalTimeline
                    year={year}
                    filled={node.filledMonths}
                    currentMonth={month}
                    locale={locale}
                />
            ) : null}

            {moneyGoal ? <MoneyBlock goal={moneyGoal} locale={locale} /> : null}

            {item ? (
                <section
                    className="grid gap-2"
                    aria-label={t('steps_title', { month: monthName(month, locale, 'long') })}>
                    <p className={EYEBROW}>{monthName(month, locale, 'long')}</p>
                    {node.steps.length > 0 ? (
                        <ul className="grid gap-1.5">
                            {node.steps.map(step => (
                                <CourseMiniRow
                                    key={step.id}
                                    item={step}
                                    actions={actions}
                                    isBusy={isBusy}
                                />
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-fg-muted">
                            {t('no_step_yet', { month: monthName(month, locale, 'long') })}
                        </p>
                    )}
                </section>
            ) : null}

            {weekFocus.length > 0 ? (
                <section className="grid gap-2" aria-label={t('week_title')}>
                    <p className={EYEBROW}>{t('week_title')}</p>
                    <ul className="grid gap-1.5">
                        {weekFocus.map(focus => (
                            <CourseMiniRow
                                key={focus.id}
                                item={focus}
                                actions={actions}
                                isBusy={isBusy}
                            />
                        ))}
                    </ul>
                </section>
            ) : null}

            {rhythmLines.length > 0 ? (
                <ul className="grid gap-1.5" aria-label={t('routines_title')}>
                    {rhythmLines.map(line => (
                        <li
                            key={line.key}
                            className="flex flex-wrap items-center gap-1.5 text-sm text-fg-secondary">
                            <CourseBadge kind={line.kind} />
                            {line.label}
                        </li>
                    ))}
                </ul>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
                {!item && moneyGoal ? (
                    <Button
                        size="sm"
                        disabled={isPlanning || !canCreate}
                        onClick={() => onPlanSteps(moneyGoal)}
                        iconLeft={<Icon name="list-plus" size="sm" />}>
                        {t('plan_steps')}
                    </Button>
                ) : null}

                {canAdd && weekParent && !isWeekFull ? (
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                            onCreate({
                                mode: 'create',
                                horizon: CourseHorizon.WEEK,
                                period: thisWeek,
                                parent: weekParent,
                            })
                        }
                        iconLeft={<Icon name="plus" size="sm" />}>
                        {t('add_to_week')}
                    </Button>
                ) : null}
                {canAdd && weekParent && isWeekFull ? (
                    <p className="text-sm text-fg-muted">{tCourse('focus_full')}</p>
                ) : null}

                {canAdd && item && stepMonth ? (
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                            onCreate({
                                mode: 'create',
                                horizon: CourseHorizon.MONTH,
                                period: stepMonth,
                                parent: item,
                            })
                        }
                        iconLeft={<Icon name="plus" size="sm" />}>
                        {t('step_for', { month: monthName(stepMonth, locale, 'long') })}
                    </Button>
                ) : null}
            </div>
        </div>
    );
}

/** Saved of target, the jar it draws on and where it lands — plus who sees the link. */
function MoneyBlock({ goal, locale }: { goal: GoalSummary; locale: string }) {
    const t = useTranslations('features.growth.course.goal');
    const tCourse = useTranslations('features.growth.course');
    const { formatMoney } = useHouseholdCurrency();
    const projected = monthYearOf(goal.projectedDate, locale);
    return (
        <section
            className="grid gap-2 rounded-2xl bg-raised/60 p-3 sm:p-4"
            aria-label={t('money_title')}>
            <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm text-fg">
                <span className="font-semibold tabular-nums">
                    {t('money_saved', {
                        saved: formatMoney(goal.saved),
                        target: formatMoney(goal.target),
                    })}
                </span>
                {goal.jarName ? <span className="text-fg-muted">{goal.jarName}</span> : null}
            </p>
            <Meter value={goal.target > 0 ? goal.saved / goal.target : 0} />
            {projected ? (
                <p className="text-sm text-fg-secondary">{t('money_lands', { date: projected })}</p>
            ) : null}
            <p className="text-xs text-fg-muted">{tCourse('money_shared_note')}</p>
        </section>
    );
}
