'use client';

import Link from 'next/link';

import {
    CourseHorizon,
    CourseLane,
    VisibilityChoice,
    addDays,
    type CourseRhythm,
    type CourseRhythmWeekView,
    type CourseScheduleView,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Button, EmptyState } from '@rumtelo/ui';

import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { settingsHref } from '@/app/_lib/settings-tabs';
import { useAuth } from '@/components/features/shell/auth-provider';

import { courseHref, periodLabel, weekOfDay } from '../_utils/course-route';
import { checksForDay, entriesOn, todayIso, todayRange } from '../_utils/course-view';
import { useRhythmActions } from '../_utils/use-rhythm-actions';
import { CourseEntryList } from './course-entry-list';
import { CourseLayerSection } from './course-layer-section';
import { CoursePeriodNav } from './course-period-nav';
import { CourseSection } from './course-section';
import { RhythmTodayRow } from './rhythm-today-row';

function emptyRhythms(week: string): CourseRhythmWeekView {
    return {
        week,
        days: [],
        rhythms: [],
        hiddenCount: 0,
        visibilityOptions: [],
        defaultVisibility: VisibilityChoice.PRIVATE,
        isVisibilityPickerShown: false,
    };
}

/**
 * Course › Today: the checks of the day, your 3 (of today with the day layer on, else
 * of this week), the routines due today and the advice — each row with its badge.
 */
export function CourseTodayView({
    day,
    accountId,
    isDaysEnabled,
    withWho,
}: {
    day: string;
    accountId: string | undefined;
    isDaysEnabled: boolean;
    withWho: (href: string) => string;
}) {
    const t = useTranslations('features.growth.course');
    const locale = useLocale();
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const today = todayIso();
    const week = weekOfDay(day);
    const range = todayRange(day);

    const scheduleQuery = useLiveQuery(
        apiQuery.growth.course.schedule.list.queryOptions({
            input: { householdId: householdId!, from: range.from, to: range.to },
        }),
        {
            from: range.from,
            to: range.to,
            today,
            weekCheckWeek: week,
            entries: [],
        } satisfies CourseScheduleView,
        live
    );
    const rhythmQuery = useLiveQuery(
        apiQuery.growth.course.rhythm.list.queryOptions({
            input: { householdId: householdId!, week, accountId },
        }),
        emptyRhythms(week),
        live
    );
    const rhythm = useRhythmActions({ householdId: householdId! });

    const entries = scheduleQuery.data.entries;
    const checks = checksForDay(entries, day);
    const rhythmsById = new Map(rhythmQuery.data.rhythms.map(row => [row.id, row]));
    const routines = entriesOn(entries, CourseLane.RHYTHM, day)
        .map(entry => rhythmsById.get(entry.sourceIds[0] ?? ''))
        .filter((row): row is CourseRhythm => row !== undefined);
    const advice = entriesOn(entries, CourseLane.ADVICE, day);

    return (
        <div className="grid gap-8">
            <CoursePeriodNav
                label={periodLabel(CourseHorizon.DAY, day, locale, {
                    quarter: quarter => t('quarter_short', { quarter }),
                    week: weekNumber => t('week_short', { week: weekNumber }),
                })}
                prevHref={withWho(courseHref(addDays(day, -1)))}
                nextHref={withWho(courseHref(addDays(day, 1)))}
                prevLabel={t('day_prev')}
                nextLabel={t('day_next')}
                nowHref={day === today ? null : withWho(courseHref())}
                nowLabel={t('back_to_today')}
            />

            {checks.length > 0 ? (
                <CourseSection title={t('section_checks')}>
                    <CourseEntryList
                        entries={checks}
                        day={day}
                        isDateShown={entry => entry.date !== day}
                    />
                </CourseSection>
            ) : null}

            {isDaysEnabled ? (
                <CourseLayerSection
                    horizon={CourseHorizon.DAY}
                    period={day}
                    accountId={accountId}
                    title={t('section_focus_day')}
                />
            ) : (
                <CourseLayerSection
                    horizon={CourseHorizon.WEEK}
                    period={week}
                    accountId={accountId}
                    title={t('section_focus_week')}
                    isLeftoverShown={false}
                    isSlotShown={false}
                    emptyState={
                        <EmptyState
                            variant="compact"
                            icon="target"
                            title={t('today_empty_focus')}
                            action={
                                <Button as={Link} href={withWho(courseHref(week))} size="sm">
                                    {t('today_choose_3')}
                                </Button>
                            }
                        />
                    }
                />
            )}

            {routines.length > 0 ? (
                <CourseSection title={t('section_routines_today')}>
                    {routines.map(row => (
                        <RhythmTodayRow
                            key={row.id}
                            rhythm={row}
                            today={day}
                            actions={rhythm.actions}
                        />
                    ))}
                </CourseSection>
            ) : null}

            {advice.length > 0 ? (
                <CourseSection title={t('section_advice')}>
                    <CourseEntryList entries={advice} day={day} isDateShown={() => false} />
                </CourseSection>
            ) : null}

            <p className="text-xs text-fg-muted">
                {t('calendar_hint')}{' '}
                <Link href={settingsHref('goals')} className="text-accent hover:underline">
                    {t('calendar_link')}
                </Link>
            </p>
        </div>
    );
}
