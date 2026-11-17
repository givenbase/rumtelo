'use client';

import Link from 'next/link';
import { useState, type Ref } from 'react';

import {
    COURSE_FOCUS_MAX,
    COURSE_FOCUS_RECOMMENDED,
    CourseHorizon,
    HouseholdRole,
    VisibilityChoice,
    shiftCoursePeriod,
    type CourseItem,
    type CoursePeriodView,
    type HouseholdMember,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Button, Icon } from '@rumtelo/ui';

import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { growthPath } from '@/app/_lib/routes';
import { useAuth } from '@/components/features/shell/auth-provider';

import { CourseItemCard } from '../../../growth/course/_components/course-item-card';
import {
    CourseItemDialog,
    type CourseDialogState,
} from '../../../growth/course/_components/course-item-dialog';
import { RhythmSuggestions } from '../../../growth/course/_components/rhythm-suggestions';
import { focusSlotsOf } from '../../../growth/course/_utils/course-goals';
import { periodLabel } from '../../../growth/course/_utils/course-route';
import { useCourseActions } from '../../../growth/course/_utils/use-course-actions';
import { useRhythmActions } from '../../../growth/course/_utils/use-rhythm-actions';
import { StageHeading } from './money-stages';

const EMPTY_MEMBERS: HouseholdMember[] = [];
const EMPTY_SUGGESTIONS: never[] = [];

function emptyView(period: string): CoursePeriodView {
    return {
        horizon: CourseHorizon.WEEK,
        period,
        items: [],
        ancestors: [],
        children: [],
        hiddenCount: 0,
        unlinkedMoneyGoals: [],
        visibilityOptions: [],
        defaultVisibility: VisibilityChoice.PRIVATE,
        isVisibilityPickerShown: false,
    };
}

/** "Week 47" style label for a Course week key. */
function useCourseWeekLabel() {
    const tCourse = useTranslations('features.growth.course');
    const locale = useLocale();
    return (period: string) =>
        periodLabel(CourseHorizon.WEEK, period, locale, {
            quarter: quarter => tCourse('quarter_short', { quarter }),
            week: weekNumber => tCourse('week_short', { week: weekNumber }),
        });
}

function useCourseLayerName() {
    const tCourse = useTranslations('features.growth.course');
    return (layer: CourseHorizon) => tCourse(`layer_${layer.toLowerCase()}` as 'layer_week');
}

/** The titles of my three for `courseWeek`: Done summary reads them, nothing writes. */
export function useCourseAheadTitles(courseWeek: string, enabled: boolean): string[] {
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const query = useLiveQuery(
        apiQuery.growth.course.period.queryOptions({
            input: { householdId: householdId!, horizon: CourseHorizon.WEEK, period: courseWeek },
        }),
        emptyView(courseWeek),
        live && enabled
    );
    return query.data.items.filter(item => item.isMine).map(item => item.name);
}

/** Whether the Course part of this week's check was completed (`growth.weekCheck`). */
export function useCourseCheckDone(courseWeek: string, enabled: boolean): boolean | null {
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const query = useLiveQuery(
        apiQuery.growth.weekCheck.current.queryOptions({
            input: { householdId: householdId!, week: courseWeek },
        }),
        null,
        live && enabled
    );
    if (!enabled || query.isPending) return null;
    return Boolean(query.data?.completedAt);
}

function StageError({ onRetry }: { onRetry: () => void }) {
    const tUi = useTranslations();
    const t = useTranslations('features.money.week_check');
    return (
        <div
            role="alert"
            className="grid justify-items-start gap-3 rounded-xl border border-line bg-raised px-4 py-3 text-sm text-fg-muted">
            <p>{t('course_load_failed')}</p>
            <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
                {tUi('ui.button.actions.try_again')}
            </Button>
        </div>
    );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
    return (
        <p className="rounded-2xl border border-line bg-card px-4 py-3 text-sm text-fg-muted">
            {children}
        </p>
    );
}

