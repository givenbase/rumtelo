'use client';

import { useState } from 'react';

import {
    COURSE_FOCUS_RECOMMENDED,
    CourseHorizon,
    HouseholdRole,
    coursePeriodOf,
    courseSlotLimit,
    isPeriodCapped,
    shiftCoursePeriod,
    type CourseItem,
    type HouseholdMember,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Icon, Typography } from '@rumtelo/ui';

import { apiQuery } from '@/app/_lib/api-hooks';
import { leftoverItems } from '@/app/_lib/course-leftovers';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';

import { periodLabel } from '../_utils/course-route';
import { emptyPeriodView } from '../_utils/course-view';
import { focusSlotsOf } from '../_utils/course-goals';
import { useCourseActions } from '../_utils/use-course-actions';
import { CourseItemCard } from './course-item-card';
import { CourseItemDialog, type CourseDialogState } from './course-item-dialog';
import { CourseLeftoverBanner } from './course-leftover-banner';
import { CourseSection } from './course-section';

const EMPTY_MEMBERS: HouseholdMember[] = [];

/**
 * One Course layer for one period — the cards, the empty slots (3 invited, 5 at most),
 * what is still open from the period before, and the dialog. Today and Week stack these.
 * Year, quarter and month live in the Goals list instead.
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
}) {
    const t = useTranslations('features.growth.course');
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
        emptyPeriodView(horizon, period),
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
        emptyPeriodView(horizon, previousPeriod),
        live && isLeftoverShown && isLeftoverPeriod
    );
    const leftovers =
        isLeftoverShown && isLeftoverPeriod
            ? leftoverItems(previousQuery.data.items, view.items)
            : [];

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

    // Week and day: three invited places, a plain "add" up to five. Nothing shames a fourth.
    const canCreate = view.visibilityOptions.length > 0 && isSlotShown;
    const limit = courseSlotLimit(horizon);
    const slots = focusSlotsOf(COURSE_FOCUS_RECOMMENDED, limit ?? Infinity, mine.length);
    const openSlots = canCreate ? slots.emptySlots : 0;
    const canAddMore = canCreate && slots.emptySlots === 0 && slots.canAddMore;
    const emptySlotLabel = t(horizon === CourseHorizon.DAY ? 'empty_slot_day' : 'empty_slot_week');
    const isEmpty = view.items.length === 0;

    const cardProps = (item: CourseItem) => ({
        item,
        why: whyOf(item),
        makerName: nameOf(item.accountId),
        isPickerShown: view.isVisibilityPickerShown,
        children: view.children.filter(child => child.parentId === item.id),
        layerName,
        actions,
        isBusy,
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
            {canAddMore ? (
                <button
                    type="button"
                    onClick={() => setDialog({ mode: 'create', horizon, period })}
                    className="flex min-h-12 items-center gap-3 rounded-2xl border-2 border-dashed border-line-strong px-4 text-left text-sm text-fg-muted transition-colors hover:border-accent hover:text-accent">
                    <Icon name="plus" aria-hidden />
                    {t('add')}
                </button>
            ) : null}
            {canCreate && slots.isBeyondRecommended ? (
                <p className="text-sm text-fg-muted">
                    {t('focus_beyond', { count: mine.length })}
                    {slots.isFull ? ` ${t('focus_full')}` : ''}
                </p>
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
