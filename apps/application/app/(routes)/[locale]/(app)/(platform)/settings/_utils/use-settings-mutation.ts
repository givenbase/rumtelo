'use client';

import { useApiError } from '@/app/_lib/api-error-messages';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

type SettingsMutationOptions<TData, TVariables> = {
    mutationFn: (variables: TVariables) => Promise<TData>;
    invalidateKeys?: ReadonlyArray<QueryKey | undefined>;
    successMessage?: string | ((data: TData, variables: TVariables) => string);
    onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
    onError?: (error: unknown, variables: TVariables) => void;
    /** When true, skip the default error toast (caller shows field errors instead). */
    silenceErrorToast?: (error: unknown, variables: TVariables) => boolean;
};

/**
 * Settings panels: toast + invalidate + optional success hook in one place.
 */
export function useSettingsMutation<TData, TVariables = void>(
    options: SettingsMutationOptions<TData, TVariables>
) {
    const { showToast } = useAppShell();
    const apiError = useApiError();
    const queryClient = useQueryClient();
    const { mutationFn, invalidateKeys, successMessage, onSuccess, onError, silenceErrorToast } =
        options;

    return useMutation({
        mutationFn,
        onSuccess: async (data, variables) => {
            if (invalidateKeys?.length) {
                await Promise.all(
                    invalidateKeys
                        .filter((key): key is QueryKey => Boolean(key))
                        .map(queryKey => queryClient.invalidateQueries({ queryKey }))
                );
            }
            if (successMessage) {
                const message =
                    typeof successMessage === 'function'
                        ? successMessage(data, variables)
                        : successMessage;
                showToast(message, 'success');
            }
            await onSuccess?.(data, variables);
        },
        onError: (error, variables) => {
            if (!silenceErrorToast?.(error, variables)) {
                showToast(apiError(error), 'error');
            }
            onError?.(error, variables);
        },
    });
}
