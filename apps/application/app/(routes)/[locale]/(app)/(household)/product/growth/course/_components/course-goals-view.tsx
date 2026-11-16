'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
    COURSE_FOCUS_MAX,
    CourseHorizon,
    CourseRhythmKind,
    HouseholdRole,
    coursePeriodOf,
    type CourseItem,
    type GoalSummary,
    type HouseholdMember,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { BrandLoader, Button, EmptyState, Icon } from '@rumtelo/ui';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { rhythmPatternLabel } from '@/app/_lib/course-rhythm';
import { CREATE_HREF } from '@/app/_lib/create-routes';
import { CAPABILITIES } from '@/app/_lib/plan';
import { growthPath } from '@/app/_lib/routes';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';

import {
    buildGoalNodes,
    countItems,
    looseSteps,
    monthName,
    type GoalNode,
} from '../_utils/course-goals';
import { emptyPeriodView, isCurrentStep, quarterOfMonth } from '../_utils/course-view';
import { useCourseActions } from '../_utils/use-course-actions';
import { CourseGoalCard } from './course-goal-card';
import { CourseGoalsSummary } from './course-goals-summary';
import type { CourseRhythmLine } from './course-item-card';
import { CourseItemDialog, type CourseDialogState } from './course-item-dialog';
import { CourseLooseSteps } from './course-loose-steps';

const EMPTY_MEMBERS: HouseholdMember[] = [];
const EMPTY_ITEMS: CourseItem[] = [];

/**
 * Course › Goals: one open list of goals, each a small tree — this month's steps and this
 * week's focus under it. Money goals sit in the same list (linked ones carry a chip,
 * unlinked ones offer "Plan steps"). The month follows the period picker in the shell.
 */