function useCardProps() {
    const layerName = useCourseLayerName();
    const { householdId } = useAuth();
    const [dialog, setDialog] = useState<CourseDialogState | null>(null);
    const { actions, isBusy } = useCourseActions({
        householdId: householdId!,
        layerName,
        onEdit: item => setDialog({ mode: 'edit', item }),
    });
    const cardProps = (item: CourseItem, view: CoursePeriodView) => {
        const parent = item.parentId ? view.ancestors.find(row => row.id === item.parentId) : null;
        return {
            item,
            why: item.parentId ? (parent ? parent.name : ({ private: true } as const)) : null,
            makerName: null,
            isPickerShown: view.isVisibilityPickerShown,
            children: [],
            layerName,
            actions,
            isBusy,
        };
    };
    return { cardProps, dialog, setDialog, layerName };
}

/** Course stage 1: how last week's three went. */
export function CourseBackStage({
    courseWeek,
    headingRef,
}: {
    courseWeek: string;
    headingRef?: Ref<HTMLHeadingElement>;
}) {
    const t = useTranslations('features.growth.course.week_check');
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const label = useCourseWeekLabel();
    const previousWeek = shiftCoursePeriod(CourseHorizon.WEEK, courseWeek, -1);
    const { cardProps } = useCardProps();

    const previousQuery = useLiveQuery(
        apiQuery.growth.course.period.queryOptions({
            input: { householdId: householdId!, horizon: CourseHorizon.WEEK, period: previousWeek },
        }),
        emptyView(previousWeek),
        live
    );
    const previous = previousQuery.data.items.filter(item => item.isMine);

    return (
        <section className="grid gap-3">
            <StageHeading
                title={t('back_title', { week: label(previousWeek) })}
                lead={t('back_lead')}
                headingRef={headingRef}
            />
            {previousQuery.isError ? (
                <StageError onRetry={() => void previousQuery.refetch()} />
            ) : previous.length === 0 ? (
                <EmptyNote>{t('back_empty')}</EmptyNote>
            ) : (
                previous.map(item => (
                    <CourseItemCard key={item.id} {...cardProps(item, previousQuery.data)} />
                ))
            )}
        </section>
    );
}

/** Course stage 2: keep, shrink or pause each routine. */
export function CourseRoutinesStage({
    courseWeek,
    headingRef,
}: {
    courseWeek: string;
    headingRef?: Ref<HTMLHeadingElement>;
}) {
    const t = useTranslations('features.growth.course.week_check');
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const rhythm = useRhythmActions({ householdId: householdId! });

    const suggestionsQuery = useLiveQuery(
        apiQuery.growth.course.rhythm.suggestions.queryOptions({
            input: { householdId: householdId!, week: courseWeek },
        }),
        EMPTY_SUGGESTIONS,
        live
    );

    return (
        <section className="grid gap-3">
            <StageHeading
                title={t('rhythm_title')}
                lead={t('rhythm_lead')}
                headingRef={headingRef}
            />
            {suggestionsQuery.isError ? (
                <StageError onRetry={() => void suggestionsQuery.refetch()} />
            ) : suggestionsQuery.data.length === 0 ? (
                <EmptyNote>
                    {t('rhythm_empty')}{' '}
                    <Link
                        href={growthPath('course', courseWeek)}
                        className="text-accent hover:underline">
                        {t('rhythm_open')}
                    </Link>
                </EmptyNote>
            ) : (
                <RhythmSuggestions
                    suggestions={suggestionsQuery.data}
                    week={courseWeek}
                    actions={rhythm.actions}
                    isBusy={rhythm.isBusy}
                    isEmbedded
                />
            )}
        </section>
    );
}

