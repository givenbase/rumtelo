'use client';

import { useState } from 'react';

import {
    COURSE_SLOT_SIZE,
    CourseHorizon,
    CourseRhythmKind,
    HouseholdRole,
    VisibilityChoice,
    coursePeriodOf,
    isPeriodCapped,
    shiftCoursePeriod,
    type CourseItem,
    type CoursePeriodView,
    type HouseholdMember,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Icon, Typography } from '@rumtelo/ui';

import { apiQuery } from '@/app/_lib/api-hooks';
import { leftoverItems } from '@/app/_lib/course-leftovers';
import { rhythmPatternLabel } from '@/app/_lib/course-rhythm';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';

import { periodLabel } from '../_utils/course-route';
import { useCourseActions } from '../_utils/use-course-actions';
import { CourseItemCard } from './course-item-card';
import { CourseItemDialog, type CourseDialogState } from './course-item-dialog';
import { CourseLeftoverBanner } from './course-leftover-banner';
import { CourseSection } from './course-section';

const EMPTY_MEMBERS: HouseholdMember[] = [];

function emptyView(horizon: CourseHorizon, period: string): CoursePeriodView {
    return {
        horizon,
        period,
        items: [],
        ancestors: [],
        children: [],
        hiddenCount: 0,
        visibilityOptions: [],
        defaultVisibility: VisibilityChoice.PRIVATE,
        isVisibilityPickerShown: false,
    };
}

/**
 * One Course layer for one period — the cards, the empty slots (max 3), what is still
 * open from the period before, and the dialog. Today, Week and Goals stack these.
 */
