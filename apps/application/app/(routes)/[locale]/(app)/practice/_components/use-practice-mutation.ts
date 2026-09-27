'use client';

import { useApiError } from '@/app/_lib/api-error-messages';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

type PracticeMutationOptions<TData, TVariables> = {
    mutationFn: (variables: TVariables) => Promise<TData>;
    invalidateKeys?: ReadonlyArray<QueryKey | undefined>;
    successMessage?: string | ((data: TData, variables: TVariables) => string);
    onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
    onError?: (error: unknown, variables: TVariables) => void;
};

/**
 * Practice mutation — toast + invalidate wired up like useSettingsMutation.
 */
export function usePracticeMutation<TData, TVariables = void>(
    options: PracticeMutationOptions<TData, TVariables>
) {
    const { showToast } = useHouseholdShell();
    const apiError = useApiError();
    const queryClient = useQueryClient();
    const { mutationFn, invalidateKeys, successMessage, onSuccess, onError } = options;

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
            showToast(apiError(error), 'error');
            onError?.(error, variables);
        },
    });
}