export function CourseGoalsView({
    month,
    accountId,
    isQuartersEnabled,
}: {
    month: string;
    accountId: string | undefined;
    isQuartersEnabled: boolean;
}) {
    const t = useTranslations('features.growth.course');
    const tGoal = useTranslations('features.growth.course.goal');
    const tPlan = useTranslations('features.growth.course.plan');
    const tLoading = useTranslations('ui.statusPage');
    const tRhythm = useTranslations('features.growth.course.rhythm');
    const locale = useLocale();
    const queryClient = useQueryClient();
    const apiError = useApiError();
    const { showToast } = useHouseholdShell();
    const { householdId, userId } = useAuth();
    const { hasCapability } = usePlanCapabilities();
    const live = isLiveData(householdId);

    const year = month.slice(0, 4);
    const quarter = isQuartersEnabled ? quarterOfMonth(month) : null;
    const thisWeek = coursePeriodOf(CourseHorizon.WEEK, new Date());

    const membersQuery = useLiveQuery(
        apiQuery.household.members.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_MEMBERS,
        live
    );
    const members = membersQuery.data;
    const me = members.find(member => member.userId === userId) ?? null;
    const owner = members.find(member => member.role === HouseholdRole.OWNER) ?? null;

    // The goals (and what no goal links to yet) …
    const goalsQuery = useLiveQuery(
        apiQuery.growth.course.period.queryOptions({
            input: {
                householdId: householdId!,
                horizon: CourseHorizon.YEAR,
                period: year,
                accountId,
            },
        }),
        emptyPeriodView(CourseHorizon.YEAR, year),
        live
    );
    // … every step of the year, which fills the timelines and this month's steps …
    const yearQuery = useLiveQuery(
        apiQuery.growth.course.year.queryOptions({ input: { householdId: householdId!, year } }),
        EMPTY_ITEMS,
        live
    );
    // … this week's focus and the routines that feed goals and steps.
    const weekQuery = useLiveQuery(
        apiQuery.growth.course.period.queryOptions({
            input: {
                householdId: householdId!,
                horizon: CourseHorizon.WEEK,
                period: thisWeek,
                accountId,
            },
        }),
        emptyPeriodView(CourseHorizon.WEEK, thisWeek),
        live
    );
    const rhythmQuery = useLiveQuery(
        apiQuery.growth.course.rhythm.list.queryOptions({
            input: { householdId: householdId!, accountId },
        }),
        null,
        live
    );

    const view = goalsQuery.data;
    const yearItems = yearQuery.data;
    const weekItems = weekQuery.data.items;
    const nodes = buildGoalNodes({
        goals: view.items,
        unlinked: view.unlinkedMoneyGoals,
        yearItems,
        month,
        quarter,
    });
    const loose = looseSteps({ yearItems, month, quarter, accountId });
    const currentSteps = yearItems.filter(
        item => isCurrentStep(item, month, quarter) && (!accountId || item.accountId === accountId)
    );
    const goalCount = nodes.length;
    const needingStep = nodes.filter(node => node.item !== null && node.needsStep).length;
    const isWeekFull = weekItems.filter(item => item.isMine).length >= COURSE_FOCUS_MAX;
    const canCreate = view.visibilityOptions.length > 0;

    const rhythmLinesOf = (node: GoalNode): CourseRhythmLine[] => {
        if (!node.item) return [];
        const parentIds = new Set([node.item.id, ...node.steps.map(step => step.id)]);
        return (rhythmQuery.data?.rhythms ?? [])
            .filter(rhythm => rhythm.parentId !== null && parentIds.has(rhythm.parentId))
            .map(rhythm => ({
                key: rhythm.id,
                kind:
                    rhythm.kind === CourseRhythmKind.HABIT
                        ? ('HABIT' as const)
                        : ('DISCIPLINE' as const),
                label: `${rhythm.name} · ${rhythmPatternLabel(rhythm, locale, tRhythm)}`,
            }));
    };

    // UI-only: which cards the viewer opened or closed. The first goal is open until then.
    const [toggled, setToggled] = useState<Record<string, boolean>>({});
    const defaultKey = nodes[0]?.key;
    const isOpen = (key: string) => toggled[key] ?? key === defaultKey;
    const toggle = (key: string) => setToggled(prev => ({ ...prev, [key]: !isOpen(key) }));

    const [dialog, setDialog] = useState<CourseDialogState | null>(null);
    const layerName = (layer: CourseHorizon) => t(`layer_${layer.toLowerCase()}` as 'layer_week');
    const { actions, isBusy } = useCourseActions({
        householdId: householdId!,
        layerName,
        onEdit: item => setDialog({ mode: 'edit', item }),
    });

    // "Plan steps": the Money goal becomes a year goal of the Course, then behaves like any goal.
    const planSteps = useMutation({
        mutationFn: (goal: GoalSummary) =>
            api.growth.course.create({
                householdId: householdId!,
                horizon: CourseHorizon.YEAR,
                period: year,
                name: goal.name,
                goalId: goal.id,
            }),
        onSuccess: async created => {
            await queryClient.invalidateQueries({ queryKey: apiQuery.growth.course.key() });
            setToggled(prev => ({ ...prev, [created.id]: true }));
            showToast(t('saved_toast'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    if (live && (goalsQuery.isPending || yearQuery.isPending)) {
        return <BrandLoader label={tLoading('loading')} />;
    }

    const planHref = growthPath('course', 'plan');
    const openCreateGoal = () =>
        setDialog({ mode: 'create', horizon: CourseHorizon.YEAR, period: year });

    return (
        <div className="grid gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-fg-muted">{tGoal('count', { count: goalCount })}</p>
                <div className="flex flex-wrap items-center gap-2">
                    {hasCapability(CAPABILITIES.growthGoals) ? (
                        <Button as={Link} href={CREATE_HREF.goal} size="sm" variant="ghost">
                            {tGoal('add_goal_amount')}
                        </Button>
                    ) : null}
                    {canCreate ? (
                        <Button
                            as={Link}
                            href={planHref}
                            size="sm"
                            variant="secondary"
                            iconLeft={<Icon name="sparkles" size="sm" aria-hidden />}>
                            {tPlan('cta')}
                        </Button>
                    ) : null}
                    {canCreate ? (
                        <Button
                            size="sm"
                            onClick={openCreateGoal}
                            aria-label={tGoal('add_goal_aria')}
                            iconLeft={<Icon name="plus" size="sm" />}>
                            {tGoal('add_goal')}
                        </Button>
                    ) : null}
                </div>
            </div>

            <CourseGoalsSummary
                steps={countItems(currentSteps)}
                focus={countItems(weekItems)}
                needingStep={needingStep}
            />

            {nodes.length > 0 ? (
                <ul className="grid gap-3" aria-label={tGoal('list_aria', { year })}>
                    {nodes.map(node => (
                        <li key={node.key}>
                            <CourseGoalCard
                                node={node}
                                month={month}
                                isOpen={isOpen(node.key)}
                                onToggle={() => toggle(node.key)}
                                actions={actions}
                                isBusy={isBusy}
                                weekItems={weekItems}
                                thisWeek={thisWeek}
                                isWeekFull={isWeekFull}
                                rhythmLines={rhythmLinesOf(node)}
                                canCreate={canCreate}
                                onCreate={setDialog}
                                onPlanSteps={goal => planSteps.mutate(goal)}
                                isPlanning={planSteps.isPending}
                            />
                        </li>
                    ))}
                </ul>
            ) : (
                <EmptyState
                    variant="compact"
                    icon="target"
                    title={tGoal('empty_title')}
                    body={tGoal('empty_body')}
                    action={
                        canCreate ? (
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <Button as={Link} href={planHref} size="sm">
                                    {tPlan('cta')}
                                </Button>
                                <Button size="sm" variant="secondary" onClick={openCreateGoal}>
                                    {tGoal('add_goal')}
                                </Button>
                            </div>
                        ) : undefined
                    }
                />
            )}

            {loose.length > 0 ? (
                <CourseLooseSteps
                    title={tGoal('loose_title', { month: monthName(month, locale, 'long') })}
                    steps={loose}
                    actions={actions}
                    isBusy={isBusy}
                />
            ) : null}

            {view.hiddenCount > 0 ? (
                <p className="font-mono text-xs tracking-wide text-fg-muted uppercase">
                    {t('hidden_count', { count: view.hiddenCount })}
                </p>
            ) : null}

            {householdId ? (
                <CourseItemDialog
                    state={dialog}
                    onClose={() => setDialog(null)}
                    householdId={householdId}
                    visibilityOptions={view.visibilityOptions}
                    defaultVisibility={view.defaultVisibility}
                    isPickerShown={view.isVisibilityPickerShown}
                    ownerName={
                        owner && owner.accountId !== me?.accountId ? owner.displayName : null
                    }
                    layerName={layerName}
                />
            ) : null}
        </div>
    );
}