/** Course stage 3: set next week's three. */
export function CourseAheadStage({
    courseWeek,
    headingRef,
}: {
    courseWeek: string;
    headingRef?: Ref<HTMLHeadingElement>;
}) {
    const t = useTranslations('features.growth.course.week_check');
    const tCourse = useTranslations('features.growth.course');
    const { householdId, userId } = useAuth();
    const live = isLiveData(householdId);
    const label = useCourseWeekLabel();
    const { cardProps, dialog, setDialog, layerName } = useCardProps();

    const membersQuery = useLiveQuery(
        apiQuery.household.members.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_MEMBERS,
        live
    );
    const aheadQuery = useLiveQuery(
        apiQuery.growth.course.period.queryOptions({
            input: { householdId: householdId!, horizon: CourseHorizon.WEEK, period: courseWeek },
        }),
        emptyView(courseWeek),
        live
    );

    const members = membersQuery.data;
    const me = members.find(member => member.userId === userId) ?? null;
    const owner = members.find(member => member.role === HouseholdRole.OWNER) ?? null;
    const ahead = aheadQuery.data;
    const aheadMine = ahead.items.filter(item => item.isMine);
    const aheadTogether = ahead.items.filter(item => item.accountId === null);
    // Mine + together take places; one empty row at a time up to three, then "add" up to five.
    const aheadFilled = aheadMine.length + aheadTogether.length;
    const slots = focusSlotsOf(COURSE_FOCUS_RECOMMENDED, COURSE_FOCUS_MAX, aheadFilled);
    const canCreate = ahead.visibilityOptions.length > 0;
    const openSlots = canCreate ? Math.min(1, slots.emptySlots) : 0;
    const canAddMore = canCreate && slots.emptySlots === 0 && slots.canAddMore;
    const openCreate = () =>
        setDialog({ mode: 'create', horizon: CourseHorizon.WEEK, period: courseWeek });

    return (
        <section className="grid gap-3">
            <StageHeading
                title={t('ahead_title', { week: label(courseWeek) })}
                lead={t('ahead_lead')}
                headingRef={headingRef}
            />
            {aheadQuery.isError ? (
                <StageError onRetry={() => void aheadQuery.refetch()} />
            ) : (
                <>
                    {aheadMine.map(item => (
                        <CourseItemCard key={item.id} {...cardProps(item, ahead)} />
                    ))}
                    {Array.from({ length: openSlots }, (_unused, index) => (
                        <button
                            // Empty slots are interchangeable placeholders, not items.
                            key={`slot-${index}`}
                            type="button"
                            onClick={openCreate}
                            className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-dashed border-line-strong px-4 text-left text-sm text-fg-muted transition-colors hover:border-accent hover:text-accent">
                            <Icon name="plus" aria-hidden />
                            {tCourse('empty_slot_week')}
                        </button>
                    ))}
                    {canAddMore ? (
                        <button
                            type="button"
                            onClick={openCreate}
                            className="flex min-h-12 items-center gap-3 rounded-2xl border-2 border-dashed border-line-strong px-4 text-left text-sm text-fg-muted transition-colors hover:border-accent hover:text-accent">
                            <Icon name="plus" aria-hidden />
                            {tCourse('add')}
                        </button>
                    ) : null}
                    {canCreate && slots.isBeyondRecommended ? (
                        <p className="text-sm text-fg-muted">
                            {tCourse('focus_beyond', { count: aheadFilled })}
                            {slots.isFull ? ` ${tCourse('focus_full')}` : ''}
                        </p>
                    ) : null}
                </>
            )}

            {householdId ? (
                <CourseItemDialog
                    state={dialog}
                    onClose={() => setDialog(null)}
                    householdId={householdId}
                    visibilityOptions={ahead.visibilityOptions}
                    defaultVisibility={ahead.defaultVisibility}
                    isPickerShown={ahead.isVisibilityPickerShown}
                    ownerName={
                        owner && owner.accountId !== me?.accountId ? owner.displayName : null
                    }
                    layerName={layerName}
                />
            ) : null}
        </section>
    );
}
