'use client';

import { useState } from 'react';

import {
    CourseHorizon,
    HouseholdRole,
    VisibilityChoice,
    coursePeriodOf,
    shiftCoursePeriod,
    type CourseRhythm,
    type CourseRhythmWeekView,
    type HouseholdMember,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Icon } from '@rumtelo/ui';

import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';

import { todayIso } from '../_utils/course-view';
import { useRhythmActions } from '../_utils/use-rhythm-actions';
import { CourseSection } from './course-section';
import { RhythmDialog, type RhythmDialogState } from './rhythm-dialog';
import { RhythmRow } from './rhythm-row';
import { RhythmSuggestions } from './rhythm-suggestions';

const EMPTY_MEMBERS: HouseholdMember[] = [];
const EMPTY_SUGGESTIONS: never[] = [];

function emptyView(week: string): CourseRhythmWeekView {
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
 * Your routines for one week: habits and disciplines with their day boxes, the
 * proposals of a new week (this week and the next), and adding, pausing or stopping.
 */
export function CourseRoutinesSection({
    week,
    accountId,
}: {
    week: string;
    accountId: string | undefined;
}) {
    const t = useTranslations('features.growth.course');
    const tRhythm = useTranslations('features.growth.course.rhythm');
    const { householdId, userId } = useAuth();
    const live = isLiveData(householdId);

    const thisWeek = coursePeriodOf(CourseHorizon.WEEK, new Date());
    const isPlanningWeek =
        week === thisWeek || week === shiftCoursePeriod(CourseHorizon.WEEK, thisWeek, 1);

    const membersQuery = useLiveQuery(
        apiQuery.household.members.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_MEMBERS,
        live
    );
    const viewQuery = useLiveQuery(
        apiQuery.growth.course.rhythm.list.queryOptions({
            input: { householdId: householdId!, week, accountId },
        }),
        emptyView(week),
        live
    );
    const suggestionsQuery = useLiveQuery(
        apiQuery.growth.course.rhythm.suggestions.queryOptions({
            input: { householdId: householdId!, week },
        }),
        EMPTY_SUGGESTIONS,
        live && isPlanningWeek
    );
    const { actions, isBusy } = useRhythmActions({ householdId: householdId! });
    const [dialog, setDialog] = useState<RhythmDialogState | null>(null);

    const view = viewQuery.data;
    const members = membersQuery.data;
    const me = members.find(member => member.userId === userId) ?? null;
    const owner = members.find(member => member.role === HouseholdRole.OWNER) ?? null;
    const nameOf = (id: string | null) =>
        members.find(member => member.accountId === id)?.displayName ?? null;
    const mine = view.rhythms.filter(rhythm => rhythm.isMine);
    const others = view.rhythms.filter(rhythm => !rhythm.isMine);
    const canCreate = view.visibilityOptions.length > 0;

    const rowProps = {
        days: view.days,
        today: todayIso(),
        isPickerShown: view.isVisibilityPickerShown,
        actions,
        isBusy,
        onEdit: (rhythm: CourseRhythm) => setDialog({ mode: 'edit', rhythm }),
    };

    return (
        <CourseSection title={t('section_routines')} lead={tRhythm('rule')}>
            {isPlanningWeek ? (
                <RhythmSuggestions
                    suggestions={suggestionsQuery.data}
                    week={week}
                    actions={actions}
                    isBusy={isBusy}
                />
            ) : null}

            {mine.length === 0 && others.length === 0 ? (
                <p className="rounded-2xl border border-line bg-card px-4 py-3 text-sm text-fg-muted">
                    {tRhythm('empty_body')}
                </p>
            ) : null}
            {mine.map(rhythm => (
                <RhythmRow key={rhythm.id} rhythm={rhythm} makerName={null} {...rowProps} />
            ))}
            {canCreate ? (
                <button
                    type="button"
                    onClick={() => setDialog({ mode: 'create' })}
                    className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-dashed border-line-strong px-4 text-left text-sm text-fg-muted transition-colors hover:border-accent hover:text-accent">
                    <Icon name="plus" aria-hidden />
                    {tRhythm('add')}
                </button>
            ) : null}

            {others.map(rhythm => (
                <RhythmRow
                    key={rhythm.id}
                    rhythm={rhythm}
                    makerName={nameOf(rhythm.accountId)}
                    {...rowProps}
                />
            ))}
            {view.hiddenCount > 0 ? (
                <p className="font-mono text-xs tracking-wide text-fg-muted uppercase">
                    {t('hidden_count', { count: view.hiddenCount })}
                </p>
            ) : null}

            {householdId ? (
                <RhythmDialog
                    state={dialog}
                    onClose={() => setDialog(null)}
                    householdId={householdId}
                    visibilityOptions={view.visibilityOptions}
                    defaultVisibility={view.defaultVisibility}
                    isPickerShown={view.isVisibilityPickerShown}
                    ownerName={
                        owner && owner.accountId !== me?.accountId ? owner.displayName : null
                    }
                />
            ) : null}
        </CourseSection>
    );
}
