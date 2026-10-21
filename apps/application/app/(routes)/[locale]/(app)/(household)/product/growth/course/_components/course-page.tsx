'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import {
    CourseHorizon,
    HouseholdRole,
    coursePeriodOf,
    isVisibilityPickerShown,
    type HouseholdMember,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Icon, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { growthPath } from '@/app/_lib/routes';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

import {
    COURSE_TABS,
    courseHref,
    parseCourseView,
    weekOfDay,
    type CourseTab,
} from '../_utils/course-route';
import { CourseGoalsView } from './course-goals-view';
import { CourseTabs } from './course-tabs';
import { CourseTodayView } from './course-today-view';
import { CourseWeekView } from './course-week-view';

const EMPTY_MEMBERS: HouseholdMember[] = [];

/** View filter: `all`, `me`, or another participant's account id. Never widens access. */
type Who = string;

/**
 * Course: three questions, one tab each — Today (what now), Week (what this week),
 * Goals (where it leads). Opens on Today. Focus, routines and checks share the screen;
 * each row says what it is with a badge.
 */
export function CoursePage({ segment }: { segment: string | undefined }) {
    const t = useTranslations('features.growth.course');
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { householdId, userId } = useAuth();
    const { period: boardPeriod } = useHouseholdShell();
    const live = isLiveData(householdId);

    const view = parseCourseView(segment);
    const boardMonth = `${boardPeriod.year}-${String(boardPeriod.month).padStart(2, '0')}`;
    const thisWeek = coursePeriodOf(CourseHorizon.WEEK, new Date());
    const who: Who = searchParams.get('who') ?? 'all';

    const settingsQuery = useLiveQuery(
        apiQuery.household.settings.queryOptions({ input: { householdId: householdId! } }),
        null,
        live
    );
    const membersQuery = useLiveQuery(
        apiQuery.household.members.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_MEMBERS,
        live
    );
    const members = membersQuery.data;
    const me = members.find(member => member.userId === userId) ?? null;
    const participants = members.filter(member => member.role !== HouseholdRole.VIEWER);
    const isWhoShown = isVisibilityPickerShown(participants.length);
    const features = settingsQuery.data?.features;
    const isDaysEnabled = features?.isCourseDaysEnabled ?? false;
    const isQuartersEnabled = features?.isCourseQuartersEnabled ?? false;

    const accountId = who === 'me' ? (me?.accountId ?? undefined) : who === 'all' ? undefined : who;
    const withWho = (href: string) =>
        who === 'all' ? href : `${href}?who=${encodeURIComponent(who)}`;
    const setWho = (next: Who) => {
        const query = next === 'all' ? '' : `?who=${encodeURIComponent(next)}`;
        router.replace(`${pathname}${query}`);
    };

    // Goals follow the period picker in the shell; the URL always names that month.
    const goalsHref =
        view.tab === 'goals' && (view.horizon !== CourseHorizon.MONTH || view.period !== boardMonth)
            ? withWho(courseHref(boardMonth))
            : null;
    useEffect(() => {
        if (goalsHref) router.replace(goalsHref);
    }, [goalsHref, router]);

    const weekOfView =
        view.tab === 'today' ? weekOfDay(view.day) : view.tab === 'week' ? view.week : thisWeek;
    const tabHref: Record<CourseTab, string> = {
        today: withWho(courseHref()),
        week: withWho(courseHref(weekOfView)),
        goals: withWho(courseHref(boardMonth)),
    };

    return (
        <div className="grid gap-6">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div className="grid gap-1">
                    <Typography as="p" variant="eyebrow" color="primary">
                        {t('eyebrow')}
                    </Typography>
                    <Typography as="h1">{t(`title_${view.tab}`)}</Typography>
                    <Typography as="p" size="sm" color="muted">
                        {t(`lead_${view.tab}`)}
                    </Typography>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <CourseTabs
                        ariaLabel={t('tabs_aria')}
                        tabs={COURSE_TABS.map(tab => ({
                            key: tab,
                            href: tabHref[tab],
                            label: t(`tab_${tab}`),
                            isActive: tab === view.tab,
                        }))}
                    />
                    <Link
                        href={growthPath('course', 'week-check')}
                        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-card px-4 text-sm font-medium text-fg hover:bg-raised">
                        <Icon name="calendar-check" size="sm" aria-hidden />
                        {t('week_check_cta')}
                    </Link>
                </div>
            </header>

            {isWhoShown ? (
                <div
                    role="group"
                    aria-label={t('who_aria')}
                    className="flex w-fit gap-1 rounded-full border border-line bg-card p-1">
                    {[
                        { key: 'me', label: t('who_me') },
                        { key: 'all', label: t('who_all') },
                        ...participants
                            .filter(member => member.accountId !== me?.accountId)
                            .map(member => ({ key: member.accountId, label: member.displayName })),
                    ].map(option => (
                        <button
                            key={option.key}
                            type="button"
                            onClick={() => setWho(option.key)}
                            aria-pressed={who === option.key}
                            className={cn(
                                'rounded-full px-3 py-1.5 text-sm font-medium',
                                who === option.key
                                    ? 'bg-fg text-surface'
                                    : 'text-fg-secondary hover:bg-raised'
                            )}>
                            {option.label}
                        </button>
                    ))}
                </div>
            ) : null}

            {view.tab === 'today' ? (
                <CourseTodayView
                    day={view.day}
                    accountId={accountId}
                    isDaysEnabled={isDaysEnabled}
                    withWho={withWho}
                />
            ) : view.tab === 'week' ? (
                <CourseWeekView week={view.week} accountId={accountId} withWho={withWho} />
            ) : goalsHref ? null : (
                <CourseGoalsView
                    month={boardMonth}
                    accountId={accountId}
                    isQuartersEnabled={isQuartersEnabled}
                />
            )}
        </div>
    );
}
