/**
 * Query helper for household-scoped screens.
 * When `enabled` is false (no household), returns empty fallback without hitting the network.
 */
import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';

type LiveQuerySuccess<TData> = Omit<
    UseQueryResult<TData>,
    'data' | 'isPending' | 'isLoading' | 'isFetching' | 'isSuccess' | 'status'
> & {
    data: TData;
    isPending: false;
    isLoading: false;
    isFetching: false;
    isSuccess: true;
    status: 'success';
};

type LiveQuerySettled<TData> = Omit<UseQueryResult<TData>, 'data'> & {
    data: TData;
};

/**
 * Always exposes `data` (never undefined) by merging the live query with `emptyFallback`.
 */
export function useLiveQuery<TData>(
    options: UseQueryOptions<TData>,
    emptyFallback: TData,
    enabled = false
): LiveQuerySuccess<TData> | LiveQuerySettled<TData> {
    const query = useQuery({ ...options, enabled });
    if (!enabled) {
        const disabled: LiveQuerySuccess<TData> = {
            ...query,
            data: emptyFallback,
            isPending: false,
            isLoading: false,
            isFetching: false,
            isSuccess: true,
            status: 'success',
        };
        return disabled;
    }
    const settled: LiveQuerySettled<TData> = {
        ...query,
        data: query.data !== undefined ? query.data : emptyFallback,
    };
    return settled;
}