export function CourseLayerSection({
    horizon,
    period,
    accountId,
    title,
    lead,
    isLeftoverShown = true,
    isSlotShown = true,
    emptyState,
    childFilter,
}: {
    horizon: CourseHorizon;
    period: string;
    /** View filter (me / a person); never widens access. */
    accountId: string | undefined;
    title: string;
    lead?: string;
    isLeftoverShown?: boolean;
    isSlotShown?: boolean;
    /** Shown instead of slots when the layer is empty and slots are hidden. */
    emptyState?: React.ReactNode;
    /** Which children show under a card (Goals: only this month and quarter). */
    childFilter?: (child: CourseItem) => boolean;
}) {
    const t = useTranslations('features.growth.course');
    const tRhythm = useTranslations('features.growth.course.rhythm');
    const locale = useLocale();
    const { householdId, userId } = useAuth();
    const live = isLiveData(householdId);

    const membersQuery = useLiveQuery(
        apiQuery.household.members.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_MEMBERS,
        live
    );
    const members = membersQuery.data;
    const me = members.find(member => member.userId === userId) ?? null;
    const owner = members.find(member => member.role === HouseholdRole.OWNER) ?? null;
    const nameOf = (id: string | null) =>
        members.find(member => member.accountId === id)?.displayName ?? null;

    const viewQuery = useLiveQuery(
        apiQuery.growth.course.period.queryOptions({
            input: { householdId: householdId!, horizon, period, accountId },
        }),
        emptyView(horizon, period),
        live
    );
    const view = viewQuery.data;

    // What is still open just before this period: last period when you look at now,
    // and this week when you plan the next one.
    const nowPeriod = coursePeriodOf(horizon, new Date());
    const previousPeriod = shiftCoursePeriod(horizon, period, -1);
    const isLeftoverPeriod =
        period === nowPeriod || (isPeriodCapped(horizon) && previousPeriod === nowPeriod);
    const previousQuery = useLiveQuery(
        apiQuery.growth.course.period.queryOptions({
            input: { householdId: householdId!, horizon, period: previousPeriod, accountId },
        }),
        emptyView(horizon, previousPeriod),
        live && isLeftoverShown && isLeftoverPeriod
    );
    const leftovers =
        isLeftoverShown && isLeftoverPeriod
            ? leftoverItems(previousQuery.data.items, view.items)
            : [];

    // Routines that feed goals and steps — one line per routine on the card.
    const isRhythmFed = !isPeriodCapped(horizon);
    const rhythmQuery = useLiveQuery(
        apiQuery.growth.course.rhythm.list.queryOptions({
            input: { householdId: householdId!, accountId },
        }),
        null,
        live && isRhythmFed
    );
    const rhythmLinesOf = (item: CourseItem) =>
        (rhythmQuery.data?.rhythms ?? [])
            .filter(rhythm => rhythm.parentId === item.id)
            .map(rhythm => ({
                key: rhythm.id,
                kind:
                    rhythm.kind === CourseRhythmKind.HABIT
                        ? ('HABIT' as const)
                        : ('DISCIPLINE' as const),
                label: `${rhythm.name} · ${rhythmPatternLabel(rhythm, locale, tRhythm)}`,
            }));

    const layerName = (layer: CourseHorizon) => t(`layer_${layer.toLowerCase()}` as 'layer_week');
    const [dialog, setDialog] = useState<CourseDialogState | null>(null);
    const { actions, isBusy } = useCourseActions({
        householdId: householdId!,
        layerName,
        onEdit: item => setDialog({ mode: 'edit', item }),
    });

    const ancestorsById = new Map(view.ancestors.map(ancestor => [ancestor.id, ancestor]));
    const whyOf = (item: CourseItem): string | null | { private: true } => {
        if (!item.parentId) return null;
        const parent = ancestorsById.get(item.parentId);
        return parent ? parent.name : { private: true };
    };

    const mine = view.items.filter(item => item.isMine);
    const together = view.items.filter(item => item.accountId === null);
    const othersByMaker = new Map<string, CourseItem[]>();
    for (const item of view.items) {
        if (item.isMine || item.accountId === null) continue;
        othersByMaker.set(item.accountId, [...(othersByMaker.get(item.accountId) ?? []), item]);
    }

    const canCreate = view.visibilityOptions.length > 0;
    const openSlots =
        !canCreate || !isSlotShown
            ? 0
            : isPeriodCapped(horizon)
              ? Math.max(0, COURSE_SLOT_SIZE - mine.length)
              : horizon === CourseHorizon.YEAR
                ? Math.max(0, COURSE_SLOT_SIZE - mine.filter(item => !item.parentId).length)
                : 1;
    const emptySlotLabel = isPeriodCapped(horizon)
        ? t(horizon === CourseHorizon.DAY ? 'empty_slot_day' : 'empty_slot_week')
        : t(horizon === CourseHorizon.YEAR ? 'empty_slot_goal' : 'empty_slot_step');
    const isEmpty = view.items.length === 0;

    const cardProps = (item: CourseItem) => ({
        item,
        why: whyOf(item),
        makerName: nameOf(item.accountId),
        isPickerShown: view.isVisibilityPickerShown,
        children: view.children.filter(
            child => child.parentId === item.id && (childFilter ? childFilter(child) : true)
        ),
        layerName,
        actions,
        isBusy,
        rhythmLines: isRhythmFed ? rhythmLinesOf(item) : [],
    });
    const labelOf = (key: string) =>
        periodLabel(horizon, key, locale, {
            quarter: quarter => t('quarter_short', { quarter }),
            week: week => t('week_short', { week }),
        });

    return (
        <CourseSection title={title} lead={lead}>
            {leftovers.length > 0 ? (
                <CourseLeftoverBanner
                    items={leftovers}
                    periodLabel={labelOf(previousPeriod)}
                    layerName={layerName(horizon)}
                    actions={actions}
                    isBusy={isBusy}
                />
            ) : null}

            {view.isVisibilityPickerShown && (together.length > 0 || othersByMaker.size > 0) ? (
                <Typography as="h3" variant="eyebrow" color="muted">
                    {t('section_mine')}
                </Typography>
            ) : null}
            {mine.map(item => (
                <CourseItemCard key={item.id} {...cardProps(item)} />
            ))}
            {Array.from({ length: openSlots }, (_unused, index) => (
                <button
                    // Empty slots are interchangeable placeholders, not items.
                    key={`slot-${index}`}
                    type="button"
                    onClick={() => setDialog({ mode: 'create', horizon, period })}
                    aria-label={emptySlotLabel}
                    className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-dashed border-line-strong px-4 text-left text-sm text-fg-muted transition-colors hover:border-accent hover:text-accent">
                    <Icon name="plus" aria-hidden />
                    {emptySlotLabel}
                </button>
            ))}
            {canCreate && isSlotShown && openSlots === 0 && isPeriodCapped(horizon) ? (
                <p className="text-sm text-fg-muted">{t('full')}</p>
            ) : null}
            {isEmpty && openSlots === 0 ? emptyState : null}

            {together.length > 0 ? (
                <>
                    <Typography as="h3" variant="eyebrow" color="muted">
                        {t('section_shared')}
                    </Typography>
                    {together.map(item => (
                        <CourseItemCard key={item.id} {...cardProps(item)} />
                    ))}
                </>
            ) : null}

            {[...othersByMaker.entries()].map(([makerId, items]) => (
                <div key={makerId} className="grid gap-3">
                    <Typography as="h3" variant="eyebrow" color="muted">
                        {t('section_of', { name: nameOf(makerId) ?? '' })}
                    </Typography>
                    {items.map(item => (
                        <CourseItemCard key={item.id} {...cardProps(item)} />
                    ))}
                </div>
            ))}

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
        </CourseSection>
    );
}
