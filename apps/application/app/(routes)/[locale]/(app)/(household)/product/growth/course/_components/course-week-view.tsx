'use client';

import {
    CourseHorizon,
    CourseLane,
    coursePeriodOf,
    periodRange,
    shiftCoursePeriod,
    type CourseScheduleView,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';

import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';

import { courseHref, periodLabel } from '../_utils/course-route';
import { todayIso } from '../_utils/course-view';
import { CourseEntryList } from './course-entry-list';
import { CourseLayerSection } from './course-layer-section';
import { CoursePeriodNav } from './course-period-nav';
import { CourseRoutinesSection } from './course-routines-section';
import { CourseSection } from './course-section';

/**
 * Course › Week: your 3 for the week, your routines with their day boxes, and the
 * checks of that week. Next week shows what is still open now and the proposals.
 */
export function CourseWeekView({
    week,
    accountId,
    withWho,
}: {
    week: string;
    accountId: string | undefined;
    withWho: (href: string) => string;
}) {
    const t = useTranslations('features.growth.course');
    const locale = useLocale();
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const thisWeek = coursePeriodOf(CourseHorizon.WEEK, new Date());
    const range = periodRange(CourseHorizon.WEEK, week);

    const scheduleQuery = useLiveQuery(
        apiQuery.growth.course.schedule.list.queryOptions({
            input: { householdId: householdId!, from: range.from, to: range.to },
        }),
        {
            from: range.from,
            to: range.to,
            today: todayIso(),
            weekCheckWeek: week,
            entries: [],
        } satisfies CourseScheduleView,
        live
    );
    const checks = scheduleQuery.data.entries.filter(entry => entry.lane === CourseLane.CHECK);

    return (
        <div className="grid gap-8">
            <CoursePeriodNav
                label={periodLabel(CourseHorizon.WEEK, week, locale, {
                    quarter: quarter => t('quarter_short', { quarter }),
                    week: weekNumber => t('week_short', { week: weekNumber }),
                })}
                prevHref={withWho(courseHref(shiftCoursePeriod(CourseHorizon.WEEK, week, -1)))}
                nextHref={withWho(courseHref(shiftCoursePeriod(CourseHorizon.WEEK, week, 1)))}
                prevLabel={t('week_prev')}
                nextLabel={t('week_next')}
                nowHref={week === thisWeek ? null : withWho(courseHref(thisWeek))}
                nowLabel={t('back_to_this_week')}
            />

            <CourseLayerSection
                horizon={CourseHorizon.WEEK}
                period={week}
                accountId={accountId}
                title={t('section_focus_week')}
                lead={t('lead_week')}
            />

            <CourseRoutinesSection week={week} accountId={accountId} />

            {checks.length > 0 ? (
                <CourseSection title={t('section_checks')}>
                    <CourseEntryList entries={checks} day={todayIso()} isDateShown={() => true} />
                </CourseSection>
            ) : null}
        </div>
    );
}
