'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CourseHorizon, CourseItem, CourseItemStatus } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

/** Item actions on a Course card — every write refreshes the whole plan tree. */
export interface CourseItemActions {
    onStatus: (item: CourseItem, status: CourseItemStatus) => void;
    onCarry: (item: CourseItem) => void;
    onEdit: (item: CourseItem) => void;
    onDelete: (item: CourseItem) => void;
}

export function useCourseActions({
    householdId,
    layerName,
    onEdit,
}: {
    householdId: string;
    layerName: (horizon: CourseHorizon) => string;
    onEdit: (item: CourseItem) => void;
}): { actions: CourseItemActions; isBusy: boolean } {
    const t = useTranslations('features.growth.course');
    const queryClient = useQueryClient();
    const apiError = useApiError();
    const { showToast } = useHouseholdShell();

    const refresh = () => queryClient.invalidateQueries({ queryKey: apiQuery.growth.course.key() });
    const onError = (error: unknown) => showToast(apiError(error), 'error');

    const status = useMutation({
        mutationFn: ({ item, next }: { item: CourseItem; next: CourseItemStatus }) =>
            api.growth.course.updateStatus({ householdId, id: item.id, status: next }),
        onSuccess: refresh,
        onError,
    });
    const carry = useMutation({
        mutationFn: (item: CourseItem) => api.growth.course.carry({ householdId, id: item.id }),
        onSuccess: async (_carried, item) => {
            await refresh();
            showToast(t('carried_toast', { layer: layerName(item.horizon) }), 'success');
        },
        onError,
    });
    const remove = useMutation({
        mutationFn: (item: CourseItem) => api.growth.course.remove({ householdId, id: item.id }),
        onSuccess: async () => {
            await refresh();
            showToast(t('deleted_toast'), 'success');
        },
        onError,
    });

    return {
        actions: {
            onStatus: (item, next) => status.mutate({ item, next }),
            onCarry: item => carry.mutate(item),
            onEdit,
            onDelete: item => remove.mutate(item),
        },
        isBusy: status.isPending || carry.isPending || remove.isPending,
    };
}
