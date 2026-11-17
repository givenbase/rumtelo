'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

/**
 * "Show everything now": this person skips the board ladder (every household).
 * Personal and instant, so a direct mutation, not a form. Shared by the Coming up sheet
 * and Settings › Account so both read and write the same account setting.
 */
export function useShowAllSurfaces({
    successMessage,
}: {
    /** Toast on success; the Coming up sheet says it inline instead. */
    successMessage?: string;
} = {}) {
    const queryClient = useQueryClient();
    const apiError = useApiError();
    const { householdId } = useAuth();
    const { showToast } = useHouseholdShell();
    const live = isLiveData(householdId);

    const query = useQuery({ ...apiQuery.account.settings.queryOptions(), enabled: live });

    const mutation = useMutation({
        mutationFn: (next: boolean) => api.account.updateSettings({ showAllSurfaces: next }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: apiQuery.account.settings.key() });
            if (successMessage) showToast(successMessage, 'success');
        },
        // A toast is never the only signal: the caller also renders `error` inline.
        onError: error => showToast(apiError(error), 'error'),
    });

    const saved = query.data?.showAllSurfaces === true;
    return {
        /** The value to show: the pending choice while saving (optimistic), else the saved one. */
        checked: mutation.isPending ? mutation.variables : saved,
        /** Saved value only. */
        saved,
        loading: live && query.isPending,
        pending: mutation.isPending,
        succeeded: mutation.isSuccess,
        /** Localized message when the last save failed, else null. */
        error: mutation.isError ? apiError(mutation.error) : null,
        set: (next: boolean) => mutation.mutate(next),
        reset: mutation.reset,
    };
}
