'use client';

import { useId } from 'react';
import Link from 'next/link';

import {
    CourseHorizon,
    HouseholdPermissionSection,
    roleCanSee,
    type CourseItem,
    type Goal,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Button, Icon, Typography } from '@rumtelo/ui';

import { apiQuery } from '@/app/_lib/api-hooks';
import { CREATE_HREF, goalDetailHref } from '@/app/_lib/create-routes';
import { CAPABILITIES } from '@/app/_lib/plan';
import { isLiveData } from '@/app/_lib/preview';
import { growthPath } from '@/app/_lib/routes';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';
import { courseHref } from '@/product/growth/course/_utils/course-route';
import { emptyPeriodView } from '@/product/growth/course/_utils/course-view';

import {
    pickCourseDirectionGoals,
    pickMoneyDirectionGoals,
    type DirectionGoal,
} from '../_utils/direction-goals';

const EMPTY_ITEMS: CourseItem[] = [];
const EMPTY_GOALS: Goal[] = [];

/**
 * The goals that get the person there: up to three active goals they may see, each a link,
 * with its first step when the data has one. Plus and Max read the Course (year goals and
 * their steps), Basic reads its household goals. No goal yet: one button into the create flow
 * of the plan. Omitted for a role that cannot see Planning and for a plan without goals.
 */
export function DirectionGoals() {
    const t = useTranslations('features.soul.direction.goals');
    const tDirection = useTranslations('features.soul.direction');
    const tLoading = useTranslations('ui.statusPage');
    const headingId = useId();
    const { householdId } = useAuth();
    const { period, planReady } = useHouseholdShell();
    const { role } = useBoardWriteAccess();
    const { hasCapability } = usePlanCapabilities();

    const live = isLiveData(householdId);
    const canSeeGrowth = roleCanSee(role, HouseholdPermissionSection.GROWTH);
    const hasCourse = planReady && hasCapability(CAPABILITIES.growthCourse);
    const hasGoalList = planReady && !hasCourse && hasCapability(CAPABILITIES.growthGoals);

    const year = String(period.year);
    const month = `${year}-${String(period.month).padStart(2, '0')}`;

    // Plus and Max: the same two reads the Course goals view makes, so the cache is shared.
    const yearGoalsQuery = useLiveQuery(
        apiQuery.growth.course.period.queryOptions({
            input: { householdId: householdId!, horizon: CourseHorizon.YEAR, period: year },
        }),
        emptyPeriodView(CourseHorizon.YEAR, year),
        live && canSeeGrowth && hasCourse
    );
    const yearItemsQuery = useLiveQuery(
        apiQuery.growth.course.year.queryOptions({ input: { householdId: householdId!, year } }),
        EMPTY_ITEMS,
        live && canSeeGrowth && hasCourse
    );
    // Basic: the household's goals list.
    const goalListQuery = useLiveQuery(
        apiQuery.money.goals.list.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_GOALS,
        live && canSeeGrowth && hasGoalList
    );

    if (!canSeeGrowth || (planReady && !hasCourse && !hasGoalList)) return null;

    const isPending =
        !planReady ||
        (hasCourse
            ? yearGoalsQuery.isPending || yearItemsQuery.isPending
            : goalListQuery.isPending);
    const isError = hasCourse
        ? yearGoalsQuery.isError || yearItemsQuery.isError
        : goalListQuery.isError;

    const goals: DirectionGoal[] = hasCourse
        ? pickCourseDirectionGoals({
              goals: yearGoalsQuery.data.items,
              unlinked: yearGoalsQuery.data.unlinkedMoneyGoals,
              yearItems: yearItemsQuery.data,
              month,
          })
        : pickMoneyDirectionGoals(goalListQuery.data);

    // Course says who may create (a viewer-like seat gets no options); Basic's goal form gates itself.
    const canMakeGoal = hasCourse ? yearGoalsQuery.data.visibilityOptions.length > 0 : true;
    const allGoalsHref = hasCourse ? courseHref(month) : growthPath('goals');
    // Plus and Max start in the Course wizard, Basic in the goal form. Neither takes a
    // prefilled name today, so the button just opens the flow.
    const makeGoalHref = hasCourse ? growthPath('course', 'plan') : CREATE_HREF.goal;
    const hrefOf = (goal: DirectionGoal) =>
        goal.target.kind === 'money' ? goalDetailHref(goal.target.goalId) : allGoalsHref;

    return (
        <section aria-labelledby={headingId} aria-busy={isPending} className="grid min-w-0 gap-3">
            <Typography as="h2" id={headingId} className="text-pretty">
                {t('title')}
            </Typography>

            {isPending ? (
                <div role="status" className="grid gap-2">
                    <span className="sr-only">{tLoading('loading')}</span>
                    {[0, 1].map(row => (
                        <div
                            key={row}
                            aria-hidden
                            className="h-14 animate-pulse rounded-xl border border-line bg-surface"
                        />
                    ))}
                </div>
            ) : isError ? (
                <p role="alert" className="text-sm text-pretty text-fg-muted">
                    {tDirection('load_error')}
                </p>
            ) : goals.length > 0 ? (
                <>
                    <ul className="grid gap-2">
                        {goals.map(goal => (
                            <li key={goal.key}>
                                <Link
                                    href={hrefOf(goal)}
                                    className="flex min-h-14 min-w-0 items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 hover:border-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                                    <span className="grid min-w-0 gap-0.5">
                                        <span className="text-sm font-medium text-pretty [overflow-wrap:anywhere]">
                                            {goal.name}
                                        </span>
                                        {goal.firstStep ? (
                                            <span className="text-xs text-pretty [overflow-wrap:anywhere] text-fg-muted">
                                                {t('first_step', { step: goal.firstStep })}
                                            </span>
                                        ) : null}
                                    </span>
                                    <Icon
                                        name="chevron-right"
                                        size="sm"
                                        aria-hidden
                                        className="shrink-0 text-fg-muted"
                                    />
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <Link
                        href={allGoalsHref}
                        className="inline-flex min-h-11 w-fit items-center rounded-md px-1 text-sm font-semibold text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                        {t('see_all')}
                    </Link>
                </>
            ) : canMakeGoal ? (
                <div className="grid justify-items-start gap-3 rounded-xl border border-line bg-surface p-4">
                    <p className="text-sm text-pretty text-fg-secondary">{t('empty')}</p>
                    <Button as={Link} href={makeGoalHref} className="h-12 sm:h-10">
                        {t('make_goal')}
                    </Button>
                </div>
            ) : null}
        </section>
    );
}
